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

## graphify (MANDATORY for codebase exploration)

This project has a graphify knowledge graph at graphify-out/. **Graphify is the FIRST tool for ALL codebase exploration.** Do NOT use grep, find, Glob, or sequential file reads to explore the codebase without checking graphify first.

Rules:
- **MANDATORY:** Before ANY codebase exploration (finding files, grepping symbols, understanding architecture, locating where X is defined, searching for patterns), check if `graphify-out/GRAPH_REPORT.md` exists. If it does, use graphify (`graphify query`, `graphify path`, `graphify explain`) as the primary exploration tool.
- If `graphify-out/GRAPH_REPORT.md` exists: read it for god nodes and community structure, then use graphify commands to navigate. Only fall back to grep/find/Glob when graphify cannot answer the question (e.g. exact string matching in a specific file).
- If `graphify-out/` does NOT exist: **STOP and ASK the user** — "graphify-out/ not found. Should I explore via paths you provide, or spawn haiku agents in parallel to explore the codebase?" Do NOT silently grep/find your way through the codebase.
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
