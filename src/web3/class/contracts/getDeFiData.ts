import Web3, { LogsOutput, Contract as Web3Contract } from "web3";
import ExampleABI from '../abis/pair.json'
import { Ca } from "../../../models/contract";
import { ChainTypes } from "../../types";
import { chainRpc } from "../../../utils/chainRpc";
import { formatUnits } from "ethers";
import { Trades } from "../../../models/trades";

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

        const token0: string = await new web3.eth.Contract(ExampleABI as any, address).methods.token0().call()

        const trades: {
            type: 'buy' | 'sell',
            ethAmount: number,
            txHash: string,
            blockNumber: number
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

            events.forEach((event, i) => {
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

                        trades.push({
                            type: 'buy',
                            ethAmount: zeroIn,
                            // @ts-ignore
                            txHash: event.transactionHash,
                            // @ts-ignore
                            blockNumber: Number(event.blockNumber)
                        })

                    } else {
                        sells += 1
                        volume += zeroOut
                    }
                } else {
                    if (oneIn > 0) {
                        buys += 1
                        volume += oneIn
                    } else {
                        sells += 1
                        volume += oneOut
                    }
                }
            });

            return {
                volume,
                buys,
                sells,
                txCount: events.length
            }
        }

        const contract = new web3.eth.Contract(ExampleABI as any, address);

        const {
            volume,
            buys,
            sells,
            txCount
        } = await getSwaps(contract);

        await Ca.updateOne(
            {
                pair: address
            },
            {
                volume,
                buys,
                sells,
                txCount
            }
        )

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
    } catch (err) {
        console.error(err)
    }
}