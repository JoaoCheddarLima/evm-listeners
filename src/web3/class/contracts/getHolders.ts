import Web3, { Contract as Web3Contract } from "web3";
import ExampleABI from '../abis/example.json'
import { Ca } from "../../../models/contract";
import { ChainTypes } from "../../types";

interface Holder {
    holder?: string;
    amount?: string;
    percentual?: string;
    error?: boolean;
    sniper?: boolean;
}

export async function updateHolderData({
    address,
    web3,
    blockNumber,
    deployBlock,
    chain
}: {
    address: string;
    web3: Web3;
    blockNumber: number;
    chain: ChainTypes;
    deployBlock: number;
}): Promise<void> {
    try {
        // console.log(`[!!] Fetchin holder data for ${address} on ${chain}`)
        async function getAllHolders(contract: Web3Contract<any>) {
            const events = await contract.getPastEvents("Transfer", {
                fromBlock: blockNumber,
                toBlock: "latest",
            });

            const holders = {};
            const snipers: string[] = []

            // console.log(`[!!] Found ${events.length} transfers for ${address} on ${chain}`)

            events.forEach((event, i) => {
                // @ts-ignore
                if (Number(event.blockNumber) + 2 > deployBlock) {
                    // @ts-ignore
                    snipers.push(event.returnValues.to)
                }
                // @ts-ignore
                holders[event.returnValues.from] = true;
                // @ts-ignore
                holders[event.returnValues.to] = true;
                // @ts-ignore
                if (event.blockNumber < deployBlock + 10) {

                }
            });

            return {
                holders: Object.keys(holders),
                transferCount: events.length,
                snipers
            }
        }

        const contract = new web3.eth.Contract(ExampleABI as any, address);
        
        const totalSupply = Number(await contract.methods.totalSupply().call())

        // console.log(`[!!] Total supply for ${address} on ${chain} is ${totalSupply}`)

        const {
            holders: historicalHolders,
            transferCount,
            snipers
        } = await getAllHolders(contract);

        // console.log(historicalHolders, transferCount, snipers)

        const concurrent: Promise<Holder>[] = []

        function calculateHolderAmounts(holder: string): Promise<Holder> {
            return new Promise(async res => {
                try {
                    const amount: string = String(await contract.methods.balanceOf(holder).call())

                    const percentual = ((Number(amount) * Number(100)) / totalSupply).toFixed(2)

                    res({ holder, percentual, amount })
                } catch (err) {
                    res({ error: true })
                }
            })
        }

        historicalHolders.forEach(holder => concurrent.push(calculateHolderAmounts(holder)))

        const holdersWithAmounts = (await Promise.all(concurrent)).filter(h => !h.error)

        // console.log(holdersWithAmounts)

        const existingData = await Ca.findOne({ address, chain });

        existingData?.holders.forEach((holder: Holder) => {
            if (!holdersWithAmounts.find((h: Holder) => h.holder === holder.holder)) {
                holdersWithAmounts.push(holder);
            }
        });

        // console.log(existingData?.holders, holdersWithAmounts)

        await Ca.updateOne({
            address,
            chain
        }, {
            holders: holdersWithAmounts,
            holdersCount: holdersWithAmounts.length,
            transfers: transferCount,
            snipers
        });
    } catch (err) {
        // console.log("Update holder data failed ", address, chain)
    }
}