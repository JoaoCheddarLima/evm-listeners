import { RoomManager } from "../rooms"
import { SocketEvents } from "../types"

console.log(RoomManager.getRoom(SocketEvents.NewPairs))

setInterval(() => {
    if(!RoomManager.getRoom(SocketEvents.NewPairs)) throw new Error('Room not found')

    RoomManager.broadcastToRoom(SocketEvents.NewPairs, 'Hello from server')
}, 100)