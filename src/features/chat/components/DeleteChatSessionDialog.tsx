import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useDeleteChatSessionMutation } from "../mutations/useDeleteChatSessionMutation"

type Props = {
  sessionId: string | null
}

export function DeleteChatSessionDialog({ sessionId }: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useDeleteChatSessionMutation()

  const handleDelete = async () => {
    if (!sessionId || mutation.isPending) return

    await mutation.mutateAsync(sessionId, {
      onSuccess: () => {
        setOpen(false)
      },
    })
  }

  const handleClose = () => {
    if (mutation.isPending) return
    setOpen(false)
  }

  useEffect(() => {
    if (sessionId) setOpen(true)
  }, [sessionId])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete this chat session and remove
            its messages from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={mutation.isPending} variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={mutation.isPending} onClick={handleDelete}>
            {mutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
