module.exports = {
  run: async (sock, msg, args, from) => {
    const isGroup = from.endsWith("@g.us")
    if(!isGroup) return await sock.sendMessage(from, {text: "*This command only for group*"}, {quoted: msg})

    const groupMetadata = await sock.groupMetadata(from)
    const isAdmin = groupMetadata.participants.find(p => p.id === msg.key.participant)?.admin
    
    if(!isAdmin) return await sock.sendMessage(from, {text: "❌ Only admin fit use software autoclose"}, {quoted: msg})

    const action = args[0]?.toLowerCase()

    if(action === "on"){
      await sock.sendMessage(from, {text: `✅ *software autoclose ACTIVATED*\n\n🌙 Group go close by 11pm\n☀️ Group go open by 6am\n\nGroup: Soft Life & Cruise`})
      // Auto logic
      setInterval(async () => {
        const hour = new Date().toLocaleString("en-US", {timeZone: "Africa/Lagos", hour: "numeric", hour12: false})
        try {
          if(hour == 23){
            await sock.groupSettingUpdate(from, 'announcement') // close
            await sock.sendMessage(from, {text: "🌙 *software:* Good night! Group closed till 6am. Sweet dreams - Soft Life & Cruise 🌙"})
          }
          if(hour == 6){
            await sock.groupSettingUpdate(from, 'not_announcement') // open
            await sock.sendMessage(from, {text: "☀️ *software:* Good morning! Group open. Have a soft life today!"})
          }
        } catch {}
      }, 60*60*1000) // check every hour

    } else if(action === "off"){
      await sock.sendMessage(from, {text: "❌ *software autoclose DEACTIVATED*"})
    } else {
      await sock.sendMessage(from, {text: `*software autoclose guide:*\n\n!autoclose on - Activate sleep mode (11pm-6am)\n!autoclose off - Deactivate\n\nOnly admin fit use am`}, {quoted: msg})
    }
  }
}
