import { RiChatAi4Fill, RiDeleteBin6Fill } from "@remixicon/react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { intlFormatDistance } from "date-fns"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"

import { getChatSessionsQueryOptions } from "../query/getChatSessionsQueryOptions"
import { DeleteChatSessionDialog } from "./DeleteChatSessionDialog"

export default function HistoryList() {
  const { data: chatSessions } = useSuspenseQuery(getChatSessionsQueryOptions({}))
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)

  if (chatSessions.length === 0) {
    return (
      <Empty className="max-h-96 border-4 border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiChatAi4Fill />
          </EmptyMedia>
          <EmptyTitle>No Chat Sessions Found</EmptyTitle>
          <EmptyDescription>
            You don't have any chat sessions yet. Start a conversation to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <ScrollArea className="h-[calc(100vh-12rem)] w-full pr-3">
        <div className="flex h-[200vh] flex-col divide-y">
          {chatSessions.map((chatSession) => (
            <Link
              key={chatSession.id}
              href={`/dashboard/chat/${chatSession.id}`}
              className="hover:bg-muted flex items-center justify-between px-4 py-6 transition-colors first:border-t last:border-b"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-medium">{chatSession.name}</h3>
                <p className="text-muted-foreground text-xs">
                  {intlFormatDistance(chatSession.createdAt, new Date())}
                </p>
              </div>

              <Button
                variant="destructive"
                size="icon"
                onClick={(event) => {
                  event.preventDefault()
                  setDeleteSessionId(chatSession.id)
                }}
              >
                <RiDeleteBin6Fill />
              </Button>
            </Link>
          ))}
        </div>
      </ScrollArea>
      <DeleteChatSessionDialog sessionId={deleteSessionId} />
    </>
  )
}
