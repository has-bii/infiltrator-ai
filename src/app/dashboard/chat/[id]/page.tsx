"use client"

import dynamic from "next/dynamic"
import React from "react"

import ChatPageHeaderSkeleton from "@/features/chat/components/ChatPageHeaderSkeleton"

type Props = {
  params: Promise<{ id: string }>
}

const ChatPageHeader = dynamic(() => import("@/features/chat/components/ChatPageHeader"), {
  ssr: false,
  loading: ChatPageHeaderSkeleton,
})

export default function ChatPage({ params }: Props) {
  const { id } = React.use(params)

  return (
    <main className="relative flex min-h-0 flex-1 flex-col">
      <ChatPageHeader id={id} />
    </main>
  )
}
