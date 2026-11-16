const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys")
const pino = require("pino")
const fs = require("fs")
const path = require("path")

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        printQRInTerminal: true,
        logger: pino({ level: "silent" }),
        browser: ["software", "Chrome", "20.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update
        if(connection === "close"){
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            console.log("Connection closed, reconnecting:", shouldReconnect)
            if(shouldReconnect) startBot()
        } else if(connection === "open"){
            console.log("✅ software connected! Soft Life & Cruise bot is online")
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if(!msg.message) return
        const from = msg.key.remoteJid
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        if(!body.startsWith("!")) return

        const args = body.slice(1).trim().split(/ +/)
        const command = args.shift().toLowerCase()
        
        const pluginPath = path.join(__dirname, "plugins", `${command}.js`)
        if(fs.existsSync(pluginPath)){
            try {
                const plugin = require(pluginPath)
                await plugin.run(sock, msg, args, from)
            } catch(e){
                console.log("Plugin error:", e)
            }
        }
    })
}

startBot()
