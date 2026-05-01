import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import api from "@/lib/axios"

import { GET_CHAT_SESSIONS_QUERY_KEY } from "../query/getChatSessionsQueryOptions"

interface ResponseData {
  message: string
  data: null
}

export const useDeleteChatSessionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: resData } = await api.delete<ResponseData>(`/chat-session/${id}`)
      return resData
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [GET_CHAT_SESSIONS_QUERY_KEY] })
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
