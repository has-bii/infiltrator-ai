"use client"

import { RiMoonFill, RiSunFill } from "@remixicon/react"
import { useTheme } from "next-themes"

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar"

export function NavThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}>
          <RiSunFill className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <RiMoonFill className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span>Toggle Theme</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
