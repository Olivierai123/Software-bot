module.exports = {
  run: async (sock, msg, args, from) => {
    const start = Date.now()
    await sock.sendMessage(from, {text: "🏓 Pinging..."}, {quoted: msg})
    const end = Date.now()
    await sock.sendMessage(from, {text: `*software is active!*\n\nSpeed: ${end-start}ms\nGroup: Soft Life & Cruise`}, {quoted: msg})
  }
}
