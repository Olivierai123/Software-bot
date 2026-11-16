module.exports = {
run: async (sock, msg, args, from) => {
await sock.sendMessage(from, {
text: "👑 Owner: Olivier\n📞 Number: wa.me/23480XXXXXXXX\n🤖 Olivier WhatsApp AI Bot"
}, { quoted: msg })
}
  }
