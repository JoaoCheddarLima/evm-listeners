import Web3 from 'web3'
import { Contract, formatEther, WebSocketProvider } from 'ethers'
import { BigNumber } from 'bignumber.js'
import pairAbi from './abis/pair.json'
import baseAbi from './abis/example.json'
import { ChainEvents, ChainTypes } from '../types/chain';
import { Ca } from '../../models/contract';
import { EventEmitter } from 'events';
import { Deployer } from '../../models/deployers'
import { getRugInfo } from './utils/routerDecoder'

export default class GenericEVMTokenListener extends EventEmitter {
    private rpcHTTP: string;
    private rpcWSS: string;
    private UniswapFactoryAddress: string;
    private UniswapRouterAddress: string;
    private provider: WebSocketProvider;
    private web3: Web3;
    private FactoryContract: Contract;
    private nativeTokenPairAddresses: string[];
    private chain: ChainTypes;

    public static LOAD_MINUMUM_NECESSARY_FACTORY_ABI_CONTRACT_INSTANCE(uniswapFactoryAddress: string, provider: WebSocketProvider) {
        return new Contract(
            uniswapFactoryAddress,
            [
                "event PairCreated(address indexed token0, address indexed token1, address pair, uint)",
            ],
            provider
        );
    }

    constructor({
        rpcHTTP,
        rpcWSS,
        UniswapFactoryAddress,
        UniswapRouterAddress,
        nativeTokenPairAddresses,
        chain
    }: {
        rpcHTTP: string;
        rpcWSS: string;
        UniswapFactoryAddress: string;
        UniswapRouterAddress: string;
        nativeTokenPairAddresses: string[];
        chain: ChainTypes;
    }) {
        super();
        this.chain = chain;
        this.rpcHTTP = rpcHTTP;
        this.nativeTokenPairAddresses = nativeTokenPairAddresses;
        this.rpcWSS = rpcWSS;
        this.UniswapFactoryAddress = UniswapFactoryAddress;
        this.UniswapRouterAddress = UniswapRouterAddress;
        this.provider = new WebSocketProvider(this.rpcWSS);
        this.web3 = new Web3(this.rpcHTTP);

        this.provider.getBlockNumber()
            .then(async (blockNumber) => {
                console.log(`[🚀] Connected to ${this.chain} at block ${blockNumber}`)
            })

        this.FactoryContract = GenericEVMTokenListener.LOAD_MINUMUM_NECESSARY_FACTORY_ABI_CONTRACT_INSTANCE(UniswapFactoryAddress, this.provider);
        this.listenForNewContracts();
        this.listenForNewPairs();
    }

    public listenForNewPairs() {
        console.log("[👋] Listening for new pairs on", this.chain)
        this.FactoryContract.on("PairCreated", async (token0, token1, pair, id) => {
            const block = await this.web3.eth.getBlock("latest")
            let timestamp = Date.now();

            let retries = 0;
            let maxRetries = 5;

            const registerPair = async () => {
                try {
                    let tokenIn, tokenOut;

                    let wethAmount, tokenAmount;

                    const pool = new this.web3.eth.Contract(pairAbi, pair)

                    const { _reserve0, _reserve1 }: {
                        _reserve0: number;
                        _reserve1: number;
                    } = await pool.methods.getReserves().call()

                    if (this.nativeTokenPairAddresses.includes(token0)) {
                        tokenIn = token0.toLowerCase();
                        tokenOut = token1.toLowerCase();

                        wethAmount = formatEther(_reserve0)
                        tokenAmount = _reserve1
                    };

                    if (this.nativeTokenPairAddresses.includes(token1)) {
                        tokenIn = token1.toLowerCase();
                        tokenOut = token0.toLowerCase();

                        wethAmount = formatEther(_reserve1)
                        tokenAmount = _reserve0
                    };

                    const token = await Ca.findOne({ address: tokenOut })

                    if (!token || !tokenAmount || !token.supply) return console.log(`[!] Token not found for ${tokenOut} - ${this.chain}`);

                    token.pair = pair.toLowerCase()
                    token.baseLp = tokenIn
                    token.baseToken = tokenOut
                    token.pairCreatedTimestamp = timestamp
                    token.initialLiquidity = wethAmount
                    token.pairBlock = Number(block.number)
                    token.initialSupply = String(tokenAmount).split("n")[0]

                    const ca = new this.web3.eth.Contract(baseAbi, token.address)

                    const supply = new BigNumber(await ca.methods?.totalSupply()?.call())

                    if (supply > new BigNumber(token.supply)) {
                        token.mintedTokens = true
                        token.tokensMinted = supply.minus(token.supply).toString()
                        token.supply = supply.toString()
                    }

                    const heldCalc = Number(new BigNumber(tokenAmount).div(token.supply).times(100).toString())

                    if (heldCalc < 100) {
                        token.holdingTokens = true
                        token.percentageHeld = Number((100 - heldCalc).toFixed(2))
                    }

                    const updated = await token.save();

                    delete updated.__v
                    // @ts-ignore
                    delete updated._id

                    this.emit(ChainEvents.NEW_PAIR, updated.toJSON());
                } catch (err) {
                    if (retries < maxRetries) {
                        retries++;
                        setTimeout(registerPair, 1000)
                    } else {
                        console.error("Max retries reached for", {
                            token0,
                            token1,
                            pair,
                            id,
                            chain: this.chain
                        })
                    }
                }
            }

            registerPair();
        })
    }

