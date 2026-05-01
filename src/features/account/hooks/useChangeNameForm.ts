import { useForm } from "@tanstack/react-form"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { GET_USER_QUERY_KEY } from "@/features/auth/query/getUserQueryOptions"
import { authClient } from "@/lib/auth-client"

import { changeNameSchema } from "../validation"

type UseChangeNameFormOptions = {
  defaultValues: {
    name?: string
  }
}

export const useChangeNameForm = ({ defaultValues }: UseChangeNameFormOptions) => {
  const queryClient = useQueryClient()

  return useForm({
    validators: {
      onSubmit: changeNameSchema,
    },
    defaultValues: {
      name: defaultValues?.name ?? "",
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.updateUser({
        name: value.name,
      })

      if (error) {
        toast.error(error.message)
        formApi.reset()
        return
      }

      await queryClient.invalidateQueries({
        queryKey: [GET_USER_QUERY_KEY],
        exact: true,
      })
      toast.success("Name changed successfully")
    },
  })
}
