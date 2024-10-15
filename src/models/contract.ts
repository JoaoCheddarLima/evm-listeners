import { Schema, model } from 'mongoose'

const contract = new Schema({
    address: { type: String, required: true, index: true },

    deployHash: { type: String, index: true },
    deployer: { type: String, index: true },
    deployTimestamp: { type: Number },

    chain: { type: String, index: true, required: true },

    deploySupply: { type: String },
    decimals: { type: Number },
    symbol: { type: String },
    supply: { type: String },
    name: { type: String },

    creationBlock: { type: Number },

    verificationRetries: { type: Number, default: 0 },
    nextVerification: { type: Number, default: 0 },

    iconUrl: { type: String, default: null },
    socialsBool: { type: Array, default: [] },
    socials: { type: Array, default: [] },

    lastRugCheck: { type: Number, default: 0 },

    holdingTokens: { type: Boolean, default: false },
    mintedTokens: { type: Boolean, default: false },
    percentageHeld: { type: Number, default: 0 },
    tokensMinted: { type: String, default: '0' },
    baseToken: { type: String, index: true },
    baseLp: { type: String },
    pairCreatedTimestamp: { type: Number },
    pair: { type: String, index: true },
    pairBlock: { type: Number },
    initialLiquidity: { type: String },
    initialSupply: { type: String },

    isRennounced: { type: Boolean, default: false, index: true },
    isVerified: { type: Boolean, default: false, index: true },
    isHoneypot: { type: Boolean, default: false, index: true },
    isTrusted: { type: Boolean, default: false, index: true },
    isTokenCa: { type: Boolean, default: false, index: true },
    isLocked: { type: Boolean, default: false, index: true },
    isRug: { type: Boolean, default: false, index: true },

    rugTimestamp: { type: Number },
    removedEth: { type: String },
    rugHash: { type: String },

    holdersCount: { type: Number, default: 0 },
    holders: { type: Array, default: [] },
    snipers: { type: Array, default: [] },

    transfers: { type: Number, default: 0 },
    txCount: { type: Number, default: 0 },
    buys: { type: Number, default: 0 },
    sells: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },

    lastUpdate: { type: Number }
})

contract.index({ address: 1, chain: 1 }, { unique: true })

export const Ca = model("Ca", contract)