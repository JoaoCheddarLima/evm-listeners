import Web3 from 'web3'
import { Contract, formatEther, WebSocketProvider } from 'ethers'
import { BigNumber } from 'bignumber.js'
import pairAbi from './abis/pair.json'
import baseAbi from './abis/example.json'
import { ChainEvents, ChainTypes } from '../types/chain';
import { Ca } from '../../models/contract';
import { PairContractData } from '../types/contractData';
import { EventEmitter } from 'events';
import { Deployer } from '../../models/deployers'

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

                if (this.chain === ChainTypes.BASE) {
                    const pool = new this.web3.eth.Contract(pairAbi, "0x2BC470ce1b76CbBE8b5aB77Da88E4Bf6Ac7169E7")

                    const { _reserve0, _reserve1 }: {
                        _reserve0: number;
                        _reserve1: number;
                    } = await pool.methods.getReserves().call()


                }
            })

        this.FactoryContract = GenericEVMTokenListener.LOAD_MINUMUM_NECESSARY_FACTORY_ABI_CONTRACT_INSTANCE(UniswapFactoryAddress, this.provider);
        this.listenForNewContracts();
        this.listenForNewPairs();
    }

    public listenForNewPairs() {
        console.log("[👋] Listening for new pairs on", this.chain)
        this.FactoryContract.on("PairCreated", async (token0, token1, pair, id) => {
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
                        tokenIn = token0;
                        tokenOut = token1;

                        wethAmount = formatEther(_reserve0)
                        tokenAmount = _reserve1
                    };

                    if (this.nativeTokenPairAddresses.includes(token1)) {
                        tokenIn = token1;
                        tokenOut = token0;

                        wethAmount = formatEther(_reserve1)
                        tokenAmount = _reserve0
                    };

                    const token = await Ca.findOne({ address: tokenOut })

                    if (!token || !tokenAmount || !token.supply) return;

                    token.pair = pair
                    token.baseLp = tokenIn
                    token.baseToken = tokenOut
                    token.pairCreatedTimestamp = timestamp
                    token.initialLiquidity = wethAmount
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

                    const data = updated.toJSON() as PairContractData;

                    this.emit(ChainEvents.NEW_PAIR, data);
                } catch (err) {
                    console.error("Error fetching pair data for", {
                        token0,
                        token1,
                        pair,
                        id,
                        chain: this.chain
                    })

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

            const mintContractTransactions = blockData.transactions.filter(e => {
                // @ts-ignore
                return e.to == null
            })

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
                            if (!logs || !logs[0]) return;

                            const contract = logs[0].address
                            const deployer = from

                            const ca = new this.web3.eth.Contract(baseAbi, contract)

                            const [name, symbol, supply, decimals] = (await Promise.allSettled([
                                ca.methods?.name()?.call(),
                                ca.methods?.symbol()?.call(),
                                ca.methods?.totalSupply()?.call(),
                                ca.methods?.decimals()?.call(),
                            ])).map(e => e.status == "fulfilled" ? e.value : null)

                            const isTokenCa = name ? symbol ? supply ? true : false : false : false

                            await Ca.create({
                                address: contract,
                                deploySupply: supply,
                                deployer,
                                deployHash: hash,
                                deployTimestamp: now,
                                name,
                                symbol,
                                supply,
                                decimals: Number(String(decimals).split("n")[0]),
                                isTokenCa,
                                chain: this.chain
                            })

                            const deployerModel = await Deployer.findOne({ address: from }) || new Deployer({ address: from })

                            deployerModel.deploys += 1

                            const updatedModel = await deployerModel.save()

                            delete updatedModel.__v

                            this.emit(ChainEvents.NEW_CONTRACT, updatedModel.toJSON())
                        } catch (err) {
                            console.error(err)
                        }
                    })
            })
        })
    }
}