import { headers } from "next/headers"
import "server-only"

import { auth } from "@/lib/auth"

import { Unauthorized } from "./errors"

export const getUserSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    throw new Unauthorized()
  }

  return session
}
