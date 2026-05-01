import { BUCKET_NAME } from "./constant"
import { createClient } from "./server"

interface Args {
  file: File
  userId: string
}

export const uploadFile = async ({ file, userId }: Args) => {
  const client = await createClient()

  const fileName = `${new Date().getTime()}-${file.name}`

  const filePath = `${userId}/${fileName}`

  const { data, error } = await client.storage.from(BUCKET_NAME).upload(filePath, file, {
    contentType: file.type,
  })

  if (error) throw new Error("Failed to upload file")

  return {
    url: data.path,
    name: fileName,
  }
}
