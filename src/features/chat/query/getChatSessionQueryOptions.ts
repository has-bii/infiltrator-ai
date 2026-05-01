import { ChatSession } from "@/generated/prisma/client"
import api from "@/lib/axios"

interface ResponseData {
  message: string
  data: Pick<ChatSession, "id" | "name" | "createdAt">
}

export const GET_CHAT_SESSION_QUERY_KEY = "get-chat-session" as const

export const getChatSessionQueryOptions = (chatSessionId: string) => ({
  queryKey: [GET_CHAT_SESSION_QUERY_KEY, chatSessionId],
  queryFn: async () => {
    const { data } = await api.get<ResponseData>(`/chat-session/${chatSessionId}`)
    return data.data
  },
})
