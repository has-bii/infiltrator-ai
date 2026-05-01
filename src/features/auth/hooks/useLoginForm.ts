"use client"

import { useForm } from "@tanstack/react-form"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"

import { loginSchema } from "../validation"

export function useLoginForm() {
  const router = useRouter()

  return useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })
      formApi.reset()

      if (error) {
        toast.error(error.message ?? "Login failed")
        return
      }

      router.push("/dashboard")
    },
  })
}
