import { z } from "zod"

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
export type RegisterValues = z.infer<typeof registerSchema>
