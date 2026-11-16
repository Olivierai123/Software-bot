const { downloadContentFromMessage } = require("@whiskeysockets/baileys")
const { Sticker, StickerTypes } = require("wa-sticker-formatter")

module.exports = {
  run: async (sock, msg, args, from) => {
    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      const message = quoted || msg.message

      let media
      let type

      if (message.imageMessage) {
        media = message.imageMessage
        type = "image"
      } else if (message.videoMessage) {
        media = message.videoMessage
        type = "video"
      } else {
        return sock.sendMessage(from, {
          text: "⚠️ Send or reply to an image/video with !sticker."
        }, { quoted: msg })
      }

      if (type === "video" && media.seconds > 10) {
        return sock.sendMessage(from, {
          text: "❌ Video must be 10 seconds or less."
        }, { quoted: msg })
      }

      const stream = await downloadContentFromMessage(media, type)
      let buffer = Buffer.from([])

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }

      const sticker = new Sticker(buffer, {
        pack: "Olivier AI",
        author: "Olivier",
        type: StickerTypes.FULL,
        quality: 60
      })

      await sock.sendMessage(from, {
        sticker: await sticker.toBuffer()
      }, { quoted: msg })

    } catch (error) {
      console.log("Sticker error:", error)
      await sock.sendMessage(from, {
        text: "❌ Could not create sticker. Please try again."
      }, { quoted: msg })
    }
  }
  }
