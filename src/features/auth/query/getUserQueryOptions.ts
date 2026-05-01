import { queryOptions } from "@tanstack/react-query"

import { authClient } from "@/lib/auth-client"

export const GET_USER_QUERY_KEY = "auth" as const

export const getUserQueryOptions = () => {
  return queryOptions({
    queryKey: [GET_USER_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await authClient.getSession()

      if (error) {
        throw new Error(error.message || "Failed to get user session")
      }

      return data?.user!
    },
  })
}
