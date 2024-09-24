import { Schema, model } from 'mongoose'

const deployer = new Schema({
    address: { type: String, unique: true, required: true },

    rugCount: { type: Number, default: 0 },

    deploys: { type: Number, default: 0 }
})

export const Deployer = model("Deployer", deployer)