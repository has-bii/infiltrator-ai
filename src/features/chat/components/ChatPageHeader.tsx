import { useSuspenseQuery } from "@tanstack/react-query"
import React, { useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { useUpdateChatSessionMutation } from "../mutations/useUpdateChatSessionMutation"
import { getChatSessionQueryOptions } from "../query/getChatSessionQueryOptions"

type Props = {
  id: string
}

export default function ChatPageHeader({ id }: Props) {
  const { data } = useSuspenseQuery(getChatSessionQueryOptions(id))
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const [isFocus, setIsFocus] = useState(false)

  const mutation = useUpdateChatSessionMutation(id)

  const handleClick = () => {
    setValue(data.name)
    setIsFocus(true)
    inputRef.current?.focus()
  }

  const handleBlur = () => {
    setIsFocus(false)
    if (value.length > 0)
      mutation.mutate({
        name: value,
      })
    setValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleBlur()
  }

  return (
    <header className="flex h-14 items-center border-b px-6">
      <Input
        ref={inputRef}
        className={cn("w-sm", isFocus ? "block" : "hidden")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={mutation.isPending}
        aria-label="Rename chat session"
      />

      <React.Activity mode={isFocus ? "hidden" : "visible"}>
        <h1
          role="button"
          className="hover:bg-muted max-w-xl truncate text-sm"
          onClick={handleClick}
        >
          {data.name}
        </h1>
      </React.Activity>
    </header>
  )
}
