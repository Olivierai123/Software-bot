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

      const target =
        msg.message?.extendedTextMessage?.contextInfo?.participant

      if (!target) {
        return sock.sendMessage(from, {
          text: "⚠️ Reply to the admin's message with !demote."
        }, { quoted: msg })
      }

      await sock.groupParticipantsUpdate(from, [target], "demote")

      await sock.sendMessage(from, {
        text: `⬇️ @${target.split("@")[0]} has been removed as an admin.`,
        mentions: [target]
      }, { quoted: msg })

    } catch (error) {
      console.log("Demote error:", error)
      await sock.sendMessage(from, {
        text: "❌ Demotion failed. Make sure the bot has admin permission."
      }, { quoted: msg })
    }
  }
          }
