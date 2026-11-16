module.exports = {
  run: async (sock, msg, args, from) => {
    const menu = `
┌────═━┈ OLIVIER AI ┈━═────┐

 ✦ ▸ Bot: Olivier WhatsApp AI
 ✦ ▸ Owner: Olivier
 ✦ ▸ Status: Online 🟢
 ✦ ▸ Version: 1.0.0
 ✦ ▸ Commands:

╭━━〔 GENERAL 〕━━╮
 │ !menu
 │ !ping
 │ !owner
╰━━━━━━━━━━━━━━╯

╭━━〔 GROUP 〕━━╮
 │ !autoclose on
 │ !autoclose off
╰━━━━━━━━━━━━━╯

└────═━┈ POWERED BY OLIVIER ┈━═────┘

❤️ Thanks for using Olivier AI Bot!
`
    await sock.sendMessage(from, { text: menu }, { quoted: msg })
  }
  }
