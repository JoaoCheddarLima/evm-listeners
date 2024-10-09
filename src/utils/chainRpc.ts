import { ChainTypes } from "../web3/types";

export function chainRpc(chain: ChainTypes) {
    switch (chain) {
        case ChainTypes.ETH:
            return {
                rpcHTTP: process.env.ETH_RPC_HTTP!,
                rpcWSS: process.env.ETH_RPC_WSS!,
                UniswapFactoryAddress: process.env.ETH_UNISWAP_FACTORY!,
                UniswapRouterAddress: process.env.ETH_UNISWAP_ROUTER!,
                NativeTokenPairs: process.env.ETH_NATIVE_TOKEN_PAIRS!.split(',') || [],
                ETHScanKeys: process.env.ETH_SCAN_KEYS!.split(',')
            }
        case ChainTypes.BASE:
            return {
                rpcHTTP: process.env.BASE_RPC_HTTP!,
                rpcWSS: process.env.BASE_RPC_WSS!,
                UniswapFactoryAddress: process.env.BASE_UNISWAP_FACTORY!,
                UniswapRouterAddress: process.env.BASE_UNISWAP_ROUTER!,
                NativeTokenPairs: process.env.BASE_NATIVE_TOKEN_PAIRS!.split(',') || [],
                ETHScanKeys: process.env.BASE_SCAN_KEYS!.split(',')
            }
        default:
            throw new Error('Chain not supported')
    }
}