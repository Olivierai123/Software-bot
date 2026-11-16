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
const qrcode = require("qrcode-terminal");

// Keep Render Web Service running
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Olivier WhatsApp AI Bot is running!");
}).listen(PORT, "0.0.0.0", () => {
    console.log("Web server running on port " + PORT);
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

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log("Scan this WhatsApp QR code:");
            qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
            console.log("Olivier WhatsApp AI Bot connected!");
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            console.log("Connection closed.");

            if (shouldReconnect) {
                setTimeout(startBot, 5000);
            } else {
                console.log("WhatsApp logged out. Reconnect required.");
            }
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
