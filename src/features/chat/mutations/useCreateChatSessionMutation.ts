import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { ChatSession } from "@/generated/prisma/client"
import api from "@/lib/axios"

import { GET_CHAT_SESSIONS_QUERY_KEY } from "../query/getChatSessionsQueryOptions"
import { CreateChatSessionDto } from "../validation"

interface ResponseData {
  message: string
  data: ChatSession
}

export const useCreateChatSessionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateChatSessionDto) => {
      const formData = new FormData()

      formData.append("message", data.message)

      if (data.file) {
        formData.append("file", data.file)
      }

      const { data: res } = await api.postForm<ResponseData>("/chat-session", formData)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_CHAT_SESSIONS_QUERY_KEY] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