    public listenForNewContracts() {
        console.log("[👋] Listening for new contracts on", this.chain)

        this.provider.on("block", async blockNumber => {
            const now = Date.now()
            const blockData = await this.web3.eth.getBlock(blockNumber, true);

            if (!blockData || !blockData.transactions) return;

            // @ts-ignore
            const mintContractTransactions = blockData.transactions.filter(e => e.to == null)
            // @ts-ignore
            const routerContractRemovedLP = blockData?.transactions.filter(e => e?.to?.toLowerCase() == this.UniswapRouterAddress.toLowerCase() || e.input == "0x7cabdfa0")
            // @ts-ignore
            mintContractTransactions?.forEach(async (
                {
                    hash
                }: {
                    hash: string;
                }
            ) => {
                this.web3.eth.getTransactionReceipt(hash)
                    .then(async (
                        {
                            logs,
                            from
                        }: {
                            logs: any[];
                            from: string;
                        }
                    ) => {
                        try {
                            if (logs?.length <= 0) return;

                            const contract = logs[0].address.toLowerCase()
                            const deployer = from

                            const ca = new this.web3.eth.Contract(baseAbi, contract)

                            const [name, symbol, supply, decimals] = (await Promise.allSettled([
                                ca.methods?.name()?.call(),
                                ca.methods?.symbol()?.call(),
                                ca.methods?.totalSupply()?.call(),
                                ca.methods?.decimals()?.call(),
                            ])).map(e => e.status == "fulfilled" ? e.value : null)

                            const isTokenCa = name ? symbol ? supply ? true : false : false : false

                            const newCa = await Ca.create({
                                address: contract,
                                deploySupply: supply,
                                deployer,
                                deployHash: hash,
                                deployTimestamp: now,
                                creationBlock: blockNumber,
                                name,
                                symbol,
                                supply,
                                decimals: Number(String(decimals).split("n")[0]),
                                isTokenCa,
                                chain: this.chain
                            })

                            const deployerModel = await Deployer.findOne({ address: from }) || new Deployer({ address: from })

                            deployerModel.deploys += 1

                            await deployerModel.save()

                            delete newCa.__v
                            // @ts-ignore
                            delete newCa._id
                            
                            this.emit(ChainEvents.NEW_CONTRACT, newCa.toJSON())
                        } catch (err) {
                            console.error(err)
                            console.log("falhou aqui")
                        }
                    })
            })
            // @ts-ignore
            routerContractRemovedLP?.forEach(async ({ input, hash, from, to }) => {
                const rug = getRugInfo({
                    inputData: input,
                    from,
                    to,
                    hash,
                    weth: this.nativeTokenPairAddresses[0]
                })

                if (!rug) return;

                const contract = await Ca.findOne({ address: rug.token })

                if (!contract) return

                contract.isRug = true
                contract.rugHash = rug.rugHash
                contract.rugTimestamp = now
                contract.removedEth = rug.removedEth

                const deployer = await Deployer.findOne({ address: rug.rugger }) || await Deployer.findOne({ address: contract.deployer })

                if (!deployer) return;

                deployer.rugCount += 1

                const updatedContract = await contract.save()
                await deployer.save()

                delete updatedContract.__v
                // @ts-ignore
                delete updatedContract._id

                this.emit(ChainEvents.NEW_SCAM, updatedContract.toJSON())
            })
        })
    }
}