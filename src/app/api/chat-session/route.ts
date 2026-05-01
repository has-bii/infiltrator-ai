import { NextRequest } from "next/server"
import z from "zod"

import { createChatSessionSchema } from "@/features/chat/validation"
import { getChatSessionTitle } from "@/lib/getChatSessionTitle"
import prisma from "@/lib/prisma"
import { deleteFile, uploadFile } from "@/lib/supabase/uploadFile"
import { handleApiErrors } from "@/utils/errors"
import { getUserSession } from "@/utils/getUserSession"

export async function GET(request: NextRequest) {
  try {
    const userSession = await getUserSession()

    const searchParams = request.nextUrl.searchParams

    const limit = z
      .number()
      .int()
      .positive()
      .optional()
      .catch(undefined)
      .parse(searchParams.get("limit"))

    const chatSessions = await prisma.chatSession.findMany({
      where: {
        userId: userSession.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    })

    return Response.json({
      message: "ok",
      data: chatSessions,
    })
  } catch (error) {
    return handleApiErrors(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userSession = await getUserSession()

    const formData = await request.formData()

    // Parse and validate the form data
    const { message, file } = createChatSessionSchema.parse({
      message: formData.get("message"),
      file: formData.get("file"),
    })

    // Generate title for the chat session
    const title = await getChatSessionTitle(message)

    // Upload the file to Supabase Storage
    let uploadedFile: null | Awaited<ReturnType<typeof uploadFile>> = null

    if (file) {
      uploadedFile = await uploadFile({ file, userId: userSession.user.id })
    }

    // Create chat session with initial messages
    let chatSession: Awaited<ReturnType<typeof prisma.chatSession.create>>
    try {
      chatSession = await prisma.chatSession.create({
        data: {
          name: title,
          userId: userSession.user.id,
          messages: {
            createMany: {
              data: uploadedFile
                ? [
                    {
                      role: "user",
                      content: message,
                    },
                    {
                      role: "user",
                      fileUrl: uploadedFile.url,
                      fileName: uploadedFile.name,
                      content: `Uploaded file: ${uploadedFile.name}`,
                    },
                  ]
                : [
                    {
                      role: "user",
                      content: message,
                    },
                  ],
            },
          },
        },
      })
    } catch (dbError) {
      if (uploadedFile) {
        await deleteFile(uploadedFile.url).catch(() => {})
      }
      throw dbError
    }

    return Response.json(
      {
        message: "ok",
        data: chatSession,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    return handleApiErrors(error)
  }
}
