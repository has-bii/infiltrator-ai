"use client"

import { RiChatAi4Fill, RiRobot3Fill } from "@remixicon/react"
import React from "react"

import { MainSidebarMenuItem, NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

import { NavSessions, SessionNavItem } from "./nav-sessions"

const navMainItems = [
  {
    title: "Sessions",
    url: "/dashboard",
    icon: <RiChatAi4Fill />,
  },
] satisfies MainSidebarMenuItem[]

const navSessionItems = [
  {
    name: "Session 1",
    url: "#",
  },
  {
    name: "Session 2",
    url: "#",
  },
] satisfies SessionNavItem[]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <RiRobot3Fill />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Infiltrator AI</span>
                <span className="truncate text-xs">Beta</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSessions sessions={navSessionItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
