import axios from 'axios'
import { ChainTypes } from '../web3/types'

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
}

export class Etherscan {
    private tokens: string[]
    private address: string
    private chain: ChainTypes
    private useCounter: number
    private baseApiUrl: string = 'https://api.basescan.org/api'
    private ethApiUrl: string = 'https://api.etherscan.io/api'

    constructor({
        tokens,
        address,
        chain
    }: {
        tokens: string,
        address: string,
        chain: ChainTypes
    }) {
        this.chain = chain;
        this.tokens = tokens.split(',');
        this.address = address;
        this.useCounter = 0;
    }

    private getToken() {
        return this.tokens[this.useCounter]
    }

    private getChainUrl() {
        switch (this.chain) {
            case ChainTypes.BASE:
                return this.baseApiUrl
            case ChainTypes.ETH:
                return this.ethApiUrl
            default:
                return this.ethApiUrl
        }
    }

    private async count() {
        this.useCounter += 1;
        if (this.useCounter >= this.tokens.length) {
            this.useCounter = 0;
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }

    async getAbi() {
        try {
            const etherscanApiUrl = `${this.getChainUrl()}?module=contract&action=getabi&address=${this.address}&apikey=${this.getToken()}`
            await this.count()

            const response = await axios.get(etherscanApiUrl, { headers });

            if (response.data.status === "1" && response.data.result !== "") {
                const abi = JSON.parse(response.data.result);

                return abi
            }

            return null
        } catch (err) {
            return null
        }
    }


    async getSourceCode() {
        try {
            const endpoint = `${this.getChainUrl()}?module=contract&action=getsourcecode&address=${this.address}&apikey=${this.getToken()}`;
            await this.count()

            const sourceCode = await axios.get(endpoint, { headers });

            if (sourceCode.data.status === '1') return (sourceCode.data.result[0].SourceCode)

            return null
        } catch (err) {
            return null
        }
    }
}