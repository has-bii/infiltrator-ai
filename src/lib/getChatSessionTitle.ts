import { OpenRouter } from "@openrouter/sdk"

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  appTitle: "Infiltrator AI",
})

export const getChatSessionTitle = async (message: string) => {
  const completion = await client.chat.send({
    chatRequest: {
      model: "google/gemini-2.5-flash-lite",
      maxTokens: 2048,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Create a new chat session title based on the user message. Only generate the title.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    },
  })

  const title = completion.choices[0].message.content

  if (!title) throw new Error("No title generated")

  return title
}
