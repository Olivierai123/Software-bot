module.exports = {
  run: async (sock, msg, args, from) => {
    try {
      const question = args.join(" ").trim()

      if (!question) {
        return sock.sendMessage(from, {
          text: "🤖 Ask Olivier AI something!\n\nExample: !ai Tell me a joke"
        }, { quoted: msg })
      }

      const apiKey = process.env.OPENAI_API_KEY

      if (!apiKey) {
        return sock.sendMessage(from, {
          text: "❌ AI API key is not configured."
        }, { quoted: msg })
      }

      await sock.sendMessage(from, {
        text: "🤖 Olivier AI is thinking..."
      }, { quoted: msg })

      const response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-5.5",
            instructions: "You are Olivier AI, a friendly, helpful WhatsApp assistant. Give clear and useful answers.",
            input: question,
            max_output_tokens: 500
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || "AI request failed")
      }

      const answer = data.output
        ?.flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n")

      if (!answer) {
        throw new Error("No answer received")
      }

      await sock.sendMessage(from, {
        text: `🤖 *OLIVIER AI*\n\n${answer}\n\n❤️ Powered by Olivier`
      }, { quoted: msg })

    } catch (error) {
      console.log("AI Error:", error)

      await sock.sendMessage(from, {
        text: "❌ Olivier AI could not respond. Please try again later."
      }, { quoted: msg })
    }
  }
              }
