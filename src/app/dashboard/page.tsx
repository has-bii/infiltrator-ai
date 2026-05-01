"use client"

import {
  RiAddLargeLine,
  RiArrowUpFill,
  RiCloseFill,
  RiFile2Fill,
  RiLink,
  RiLoader2Line,
  RiSendPlane2Fill,
} from "@remixicon/react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCreateChatSessionMutation } from "@/features/chat/mutations/useCreateChatSessionMutation"
import { cn } from "@/lib/utils"
import { pdfFileSchema } from "@/validations/pdfFileSchema"

export default function Page() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const mutation = useCreateChatSessionMutation()

  const canSend = value.trim().length > 0

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = async () => {
    if (!canSend) return

    const session = await mutation.mutateAsync({
      message: value,
      file,
    })

    router.push(`/dashboard/chat/${session.data.id}`)
  }

  const handleUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) return

    const result = pdfFileSchema.safeParse(selectedFile)

    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    setFile(selectedFile)
  }

  return (
    <main className="mx-auto flex min-h-0 max-w-3xl flex-1 flex-col justify-center">
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Where do you want to "infiltrate" today?</h1>

        <Card
          className="transition-all duration-200 ease-in-out hover:cursor-text hover:shadow-md"
          onClick={() => textareaRef.current?.focus()}
        >
          <CardContent className={cn("flex flex-col gap-4", file ? "h-64" : "h-48")}>
            {/* PDF preview */}
            {file && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="bg-muted relative flex aspect-square size-18 flex-col items-center justify-center overflow-hidden border hover:cursor-pointer">
                    <RiFile2Fill />
                    <button className="absolute top-1 right-1" onClick={() => setFile(null)}>
                      <RiCloseFill />
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{file.name}</p>
                </TooltipContent>
              </Tooltip>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={mutation.isPending}
              className="flex-1 resize-none outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type or paste text here..."
            />
            <div className="flex h-10 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon">
                    <RiAddLargeLine />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-fit">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      disabled={!!file || mutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <RiLink />
                      <span>Add CV/Resume (PDF)</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {canSend && (
                <Button
                  size="icon"
                  className="ml-auto"
                  onClick={handleSend}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <RiLoader2Line className="animate-spin" />
                  ) : (
                    <RiSendPlane2Fill />
                  )}
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleUploadFile}
              className="hidden"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
