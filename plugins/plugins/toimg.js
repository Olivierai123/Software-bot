const { downloadContentFromMessage } = require("@whiskeysockets/baileys")
const sharp = require("sharp")

module.exports = {
  run: async (sock, msg, args, from) => {
    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

      const message = quoted || msg.message
      const sticker = message.stickerMessage

      if (!sticker) {
        return sock.sendMessage(from, {
          text: "⚠️ Reply to a sticker with !toimg."
        }, { quoted: msg })
      }

      const stream = await downloadContentFromMessage(sticker, "sticker")

      let buffer = Buffer.alloc(0)

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }

      const image = await sharp(buffer)
        .png()
        .toBuffer()

      await sock.sendMessage(from, {
        image,
        caption: "✅ Converted successfully!\n🤖 Olivier AI Bot"
      }, { quoted: msg })

    } catch (error) {
      console.log("Toimg error:", error)

      await sock.sendMessage(from, {
        text: "❌ Could not convert this sticker."
      }, { quoted: msg })
    }
  }
    }
