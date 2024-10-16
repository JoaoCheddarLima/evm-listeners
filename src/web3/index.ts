import { UpdateDefiService } from "../service/defi"
import GenericEVMTokenListener from "./class/tokenListener"
import { ChainEvents, ChainTypes } from "./types"

import { connect } from 'mongoose'

connect(process.env.MONGO_URI!, {
    autoIndex: true
})
    .then(() => {
        console.log('✨ Connected to MongoDB')
        UpdateDefiService()

        setInterval(async () => {
            UpdateDefiService()
        }, 5 * 1000)
    })
    .catch(err => console.error(err))

const {
    ETH_RPC_HTTP, ETH_RPC_WSS, ETH_UNISWAP_FACTORY, ETH_UNISWAP_ROUTER, ETH_NATIVE_TOKEN_PAIRS,
    BASE_RPC_HTTP, BASE_RPC_WSS, BASE_UNISWAP_FACTORY, BASE_UNISWAP_ROUTER, BASE_NATIVE_TOKEN_PAIRS
} = process.env

const Ethereum = new GenericEVMTokenListener({
    chain: ChainTypes.ETH,
    nativeTokenPairAddresses: ETH_NATIVE_TOKEN_PAIRS!.split(','),
    rpcHTTP: ETH_RPC_HTTP!,
    rpcWSS: ETH_RPC_WSS!,
    UniswapFactoryAddress: ETH_UNISWAP_FACTORY!,
    UniswapRouterAddress: ETH_UNISWAP_ROUTER!
})

const Base = new GenericEVMTokenListener({
    chain: ChainTypes.BASE,
    nativeTokenPairAddresses: BASE_NATIVE_TOKEN_PAIRS!.split(','),
    rpcHTTP: BASE_RPC_HTTP!,
    rpcWSS: BASE_RPC_WSS!,
    UniswapFactoryAddress: BASE_UNISWAP_FACTORY!,
    UniswapRouterAddress: BASE_UNISWAP_ROUTER!
})

export { Ethereum, Base, ChainEvents }