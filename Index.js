const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const P = require("pino")
const fs = require("fs")
const config = require("./config")

async function startSoftware(){
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const sock = makeWASocket({
    auth: state,
    logger: P({level:'silent'}),
    printQRInTerminal: false,
    browser: ["software", "Chrome", "1.0"]
  })

  sock.ev.on('creds.update', saveCreds)
  
  sock.ev.on('messages.upsert', async ({messages}) => {
    const msg = messages[0]
    if(!msg.message || msg.key.fromMe) return
    const from = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
    
    if(!text.startsWith(config.prefix)) return
    const cmd = text.slice(1).split(" ")[0].toLowerCase()

    // load plugins
    const plugins = fs.readdirSync("./plugins")
    for(let file of plugins){
      if(file.replace(".js","") === cmd){
        const plugin = require(`./plugins/${file}`)
        await plugin.run(sock, msg, text.split(" ").slice(1), from)
      }
    }
  })

  sock.ev.on('connection.update', ({connection, lastDisconnect}) => {
    if(connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut){
      startSoftware()
    }
  })
}
startSoftware()
