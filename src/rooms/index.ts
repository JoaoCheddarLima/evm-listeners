import { ServerWebSocket } from "bun";
import { Room, SocketEvents } from "../types";
import { encriptData } from "../utils/encription";

export class RoomManager {
    public static rooms: Map<SocketEvents, Room> = new Map();

    public static createRoom(name: SocketEvents) {
        this.rooms.set(name, { name, clients: new Set() });
    }

    public static getRoom(name: SocketEvents) {
        return this.rooms.get(name);
    }

    public static replyEncriptedMessage(client: ServerWebSocket, message: string) {
        const encryptedMessage = encriptData(message);

        client.send(encryptedMessage);
    }

    public static broadcastToRoom(roomName: SocketEvents, message: string) {
        const localRoom = this.getRoom(roomName);

        if (!localRoom) return;

        localRoom.clients.forEach(async (client) => {
            this.replyEncriptedMessage(client, message);
        });
    }

    public static addClientToRoom(roomName: SocketEvents, client: ServerWebSocket) {
        try {
            const localRoom = this.getRoom(roomName);

            this.replyEncriptedMessage(client, `Hello from server, you are trying to connect to ${roomName}`)

            if (!localRoom) return client.close(1008, "Room not found");

            this.replyEncriptedMessage(client, `You are now connected to ${roomName}`);

            localRoom.clients.add(client);
        } catch (err) {

        }
    }

    public static removeClientFromRoom(roomName: SocketEvents, client: ServerWebSocket) {
        try {
            const localRoom = this.getRoom(roomName);

            if (!localRoom) return client.close(1008, "Room not found");

            localRoom.clients.delete(client);
        } catch (err) {

        }
    }
}