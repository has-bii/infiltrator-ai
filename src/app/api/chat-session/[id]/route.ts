import { NextRequest } from "next/server"

import { updateChatSessionSchema } from "@/features/chat/validation"
import prisma from "@/lib/prisma"
import { deleteFile } from "@/lib/supabase/uploadFile"
import { NotFound, handleApiErrors } from "@/utils/errors"
import { getUserSession } from "@/utils/getUserSession"

interface Args {
  params: Promise<{ id: string }>
}

export async function GET(_: NextRequest, { params }: Args) {
  try {
    const { id } = await params

    const userSession = await getUserSession()

    const chatSession = await prisma.chatSession.findUnique({
      where: {
        id,
        userId: userSession.user.id,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    })

    if (!chatSession) throw new NotFound("Chat session not found")

    return Response.json({
      message: "ok",
      data: chatSession,
    })
  } catch (error) {
    return handleApiErrors(error)
  }
}

export async function PUT(request: NextRequest, { params }: Args) {
  try {
    const { id } = await params

    const userSession = await getUserSession()

    const { name } = updateChatSessionSchema.parse(await request.json())

    const chatSession = await prisma.chatSession.findUnique({
      where: {
        id,
        userId: userSession.user.id,
      },
    })

    if (!chatSession) throw new NotFound("Chat session not found")

    await prisma.chatSession.update({
      where: {
        id,
        userId: userSession.user.id,
      },
      data: {
        name,
      },
    })

    return Response.json({
      message: "ok",
      data: null,
    })
  } catch (error) {
    return handleApiErrors(error)
  }
}

export async function DELETE(_: NextRequest, { params }: Args) {
  try {
    const { id } = await params

    const userSession = await getUserSession()

    const chatSession = await prisma.chatSession.findUnique({
      where: {
        id,
        userId: userSession.user.id,
      },
      include: {
        messages: {
          select: { fileUrl: true },
          where: { fileUrl: { not: null } },
        },
      },
    })

    if (!chatSession) throw new NotFound("Chat session not found")

    await prisma.chatSession.delete({
      where: {
        id,
        userId: userSession.user.id,
      },
    })

    await Promise.all(chatSession.messages.map((msg) => deleteFile(msg.fileUrl!)).map((p) => p.catch(() => {})))

    return Response.json({
      message: "ok",
      data: null,
    })
  } catch (error) {
    return handleApiErrors(error)
  }
}
