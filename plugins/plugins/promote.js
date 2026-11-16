module.exports = {
  run: async (sock, msg, args, from) => {
    try {
      if (!from.endsWith("@g.us")) {
        return sock.sendMessage(from, {
          text: "❌ This command only works in groups."
        }, { quoted: msg })
      }

      const metadata = await sock.groupMetadata(from)
      const sender = msg.key.participant || msg.key.remoteJid

      const isAdmin = metadata.participants.some(
        p => p.id === sender && p.admin
      )

      if (!isAdmin) {
        return sock.sendMessage(from, {
          text: "❌ Only group admins can use this command."
        }, { quoted: msg })
      }

      if (!msg.message?.extendedTextMessage?.contextInfo?.participant) {
        return sock.sendMessage(from, {
          text: "⚠️ Reply to the person's message with !promote."
        }, { quoted: msg })
      }

      const target = msg.message.extendedTextMessage.contextInfo.participant

      await sock.groupParticipantsUpdate(from, [target], "promote")

      await sock.sendMessage(from, {
        text: `👑 @${target.split("@")[0]} has been promoted to admin!`,
        mentions: [target]
      }, { quoted: msg })

    } catch (error) {
      console.log("Promote error:", error)
      await sock.sendMessage(from, {
        text: "❌ Promotion failed. Make sure the bot has admin permission."
      }, { quoted: msg })
    }
  }
    }
