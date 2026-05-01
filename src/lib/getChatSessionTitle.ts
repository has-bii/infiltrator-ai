import { OpenRouter } from "@openrouter/sdk"

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  appTitle: "Infiltrator AI",
})

const TITLE_GEN_TIMEOUT_MS = 5000
const FALLBACK_TITLE_MAX_LENGTH = 50

const fallbackTitle = (message: string) =>
  message.length > FALLBACK_TITLE_MAX_LENGTH
    ? message.slice(0, FALLBACK_TITLE_MAX_LENGTH) + "…"
    : message

export const getChatSessionTitle = async (message: string): Promise<string> => {
  try {
    const completion = await Promise.race([
      client.chat.send({
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
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Title generation timed out")), TITLE_GEN_TIMEOUT_MS),
      ),
    ])

    const title = completion.choices[0].message.content

    if (!title) return fallbackTitle(message)

    return title
  } catch {
    return fallbackTitle(message)
  }
}
