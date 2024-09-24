import { ChainTypes } from "./chain";

export interface BaseContractData {
    address: string;
    deployHash: string;
    deployer: string;
    deployTimestamp: number;
    creationBlock: number;
    chain: ChainTypes;
    supply: string;
    name: string;
    decimals: number;
    symbol: string;
    mintedTokens: boolean;
    tokensMinted: string;
    isTokenCa: boolean;
    isLocked: boolean;
    isRennounced: boolean;
    isHoneypot: boolean;
    isTrusted: boolean;
    verificationRetries: number;
    nextVerification: number;
    isVerified: boolean;
}

export interface VerifiedData {
    iconUrl: string;
    socialsBool: boolean[];
    socials: string[];
}

export interface PairSpecificData {
    holdingTokens: boolean;
    percentageHeld: number;
    baseToken: string;
    baseLp: string;
    initialSupply: string;
    initialLiquidity: string;
    pair: string;
    pairCreatedTimestamp: number;
    isRug: boolean;
    isTokenCa: true;
    lastRugCheck: number;
    rugTimestamp: number;
    rugHash: string;
    removedEth: number;
}

export type ContractData =
    | (BaseContractData & { isVerified: false })
    | (BaseContractData & VerifiedData & { isVerified: true });

export type PairContractData =
    | (ContractData & PairSpecificData & { isVerified: false })
    | (ContractData & PairSpecificData & VerifiedData & { isVerified: true });

export function isVerifiedContract(contract: ContractData): contract is ContractData & VerifiedData {
    return contract.isVerified;
}

export function isVerifiedPairContract(contract: PairContractData): contract is PairContractData & VerifiedData {
    return contract.isVerified;
}
