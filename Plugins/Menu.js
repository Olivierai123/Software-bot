module.exports = {
  run: async (sock, msg, args, from) => {
    const menu = `
┌────═━┈ software ┈━═────┐
 ✇ ▸ Group: Soft Life & Cruise
 ✇ ▸ Members: 1022
 ✇ ▸ Owner: software
 ✇ ▸ Commands:
 │ !menu
 │ !ping
 │ !owner
 │ !autoclose
└───────═━┈┈━═──────┘`
    await sock.sendMessage(from, {text: menu}, {quoted: msg})
  }
}
