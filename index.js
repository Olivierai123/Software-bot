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

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Olivier WhatsApp AI Bot is running!");
}).listen(PORT, "0.0.0.0", () => {
    console.log("Olivier web server is running!");
});

async function startBot() {
    const { state, saveCreds } =
        await useMultiFileAuthState("session");

    const method = (process.env.CONNECTION_METHOD || "qr").toLowerCase();

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

    let pairingRequested = false;

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !state.creds.registered && method === "qr") {
            console.log("WHATSAPP QR CODE:");
            qrcode.generate(qr, { small: true });
        }

        if (
            !state.creds.registered &&
            method === "pairing" &&
            !pairingRequested
        ) {
            pairingRequested = true;

            try {
                const number = process.env.PAIRING_NUMBER;

                if (!number) {
                    console.log("Please add PAIRING_NUMBER in Render.");
                } else {
                    const code = await sock.requestPairingCode(number);
                    console.log("YOUR WHATSAPP PAIRING CODE:", code);
                }
            } catch (error) {
                console.log("Pairing error:", error);
            }
        }

        if (connection === "open") {
            console.log("Olivier WhatsApp AI Bot connected!");
        }

        if (connection === "close") {
            const statusCode =
                lastDisconnect?.error?.output?.statusCode;

            if (statusCode === DisconnectReason.loggedOut) {
                console.log("WhatsApp logged out. Please reconnect.");
            } else {
                console.log("Connection closed. Reconnecting...");
                setTimeout(startBot, 5000);
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
