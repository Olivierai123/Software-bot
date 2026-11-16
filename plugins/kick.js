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
      const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net"

      const senderAdmin = metadata.participants.some(
        p => p.id === sender && p.admin
      )

      const botAdmin = metadata.participants.some(
        p => p.id === botJid && p.admin
      )

      if (!senderAdmin) {
        return sock.sendMessage(from, {
          text: "❌ Only group admins can use this command."
        }, { quoted: msg })
      }

      if (!botAdmin) {
        return sock.sendMessage(from, {
          text: "❌ Please make the bot a group admin first."
        }, { quoted: msg })
      }

      const target = msg.message?.extendedTextMessage?.contextInfo?.participant

      if (!target) {
        return sock.sendMessage(from, {
          text: "⚠️ Tag the person you want to remove."
        }, { quoted: msg })
      }

      await sock.groupParticipantsUpdate(from, [target], "remove")

      await sock.sendMessage(from, {
        text: `✅ @${target.split("@")[0]} has been removed from the group.`,
        mentions: [target]
      }, { quoted: msg })

    } catch (error) {
      console.log("Kick error:", error)
      await sock.sendMessage(from, {
        text: "❌ Could not remove that member. Please try again."
      }, { quoted: msg })
    }
  }
        }
