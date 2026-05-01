import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { auth } from "./lib/auth"

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  const { pathname } = request.nextUrl

  if (session && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!session && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/auth/:path*", "/dashboard/:path*"],
}
