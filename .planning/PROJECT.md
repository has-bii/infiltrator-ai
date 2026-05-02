# The Infiltrator — Application War Room

## What This Is

Agentic, narrative-driven job application assistant integrated into an existing Next.js app. An AI agent called "The Handler" guides users through a spy-themed workflow — intel gathering (job description analysis), interrogation (dynamic Q&A to fill gaps), document forgery (resume + cover letter generation), and stress testing (ATS simulation). Users download ATS-optimized application materials.

## Core Value

Users get a targeted, ATS-optimized resume and cover letter through an interactive AI-guided process that dynamically adapts questions based on their actual experience gaps.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Dashboard integration via NewMissionCard on existing dashboard page
- [ ] Full-screen `/mission` route with terminal-style UI (no sidebar)
- [ ] LangGraph agent with 6 nodes: analyzeJD, planInterrogation, evaluateAnswer, qualityGate, forgeDocuments, runATSSimulation
- [ ] Postgres checkpointer for LangGraph agent state persistence
- [ ] Dynamic question types (LONG_TEXT, MULTIPLE_CHOICE, SCENARIO) based on intel gaps
- [ ] Quality gate with rejection loops (score < 60 = reject, max 3 rejections per question)
- [ ] Resume generation in Markdown from operative profile + job targets
- [ ] Cover letter generation in Markdown (3-paragraph format)
- [ ] ATS simulation with keyword hit/miss scoring and verdict
- [ ] PDF export for resume via @react-pdf/renderer
- [ ] DOCX export for cover letter via docx library
- [ ] Server-Sent Events streaming for real-time agent updates
- [ ] The Handler persona throughout — no generic AI language
- [ ] Character-by-character streaming Handler messages (15-20ms interval)
- [ ] Auth protection on `/mission` route (existing better-auth session)

### Out of Scope

- Saving mission history to database — PRD V1 constraint, checkpoint table only for active sessions
- Multiple resume versions per mission — single forge per mission
- Real ATS system integration — simulation only
- Mobile layout — tablet and above (≥768px)
- Internationalization — English only
- OAuth/social login — existing email+password auth sufficient

## Context

**Existing infrastructure:**
- Next.js 16 app with App Router, React 19, React Compiler
- better-auth with email+password (server: `src/lib/auth.ts`, client: `src/lib/auth-client.ts`)
- Prisma v7 with PostgreSQL (Supabase), auth-only schema (4 models: User, Session, Account, Verification)
- TanStack Query for data fetching, React Form for form state
- 18 shadcn/ui components installed (missing: Textarea, RadioGroup, Badge, Progress)
- OpenRouter configured: `@langchain/openrouter` + `@openrouter/sdk` installed, API key in .env
- Sidebar shell with "Infiltrator AI / Beta" branding, theme toggle, user dropdown
- Dashboard page is empty — ready for NewMissionCard insertion
- Auth middleware (`src/proxy.ts`) protects `/auth/*` and `/dashboard/*` routes

**Dependencies to install:** @langchain/langgraph, zustand, framer-motion, @react-pdf/renderer, docx
**shadcn components to add:** textarea, radio-group, badge, progress

## Constraints

- **Tech Stack:** Next.js 16, React 19, LangGraph.js, OpenRouter, shadcn/ui, Tailwind v4, Zustand, Prisma v7
- **LLM SDK:** @langchain/openrouter (already installed, purpose-built for OpenRouter)
- **Model:** Configurable via env var (default: anthropic/claude-sonnet-4-5)
- **Auth:** All `/mission` routes require existing better-auth session — update proxy.ts
- **API Keys:** OPENROUTER_API_KEY and NEXT_PUBLIC_APP_URL already in .env
- **No DB schema changes:** No mission history tables in V1, only checkpoint table for LangGraph persistence
- **Existing routes:** Do not modify login/register/account pages. Only insert NewMissionCard into dashboard.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LangGraph interrupts + Postgres checkpointer | Native agent loop with server-side state persistence, survives server restarts | — Pending |
| @langchain/openrouter SDK | Already installed, purpose-built for OpenRouter, less config | — Pending |
| Configurable model via env var | Easy to swap models without code changes | — Pending |
| No mission history in V1 | PRD scope constraint — ephemeral missions, checkpoint table only for active sessions | — Pending |
| Zustand for UI state + LangGraph checkpointer for agent state | Zustand manages client-side phase/input state; checkpointer manages server-side agent execution state | — Pending |

---

*Last updated: 2026-05-02 after initialization*
