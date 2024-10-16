import Web3, { LogsOutput, Contract as Web3Contract } from "web3";
import ExampleABI from '../abis/pair.json'
import { Ca } from "../../../models/contract";
import { ChainTypes } from "../../types";
import { chainRpc } from "../../../utils/chainRpc";
import { formatUnits } from "ethers";
import { Trades } from "../../../models/trades";
import BigNumber from "bignumber.js";

export async function updateDefiData({
    address,
    web3,
    blockNumber,
    chain
}: {
    address: string;
    web3: Web3;
    blockNumber: number;
    chain: ChainTypes;
}): Promise<void> {
    try {
        const nativeTokens = chainRpc(chain).NativeTokenPairs || [];

        // console.log(`[!!] Fetchin data for ${address} on ${chain}`)

        const token0: string = await new web3.eth.Contract(ExampleABI as any, address).methods.token0().call()

        // console.log(`[!!] Token0: ${token0}`)

        const trades: {
            type: 'buy' | 'sell',
            ethAmount: number,
            txHash: string,
            blockNumber: number,
            tokenAmount: number
        }[] = []

        async function getSwaps(contract: Web3Contract<any>) {

            const events = await contract.getPastEvents("Swap", {
                fromBlock: blockNumber,
                toBlock: "latest",
            });

            let volume: number = 0
            let buys: number = 0
            let sells: number = 0

            const isFirst = nativeTokens.includes(token0)

            for (const event of events) {
                // @ts-ignore
                const zeroIn = Number(formatUnits(event?.returnValues.amount0In.toString()))
                // @ts-ignore
                const zeroOut = Number(formatUnits(event?.returnValues.amount0Out.toString()))
                // @ts-ignore
                const oneIn = Number(formatUnits(event?.returnValues.amount1In.toString()))
                // @ts-ignore
                const oneOut = Number(formatUnits(event?.returnValues.amount1Out.toString()))

                // @ts-ignore
                if (isFirst) {
                    if (zeroIn > 0) {
                        buys += 1
                        volume += zeroIn

                        const data = {
                            type: 'buy',
                            ethAmount: zeroIn,
                            tokenAmount: oneOut,
                            // @ts-ignore
                            txHash: event.transactionHash,
                            // @ts-ignore
                            blockNumber: Number(event.blockNumber)
                        }
                        // @ts-ignore
                        trades.push(data)

                    } else {
                        sells += 1
                        volume += zeroOut

                        const data = {
                            type: 'sell',
                            ethAmount: zeroOut,
                            tokenAmount: oneIn,
                            // @ts-ignore
                            txHash: event.transactionHash,
                            // @ts-ignore
                            blockNumber: Number(event.blockNumber)
                        }

                        // @ts-ignore
                        trades.push(data)
                    }
                } else {
                    if (oneIn > 0) {
                        const data = {
                            type: 'buy',
                            ethAmount: oneIn,
                            tokenAmount: zeroOut,
                            // @ts-ignore
                            txHash: event.transactionHash,
                            // @ts-ignore
                            blockNumber: Number(event.blockNumber)
                        }

                        buys += 1
                        volume += oneIn

                        // @ts-ignore
                        trades.push(data)
                    } else {
                        sells += 1
                        volume += oneOut

                        const data = {
                            type: 'sell',
                            ethAmount: oneOut,
                            tokenAmount: zeroIn,
                            // @ts-ignore
                            txHash: event.transactionHash,
                            // @ts-ignore
                            blockNumber: Number(event.blockNumber)
                        }

                        // @ts-ignore
                        trades.push(data)
                    }
                }
            }

            return {
                volume,
                buys,
                sells,
                txCount: events.length
            }
        }

        const contract = new web3.eth.Contract(ExampleABI as any, address);

        // console.log(`[!!] Fetchin data for ${address} on ${chain}`)

        const {
            volume,
            buys,
            sells,
            txCount
        } = await getSwaps(contract);

        // console.log(`[!!] Got data for ${address} on ${chain}`)

        await Ca.updateOne(
            {
                pair: address
            },
            {
                $inc: {
                    volume: volume,
                    buys: buys,
                    sells: sells,
                    txCount: txCount
                }
            }
        )

        // console.log(`[!!] Updated data for ${address} on ${chain}`)

        await Trades.findOneAndUpdate(
            {
                address
            },
            {
                $push: {
                    history: {
                        $each: trades
                    }
                }
            },
            {
                upsert: true
            }
        )

        if (trades.length > 0) {
            await Ca.updateOne(
                {
                    pair: address
                },
                {
                    $set: {
                        lastUpdate: Date.now()
                    }
                }
            )
        }

        const token = await Ca.findOne({
            pair: address
        })

        const tradeData = (await Trades.findOne({
            address
        }))?.history || []

        if (!token) return;
        function calculateTokenPrice(liquidityA: any, liquidityB: any, tokenAmount: any) {
            const newLiquidityA = new BigNumber(liquidityA).minus(tokenAmount);
            const newLiquidityB = new BigNumber(liquidityA).times(liquidityB).div(newLiquidityA);

            const pricePerTokenA = newLiquidityB.div(newLiquidityA)

            return pricePerTokenA.toString();
        }

        function calculateMarketCap(tokenPrice: any, totalSupply: any) {
            return new BigNumber(tokenPrice).times(totalSupply).toString()
        }

        // @ts-ignore
        const parsedSupply = token.initialSupply / 10 ** token.decimals!

        const tokenOnPool = tradeData.reduce((acc, trade) => {
            if (trade.type === 'buy') {
                return acc.minus(trade.tokenAmount!)
            }

            return acc.plus(trade.tokenAmount)
        }, new BigNumber(parsedSupply)).toString()

        const ethOnPool = tradeData.reduce((acc, trade) => {
            if (trade.type === 'buy') {
                return acc.plus(trade.ethAmount)
            }

            return acc.minus(trade.ethAmount)
        }, new BigNumber(0)).plus(token.initialLiquidity!).toString()

        const price = calculateTokenPrice(Number(tokenOnPool), Number(ethOnPool), 0)
        const marketcap = calculateMarketCap(price, new BigNumber(parsedSupply).minus(tokenOnPool).toString())
        const initialPrice = calculateTokenPrice(parsedSupply, token.initialLiquidity, 0)

        await Ca.updateOne(
            {
                pair: address
            },
            {
                $set: {
                    marketcap,
                    price,
                    initialPrice,
                    liquidity: ethOnPool
                }
            }
        )
    } catch (err) {
        // @ts-ignore
        console.log("Update defi data failed ", address, chain, err.message)
    }
}