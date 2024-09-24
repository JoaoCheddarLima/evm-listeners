import { ServerWebSocket } from "bun";
import { RoomManager } from "./rooms";
import { SocketEvents, WebSocketData } from "./types";
import { generateSessionUUID } from "./utils/session";
import './rooms/loaders';
import './web3';

Bun.serve({
    port: 8292,
    fetch(req, server) {
        const sessionId = generateSessionUUID();

        const url = new URL(req.url)

        for (const elem of Object.values(SocketEvents)) {
            if (url.pathname === `/${elem}`) {
                const success = server.upgrade(req, {
                    headers: {
                        "Set-Cookie": `session=${sessionId}; HttpOnly; Secure; SameSite=Strict`,
                    },
                    data: {
                        roomName: elem
                    }
                })

                if (success) return;

                return new Response("Upgrade failed", { status: 500 });
            }
        }

        server.upgrade(req, {
            headers: {
                "Set-Cookie": `session=${sessionId}; HttpOnly; Secure; SameSite=Strict`,
            }
        })

        return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        message(ws, message) {
            console.log(RoomManager)
        },
        open(ws) {
            if(!ws.data) return ws.close(1008, "Missing data");
            
            const data = ws.data as WebSocketData;

            //attention here idk why did I force this types they just fixed the error, don't make tests with this code
            RoomManager.addClientToRoom(data.roomName, ws as ServerWebSocket);
        },
        close(ws, code, message) { 
            if(!ws.data) return ws.close(1008, "Missing data");
            
            const data = ws.data as WebSocketData;

            RoomManager.removeClientFromRoom(data.roomName, ws as ServerWebSocket);
        },
        drain(ws) { },
    },
});