import { Skeleton } from "@/components/ui/skeleton"

export default function ChatPageHeaderSkeleton() {
  return (
    <header className="flex h-14 items-center border-b px-6">
      <Skeleton className="h-8 w-md" />
    </header>
  )
}
