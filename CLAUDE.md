# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Framework:** Next.js 16 (App Router) with React 19 and React Compiler (`babel-plugin-react-compiler`)
- **Styling:** Tailwind CSS v4 (CSS-only config, no `tailwind.config.ts`) with shadcn/ui (`radix-lyra` style, `@remixicon/react` icons)
- **Database:** PostgreSQL via Prisma v7 with `@prisma/adapter-pg` driver adapter. Client generated to `src/generated/prisma/` (not `node_modules`)
- **Auth:** better-auth — email+password enabled. Server config in `src/lib/auth.ts`, client in `src/lib/auth-client.ts`, API route at `src/app/api/auth/[...all]/route.ts`
- **Validation:** Zod v4
- **Package manager:** pnpm

## Commands

```bash
pnpm dev          # Dev server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm format       # Prettier (write)
npx prisma generate   # Regenerate Prisma client to src/generated/prisma
npx prisma migrate dev # Run migrations
npx prisma db push     # Push schema without migration
```

## Architecture

- **Path alias:** `@/*` → `./src/*`
- **Prisma singleton:** `src/lib/prisma.ts` — caches on `global` in dev to prevent hot-reload connection leaks
- **Auth wiring:** `src/lib/auth.ts` exports `auth` (server), `src/lib/auth-client.ts` exports client (uses `NEXT_PUBLIC_API_URL`). API catch-all route delegates to `toNextJsHandler(auth)`
- **Prisma config:** `prisma.config.ts` loads `DATABASE_URL` via dotenv. Schema in `prisma/schema.prisma`. Tables use `@@map` for snake_case names.
- **UI utilities:** `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

## Conventions

- **No semicolons** (Prettier enforces)
- **Print width:** 100 chars
- **Import order:** `@/*` paths first, then relative paths (enforced by `@trivago/prettier-plugin-sort-imports`)
- **Fonts:** Geist Sans, Geist Mono, JetBrains Mono. Default body font is `font-mono`.
- **Components:** shadcn/ui components go in `src/components/ui/` (configured in `components.json`)
- **Dark mode:** supported via `.dark` class variant in CSS
