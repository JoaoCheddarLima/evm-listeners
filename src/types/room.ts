import { ServerWebSocket } from "bun";
import { SocketEvents } from "./socket";

export interface Room {
    name: SocketEvents;
    clients: Set<ServerWebSocket>;
}