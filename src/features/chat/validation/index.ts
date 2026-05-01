import z from "zod"

export const createChatSessionSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  file: z
    .file()
    .refine(
      (file) => file.type === "application/pdf",
      "File must be a PDF",
    ) /* Check mime type PDF only */
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "File must be at most 10MB",
    ) /* Check file size */
    .optional()
    .nullable(),
})

export const updateChatSessionSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(64, "Name must be at most 64 characters long"),
})

export type CreateChatSessionDto = z.infer<typeof createChatSessionSchema>
export type UpdateChatSessionDto = z.infer<typeof updateChatSessionSchema>
