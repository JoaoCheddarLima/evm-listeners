import { Schema, model } from 'mongoose'

const lastblock = new Schema({
    number: { type: Number, required: true, index: true },
    chain: { type: String, required: true, index: true }
})

export const LastBlock = model("LastBlock", lastblock)