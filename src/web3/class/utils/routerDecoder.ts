import { formatEther, formatUnits } from "ethers";
import InputDataDecoder from 'ethereum-input-data-decoder'
import abi from '../abis/router.json'

const decoder = new InputDataDecoder(abi)

export function getRugInfo({
    inputData,
    from,
    to,
    hash,
    weth
}: {
    inputData: string,
    from: string,
    to: string,
    hash: string,
    weth: string
}) {
    try {
        const { names, inputs, method } = decoder.decodeData(inputData) as {
            names: string[],
            inputs: any[],
            method: string
        }

        if (method.toLowerCase().includes("removeliquidity")) {
            const rugger = names.findIndex(e => e.toLowerCase() == "to")
            const amountOfLp = names.findIndex(e => e.toLowerCase() == "liquidity")

            let tokenIndex, tokenName, amountETHMin

            for (const i in names) {
                const knownTokenLabels = [
                    "tokena",
                    "tokenb",
                    "token"
                ]

                if (knownTokenLabels.includes(names[i].toLowerCase()) && inputs[i] !== weth) {
                    tokenIndex = i
                    tokenName = names[i].slice(names[i].length - 1).toLowerCase()
                    break
                }
            }

            for (const i in names) {
                const knownTokenLabels = [
                    "amountethmin",
                    `amount${tokenName == "a" ? "b" : "a"}min`,
                ]

                if (knownTokenLabels.includes(names[i].toLowerCase())) {
                    amountETHMin = i
                    break
                }
            }

            return {
                // @ts-ignore
                removedEth: formatEther(inputs[amountETHMin].toString()),
                removedLp: formatUnits(inputs[amountOfLp].toString()),
                rugger: "0x" + inputs[rugger].toLowerCase(),
                // @ts-ignore
                token: "0x" + inputs[tokenIndex].toLowerCase(),
                rugHash: hash
            }
        }
    } catch (err) {
        if (inputData == "0x7cabdfa0") {
            return {
                removedEth: "0",
                removedLp: "0",
                rugger: from,
                token: to,
                rugHash: hash,
            }
        }
    }
}