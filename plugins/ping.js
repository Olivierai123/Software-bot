module.exports = {
run: async (sock, msg, args, from) => {
const start = Date.now()
await sock.sendMessage(from, {
text: "🏓 Pong!\n⚡ Response: ${Date.now() - start}ms\n🤖 Olivier WhatsApp AI Bot is online!"
}, { quoted: msg })
}
}
