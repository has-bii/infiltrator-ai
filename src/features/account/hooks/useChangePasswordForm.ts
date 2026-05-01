import { useForm } from "@tanstack/react-form"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"

import { changePasswordSchema } from "../validation"

export const useChangePasswordForm = () => {
  return useForm({
    validators: {
      onSubmit: changePasswordSchema,
    },
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      })

      if (error) {
        toast.error(error.message || "Failed to change password")
        return
      }

      toast.success("Password changed successfully")
      formApi.reset()
    },
  })
}
