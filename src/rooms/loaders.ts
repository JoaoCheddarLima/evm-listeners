import { SocketEvents } from "../types";
import { RoomManager } from "./";
import { Base, ChainEvents, Ethereum } from '../web3'

const chains = [
    Ethereum, Base
]

Object.values(SocketEvents)
    .forEach((elem) => {
        RoomManager.createRoom(elem);

        function emitEvent(event: SocketEvents, chainEvent: ChainEvents) {
            for (const chain of chains) {
                chain.on(chainEvent, (data) => {
                    RoomManager.broadcastToRoom(event, data);
                })
            }
        }

        switch (elem) {
            case SocketEvents.NewPairs:
                emitEvent(elem, ChainEvents.NEW_PAIR);
                break;
            case SocketEvents.NewContracts:
                emitEvent(elem, ChainEvents.NEW_CONTRACT);
                break;
            case SocketEvents.VerifiedPairs:
                emitEvent(elem, ChainEvents.NEW_VERIFIED);
                break;
            default:
                break;
        }
    });