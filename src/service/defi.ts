import Web3 from "web3"
import { Ca } from "../models/contract"
import { updateHolderData } from "../web3/class/contracts/getHolders"
import { ChainTypes } from "../web3/types"
import { chainRpc } from "../utils/chainRpc"
import { updateDefiData } from "../web3/class/contracts/getDeFiData"
import { Trades } from "../models/trades"

export async function UpdateDefiService() {
    const tokens = await Ca.find({
        pair: { $ne: null },
        lastUpdate: { $gt: Date.now() - 1000 * 60 * 10  }
    })

    if (!tokens) return

    for (const ca of tokens) {
        const config = {
            address: ca.address,
            chain: ca.chain as ChainTypes,
            web3: new Web3(chainRpc(ca.chain as ChainTypes).rpcHTTP),
            blockNumber: ca.creationBlock!
        }

        const lastTrade = (await Trades.findOne({
            address: ca.pair!
        }))?.history.sort((a, b) => b.blockNumber - a.blockNumber)[0]

        if (lastTrade) {
            config.blockNumber = lastTrade.blockNumber + 1
        }

        // console.log(`[!!] CICLE ${ca.pair} on ${ca.chain}`)

        await Promise.all([
            updateHolderData({
                ...config,
                deployBlock: ca.pairBlock!
            }),
            updateDefiData({
                ...config,
                address: ca.pair!
            })
        ])

        // process.stdout.write(`[!!] END CICLE ${ca.pair} on ${ca.chain}\n\n\n`)
    }
}