const {
default: makeWASocket,
useMultiFileAuthState,
DisconnectReason,
makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");
const http = require("http");
const QRCode = require("qrcode");

const PORT = process.env.PORT || 3000;
const METHOD = (process.env.CONNECTION_METHOD || "qr").toLowerCase();
const QR_TOKEN = process.env.QR_ACCESS_TOKEN;

let qrImage = null;
let reconnecting = false;

const server = http.createServer((req, res) => {
const url = new URL(req.url, "http://${req.headers.host}");

if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end("<h2>Olivier WhatsApp AI Bot is running!</h2>");
}

if (url.pathname === "/qr") {
    if (!QR_TOKEN || url.searchParams.get("token") !== QR_TOKEN) {
        res.writeHead(403);
        return res.end("Access denied.");
    }

    if (!qrImage) {
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end("<h2>QR code is not ready. Refresh shortly.</h2>");
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(`
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta http-equiv="refresh" content="5">
            <title>Olivier Bot QR</title>
        </head>
        <body style="text-align:center;font-family:Arial">
            <h2>Olivier WhatsApp AI Bot</h2>
            <p>Scan this QR code using WhatsApp Linked Devices.</p>
            <img src="${qrImage}" style="width:280px;max-width:90%">
            <p>Refreshes automatically.</p>
        </body>
        </html>
    `);
}

res.writeHead(404);
res.end("Not found");

});

server.listen(PORT, "0.0.0.0", () => {
console.log("Olivier web server is running!");
});

async function startBot() {
const { state, saveCreds } =
await useMultiFileAuthState("session");

const sock = makeWASocket({
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "silent" })
        )
    },
    logger: pino({ level: "silent" }),
    browser: ["Olivier AI Bot", "Chrome", "1.0.0"]
});

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && METHOD === "qr" && !state.creds.registered) {
        try {
            qrImage = await QRCode.toDataURL(qr);
            console.log("QR code image is ready at /qr");
        } catch (error) {
            console.log("QR image error:", error.message);
        }
    }

    if (connection === "open") {
        qrImage = null;
        console.log("Olivier WhatsApp AI Bot is connected!");
    }

    if (connection === "close" && !reconnecting) {
        qrImage = null;

        const error = lastDisconnect?.error;
        const status = error?.output?.statusCode;

        console.log("Connection closed. Status:", status);
        console.log("Reason:", error?.message || "Unknown");

        if (status === DisconnectReason.loggedOut) {
            console.log("WhatsApp logged out. New login required.");
            return;
        }

        reconnecting = true;

        setTimeout(() => {
            reconnecting = false;
            startBot().catch(console.error);
        }, 5000);
    }
});

sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg || !msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

    if (!body.startsWith("!")) return;

    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (!command) return;

    const pluginPath = path.join(
        __dirname,
        "plugins",
        `${command}.js`
    );

    if (fs.existsSync(pluginPath)) {
        try {
            const plugin = require(pluginPath);
            await plugin.run(sock, msg, args, from);
        } catch (error) {
            console.log("Plugin error:", error);
        }
    }
});

}

startBot().catch(console.error);
