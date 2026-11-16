const jokes = [
  "😂 Why did the computer go to the doctor? Because it had a virus!",
  "🤣 Why was the maths book sad? Because it had too many problems!",
  "😅 What do you call a sleeping bull? A bulldozer!",
  "😂 Why did the chicken cross the road? To get to the other side!",
  "🤣 Why can't your nose be 12 inches long? Because then it would be a foot!",
  "😎 What do you call a fake noodle? An impasta!",
  "😂 Why did the phone wear glasses? Because it lost its contacts!",
  "🤣 What did one wall say to the other? I'll meet you at the corner!",
  "😅 Why did the student eat his homework? Because the teacher said it was a piece of cake!",
  "😂 What do you call a bear with no teeth? A gummy bear!"
]

module.exports = {
  run: async (sock, msg, args, from) => {
    const joke = jokes[Math.floor(Math.random() * jokes.length)]

    await sock.sendMessage(from, {
      text: `╭━━〔 😂 OLIVIER JOKES 〕━━╮

${joke}

╰━━〔 🤖 POWERED BY OLIVIER 〕━━╯`
    }, { quoted: msg })
  }
  }
