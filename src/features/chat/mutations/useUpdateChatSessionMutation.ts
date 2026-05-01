import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ChatSession } from "@/generated/prisma/client"
import api from "@/lib/axios"

import { GET_CHAT_SESSION_QUERY_KEY } from "../query/getChatSessionQueryOptions"
import { GET_CHAT_SESSIONS_QUERY_KEY } from "../query/getChatSessionsQueryOptions"
import { UpdateChatSessionDto } from "../validation"

interface ResponseData {
  message: string
  data: ChatSession
}

export const useUpdateChatSessionMutation = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateChatSessionDto) => {
      const { data: resData } = await api.put<ResponseData>(`/chat-session/${id}`, data)
      return resData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_CHAT_SESSIONS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [GET_CHAT_SESSION_QUERY_KEY, id], exact: true })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
