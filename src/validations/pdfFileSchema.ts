import { z } from "zod"

export const pdfFileSchema = z
  .instanceof(File, {
    message: "PDF file is required",
  })
  .refine((file) => file.type === "application/pdf", {
    message: "Only PDF files are allowed",
  })
  .refine((file) => file.size <= 10 * 1024 * 1024, {
    message: "PDF file size must be less than 10MB",
  })
