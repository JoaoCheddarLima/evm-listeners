import { generateSessionUUID } from "./utils/session";

Bun.serve({
    port: 8292,
    fetch(req, server) {
        const sessionId = generateSessionUUID();

        const url = new URL(req.url)

        console.log(url.pathname)

        server.upgrade(req, {
            headers: {
                "Set-Cookie": `session=${sessionId}; HttpOnly; Secure; SameSite=Strict`,
            }
        })

        return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        message(ws, message) {
            ws.send(message.toString());
         },
        open(ws) { },
        close(ws, code, message) { },
        drain(ws) { },
    },
});