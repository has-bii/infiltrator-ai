import { ChatSession } from "@/generated/prisma/client"
import api from "@/lib/axios"

interface getChatSessionsParams {
  params?: {
    limit?: number
  }
}

interface ResponseData {
  message: string
  data: Pick<ChatSession, "id" | "name" | "createdAt">[]
}

export const GET_CHAT_SESSIONS_QUERY_KEY = "get-chat-sessions" as const

export const getChatSessionsQueryOptions = ({ params }: getChatSessionsParams) => ({
  queryKey: [GET_CHAT_SESSIONS_QUERY_KEY, params],
  queryFn: async () => {
    const { data } = await api.get<ResponseData>("/chat-session", {
      params,
    })
    return data.data
  },
})
