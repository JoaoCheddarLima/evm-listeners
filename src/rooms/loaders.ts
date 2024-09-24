import { SocketEvents } from "../types";
import { RoomManager } from ".";

Object.values(SocketEvents)
    .forEach((elem) => {
        RoomManager.createRoom(elem);
    });