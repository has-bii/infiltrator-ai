"use client"

import { RiDeleteBinLine, RiLoader4Fill, RiMoreLine } from "@remixicon/react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useDeleteChatSessionMutation } from "@/features/chat/mutations/useDeleteChatSessionMutation"
import { getChatSessionsQueryOptions } from "@/features/chat/query/getChatSessionsQueryOptions"

export function NavSessions() {
  const { data: chatSessions, isLoading } = useQuery(
    getChatSessionsQueryOptions({ params: { limit: 10 } }),
  )

  const pathname = usePathname()

  const deleteChatSessionMutation = useDeleteChatSessionMutation()
  const router = useRouter()

  const handleDeleteChatSession = (id: string, isActive: boolean) => {
    toast.promise(deleteChatSessionMutation.mutateAsync(id), {
      loading: "Deleting chat session...",
      success: () => {
        if (isActive) {
          router.push("/dashboard")
        }
        return "Chat session deleted successfully"
      },
      error: "Failed to delete chat session",
    })
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Recent Sessions</SidebarGroupLabel>
      <SidebarMenu>
        {isLoading && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <RiLoader4Fill className="text-sidebar-foreground/70 animate-spin" />
              <span>Loading...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {!isLoading && !chatSessions?.length && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <span>No chat sessions found</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {chatSessions?.map((item) => {
          const isActive = pathname === `/dashboard/chat/${item.id}`
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton isActive={isActive} asChild>
                <Link href={`/dashboard/chat/${item.id}`}>
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover className="aria-expanded:bg-muted">
                    <RiMoreLine />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 rounded-lg" side="right" align="start">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleDeleteChatSession(item.id, isActive)}
                  >
                    <RiDeleteBinLine className="text-muted-foreground" />
                    <span>Delete Chat Session</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
