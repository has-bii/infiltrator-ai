"use client"

import dynamic from "next/dynamic"

const HistoryList = dynamic(() => import("@/features/chat/components/HistoryList"), {
  ssr: false,
})

export default function RecentPage() {
  return (
    <div className="flex flex-1 justify-center p-6">
      <div className="mt-6 flex w-full max-w-3xl flex-col gap-6">
        {/* Header */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold">Recent Chat Sessions</h1>
          <p className="text-muted-foreground text-sm">
            Here is a list of your recent chat sessions. You can continue where you left off by
            clicking on any of the sessions below.
          </p>
        </div>
        {/* Chats List */}
        <HistoryList />
      </div>
    </div>
  )
}
