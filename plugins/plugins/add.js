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

      if (!args[0]) {
        return sock.sendMessage(from, {
          text: "⚠️ Usage: !add 2348012345678"
        }, { quoted: msg })
      }

      const number = args[0].replace(/\D/g, "")

      if (number.length < 10 || number.length > 15) {
        return sock.sendMessage(from, {
          text: "❌ Please enter a valid phone number with country code."
        }, { quoted: msg })
      }

      const jid = `${number}@s.whatsapp.net`

      const result = await sock.groupParticipantsUpdate(
        from, [jid], "add"
      )

      await sock.sendMessage(from, {
        text: "✅ Add request completed. WhatsApp may require an invitation."
      }, { quoted: msg })

    } catch (error) {
      console.log("Add error:", error)
      await sock.sendMessage(from, {
        text: "❌ Could not add this member. They may need an invitation link."
      }, { quoted: msg })
    }
  }
    }
