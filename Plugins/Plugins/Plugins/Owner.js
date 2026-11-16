module.exports = {
  run: async (sock, msg, args, from) => {
    await sock.sendMessage(from, {text: "👑 Owner: software\n📞 Number: wa.me/23480XXXXXXXX\nGroup: Soft Life & Cruise - 437 members"}, {quoted: msg})
  }
}
