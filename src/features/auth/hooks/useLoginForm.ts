"use client"

import { useRouter } from "next/navigation"
import { useForm } from "@tanstack/react-form"
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
      onChange: loginSchema,
    },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      })

      if (error) {
        toast.error(error.message ?? "Login failed")
        return
      }

      router.push("/")
    },
  })
}
