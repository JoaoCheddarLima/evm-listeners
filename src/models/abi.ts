import { Schema, model } from 'mongoose'

const abi = new Schema({
    address: { type: String, required: true, index: true },
    abi: { type: String, required: true },
    chain: { type: String, index: true, required: true }
})

abi.index({ address: 1, chain: 1 }, { unique: true })

export const Abi = model("Abi", abi)