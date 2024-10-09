import { Schema, model } from 'mongoose'

const trades = new Schema({
    address: { type: String, unique: true, required: true },

    history: {
        type: Array,
        default: []
    }
})

export const Trades = model("Trades", trades)