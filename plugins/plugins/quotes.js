const quotes = [
  "Believe in yourself. You are stronger than you think. ❤️",
  "Great things take time. Never give up. 💪",
  "Your future is created by what you do today. ✨",
  "Stay positive, work hard and make it happen. 🔥",
  "Never let yesterday take too much of today. ❤️",
  "Be yourself. Everyone else is already taken. 😊",
  "Dream big, work hard and stay humble. 👑",
  "A little progress every day adds up to big results. 🌟",
  "Happiness is not having everything, but appreciating what you have. 💖",
  "Your only limit is your mind. 🚀",
  "Good friends make life beautiful. 🥰",
  "Don't stop until you are proud of yourself. 💯"
]

module.exports = {
  run: async (sock, msg, args, from) => {
    const quote = quotes[Math.floor(Math.random() * quotes.length)]

    await sock.sendMessage(from, {
      text: `╭━━〔 ✨ OLIVIER QUOTES 〕━━╮

${quote}

╰━━〔 🤖 POWERED BY OLIVIER 〕━━╯`
    }, { quoted: msg })
  }
  }
