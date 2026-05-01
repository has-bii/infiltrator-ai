import React from "react"

type Props = {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  return (
    <div className="flex min-h-dvh w-screen items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
