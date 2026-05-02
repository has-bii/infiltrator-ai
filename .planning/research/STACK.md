# Stack Research

**Domain:** Agentic AI job application assistant (LangGraph.js + OpenRouter + Next.js)
**Researched:** 2026-05-02
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | 16.2.4 (installed) | App framework | Already installed. App Router supports streaming API routes natively via `ReadableStream`. All LLM calls go through server-side API routes, keeping API keys off the client. |
| **React** | 19.2.4 (installed) | UI rendering | Already installed with React Compiler (`babel-plugin-react-compiler`). Mission UI components are render-once, stream-driven, so the compiler provides zero-cost memoization automatically. |
| **@langchain/langgraph** | ^1.2.9 | Agent orchestration | The canonical JS library for building stateful, graph-based agents. Supports `interrupt()` for human-in-the-loop (pause graph execution, wait for user input, resume with `Command({ resume: value })`), `PostgresSaver` for durable state persistence across server restarts, and multi-mode streaming (`updates`, `custom`, `tools`). This is the only JS agent framework with native interrupt-based human-in-the-loop and a Postgres checkpointer designed for LangGraph's internal state format. |
| **@langchain/langgraph-checkpoint-postgres** | ^1.0.1 | Agent state persistence | Production checkpointer backed by PostgreSQL. Uses `PostgresSaver.fromConnString(DATABASE_URL)` -- no ORM needed. Requires one-time `checkpointer.setup()` call to create checkpoint tables. The graph persists its full execution state (including interrupt position) to Postgres, so if the server restarts mid-interrogation, the user can resume from where they left off via `thread_id`. |
| **@langchain/openrouter** | ^0.2.3 (installed) | LLM provider adapter | Already installed. Purpose-built adapter for OpenRouter's OpenAI-compatible API. No need to use `@langchain/openai` with a custom `baseURL` -- `@langchain/openrouter` handles OpenRouter-specific headers (`HTTP-Referer`, `X-Title`) natively. Lower config surface, fewer things to break. |
| **@langchain/core** | ^1.1.42 (installed) | LangChain primitives | Already installed. Peer dependency of all `@langchain/*` packages. Provides `MessagesValue`, `tool()`, `LangGraphRunnableConfig`, and the `config.writer()` API for custom streaming from nodes. |
| **Zustand** | ^5.0.12 | Client-side UI state | Lightweight state manager for the mission UI. Holds the client-side `MissionState` (phase, logs, current question, answers, generated documents) in memory. Does NOT duplicate the LangGraph checkpoint -- the Zustand store is the UI's view model, while the Postgres checkpointer is the agent's execution state. Separation of concerns: Zustand manages rendering; LangGraph manages agent logic. |
| **PostgreSQL** | Supabase (existing) | Database | Already provisioned. Powers both Prisma (auth tables) and the Postgres checkpointer (agent checkpoint tables). The checkpointer creates its own tables via `setup()` -- no Prisma schema changes needed. Same `DATABASE_URL` works for both. |

### Document Generation

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **@react-pdf/renderer** | ^4.5.1 | PDF generation | Server-side PDF generation via `renderToBuffer()`. Build resume as a React component tree (`Document` > `Page` > `View`/`Text`), render to a Buffer, return as binary HTTP response. Supports flexbox layout, custom fonts, and programmatic styling -- ideal for generating structured, ATS-optimized resumes. Server-side only (Next.js API route). |
| **docx** | ^9.6.1 | DOCX generation | Programmatic `.docx` file creation with a declarative API. Uses `Document`, `Paragraph`, `TextRun`, `HeadingLevel` to build cover letters. Generate Buffer, return as binary HTTP response. Supports headers, paragraphs, bold/italic, and bullet lists. Works in Node.js server-side. |

### UI & Animation

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **framer-motion** | ^12.38.0 | Animations | Phase transitions, progress bar animations, input state feedback (red ring on rejection, green flash on acceptance), skeleton loading states, and the briefing screen background effects. Specifically needed for `AnimatePresence` (phase mount/unmount), `motion.div` (layout animations), and `useMotionValue` (ATS score counter animation from 0 to final score over 2.5s). |
| **shadcn/ui** | Existing (radix-lyra style) | Component library | Already installed with 18 components. Need to add: `textarea` (interrogation input), `radio-group` (multiple choice), `badge` (keyword hits/misses, verdict), `progress` (phase indicator, ATS score). Terminal styling applied via `className` overrides on top of shadcn primitives. |
| **Tailwind CSS** | v4 (installed) | Styling | Already configured (CSS-only, no `tailwind.config.ts`). All terminal styling (monospace fonts, scan-line effects, dark backgrounds) implemented via Tailwind utility classes. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@langchain/react** | ^0.3.5 | LangGraph React integration | Provides `useStream` hook for consuming LangGraph streams in React components. **However:** For this project, do NOT use `useStream` -- it requires a separate LangGraph deployment server (LangGraph Platform / Cloud). Instead, stream from a Next.js API route using `graph.stream()` + `TransformStream` -> SSE, and consume via `EventSource` or `fetch` with `ReadableStream` in Zustand actions. This keeps the architecture self-contained within the Next.js app. Install only if migrating to LangGraph Platform later. |
| **Zod** | v4 (installed) | Schema validation | Already installed (`^4.4.1`). Used for LangGraph state schema definition (with `StateSchema`), API request/response validation, and LLM output parsing. LangGraph's `StateSchema` accepts Zod schemas natively. |
| **TanStack Query** | ^5.100.6 (installed) | Server state | Already installed. Not the primary data fetcher for the mission flow (streaming via SSE + Zustand), but useful for any non-streaming API calls (e.g., export endpoint status polling, future dashboard mission list). |

## Installation

```bash
# Core agent packages (new)
pnpm add @langchain/langgraph@^1.2.9 @langchain/langgraph-checkpoint-postgres@^1.0.1

# Document generation (new)
pnpm add @react-pdf/renderer@^4.5.1 docx@^9.6.1

# UI state & animation (new)
pnpm add zustand@^5.0.12 framer-motion@^12.38.0

# shadcn components (new)
pnpm dlx shadcn@latest add textarea radio-group badge progress
```

## Key Integration Patterns

### 1. LangGraph Agent with Interrupts (Human-in-the-Loop)

Use the `interrupt()` function inside nodes to pause graph execution and surface a question to the user. The graph is compiled with a `PostgresSaver` checkpointer, which persists the full execution state at the interrupt point.

```typescript
import { interrupt, Command } from "@langchain/langgraph"

// Inside a node -- pauses graph, returns payload to caller
const planInterrogation = (state: MissionState) => {
  const question = selectNextQuestion(state.intelGaps, state.questionHistory)
  const answer = interrupt({ type: "question", question })  // pauses here
  return { questionHistory: [...state.questionHistory, { question, answer }] }
}

// Resume after user answers -- Command({ resume }) unblocks the interrupt()
const result = await graph.invoke(new Command({ resume: userAnswer }), {
  configurable: { thread_id: missionId }
})
```

**Pattern for this project:**
- `planInterrogation` node calls `interrupt()` with the question payload
- Next.js API route returns the interrupt payload to the client as an SSE event
- User submits answer via UI
- Client sends `POST /api/agent` with `{ action: "submit_answer", payload: { answer } }`
- API route calls `graph.invoke(new Command({ resume: answer }), config)`
- Graph resumes execution, runs `evaluateAnswer` -> `qualityGate` -> next `planInterrogation` or `forgeDocuments`

### 2. Postgres Checkpointer Setup

```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!)

// Call once (e.g., in a migration script or startup) to create checkpoint tables
// await checkpointer.setup()

const graph = new StateGraph(MissionState)
  .addNode("analyzeJD", analyzeJD)
  .addNode("planInterrogation", planInterrogation)
  // ... other nodes
  .addEdge(START, "analyzeJD")
  .compile({ checkpointer })
```

**Important:** `PostgresSaver.fromConnString()` uses the `pg` driver directly (peer dep), NOT Prisma. This is by design -- the checkpointer needs raw Postgres access for its internal table format. The `pg` package is already installed (`^8.20.0`). The checkpointer creates its own tables (`checkpoints`, `checkpoint_writes`, `checkpoint_blobs`) via `setup()` -- no Prisma schema migration needed.

### 3. SSE Streaming from Next.js API Route to Client

The PRD specifies streaming LangGraph execution to the client via Server-Sent Events. The pattern:

**Server side (Next.js API route):**
```typescript
// app/api/agent/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  const { action, payload, threadId } = body

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Run graph in background, write SSE events to stream
  ;(async () => {
    const config = {
      configurable: { thread_id: threadId }
    }

    let input
    if (action === "submit_answer") {
      input = new Command({ resume: payload.answer })
    } else {
      input = { jobDescription: payload.jobDescription }
    }

    for await (const chunk of await graph.stream(input, {
      ...config,
      streamMode: "updates"
    })) {
      await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
    }

    await writer.write(encoder.encode("data: {\"type\":\"done\"}\n\n"))
    await writer.close()
  })()

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  })
}
```

**Client side (Zustand store action):**
```typescript
// lib/store/useMissionStore.ts
submitAnswer: async (answer: string) => {
  const response = await fetch("/api/agent", {
    method: "POST",
    body: JSON.stringify({ action: "submit_answer", payload: { answer }, threadId: get().threadId })
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const event = JSON.parse(decoder.decode(value).replace("data: ", ""))
    // Dispatch to Zustand state based on event.type
  }
}
```

### 4. Custom Streaming with `config.writer()`

For streaming intermediate progress (e.g., "Analyzing targets...", "Scanning for keywords...") to the client during long-running nodes, use `streamMode: "custom"` alongside `"updates"`:

```typescript
// Inside a node
const forgeDocuments = async (state: MissionState, config: LangGraphRunnableConfig) => {
  config.writer?.({ type: "log", data: { level: "system", message: "Forging operative dossier..." } })
  const resume = await llm.invoke(resumePrompt)
  config.writer?.({ type: "log", data: { level: "system", message: "Resume structure generated." } })
  // ...
}
```

Use `streamMode: ["updates", "custom"]` to receive both node output updates and custom writer events.

### 5. PDF Generation (Server-Side)

```typescript
// lib/export/generatePDF.ts
import { renderToBuffer } from "@react-pdf/renderer"
import ResumeDocument from "./ResumeDocument"

export async function generateResumePDF(resume: ResumeData): Promise<Buffer> {
  return await renderToBuffer(<ResumeDocument data={resume} />)
}
```

The `ResumeDocument` is a React component using `@react-pdf/renderer` primitives (`Document`, `Page`, `View`, `Text`, `StyleSheet`). Returned as a Buffer from the API route with `Content-Type: application/pdf`.

### 6. DOCX Generation (Server-Side)

```typescript
// lib/export/generateDOCX.ts
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx"

export async function generateCoverLetterDOCX(data: CoverLetterData): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: data.operativeName, bold: true, size: 28 })],
          heading: HeadingLevel.TITLE
        }),
        new Paragraph({ children: [new TextRun(data.paragraph1)] }),
        new Paragraph({ children: [new TextRun(data.paragraph2)] }),
        new Paragraph({ children: [new TextRun(data.paragraph3)] }),
      ]
    }]
  })
  return await Packer.toBuffer(doc)
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **@langchain/openrouter** (installed) | **@langchain/openai** with custom `baseURL` | If `@langchain/openrouter` has a bug or missing feature. The PRD originally suggested `@langchain/openai`, but `@langchain/openrouter` is purpose-built and already installed -- fewer moving parts. |
| **PostgresSaver** (from `@langchain/langgraph-checkpoint-postgres`) | **MemorySaver** (built-in) | MemorySaver is for development/testing only -- data lost on server restart. PostgresSaver is required for production. Since Supabase Postgres is already provisioned, there is no cost to using it. |
| **Custom SSE via TransformStream** | **@langchain/react `useStream`** | Only if deploying to LangGraph Platform/Cloud. `useStream` requires a separate LangGraph server at a separate URL. For a self-contained Next.js app, custom SSE is simpler and avoids an external dependency. |
| **Zustand** | **React Context + useReducer** | Zustand is 1KB, has no provider wrapper, and supports `subscribe` for external integrations. React Context causes unnecessary re-renders on large state objects (like `MissionState`). |
| **@react-pdf/renderer** | **puppeteer + HTML-to-PDF** | Puppeteer spawns a headless Chrome process -- heavyweight, slow (~3-5s cold start), and requires server resources. `@react-pdf/renderer` generates PDFs programmatically in ~500ms with no browser dependency. |
| **docx** | **markdown-docx** | `markdown-docx` converts Markdown directly to DOCX, which sounds convenient. However, it provides less control over formatting (headings, fonts, spacing) and the library is less maintained (v0.x, fewer downloads). `docx` (v9.6.1) is the standard with full API control. |
| **framer-motion** | **CSS animations only** | CSS animations cannot do the ATS score counter (numeric interpolation from 0 to N over 2.5s), layout animations for phase transitions, or spring physics for input feedback. framer-motion is the React animation standard. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Vercel AI SDK (`ai` package)** | Designed for simple chat streaming, not stateful graph-based agents with interrupts. Cannot express the quality-gate loop, conditional routing, or checkpoint-based persistence. Wrapping it would add an abstraction layer that fights against LangGraph's design. | LangGraph.js `graph.stream()` + custom SSE |
| **LangGraph Platform / Cloud deployment** | Overkill for a single-agent feature within a Next.js app. Requires a separate deployment, separate server, and `@langchain/react`'s `useStream` hook. Adds infrastructure complexity for no benefit when the graph runs in-process on the same Next.js server. | Self-contained: LangGraph in Next.js API route |
| **Prisma for checkpoint tables** | The Postgres checkpointer manages its own tables via `setup()`. Trying to model checkpoint data in Prisma would fight the checkpointer's internal schema (binary blobs, write-ahead logs) and break on updates. Let the checkpointer own its tables. | `PostgresSaver.fromConnString(DATABASE_URL)` directly |
| **@langchain/langgraph-checkpoint-postgres/store** (PostgresStore) | PostgresStore is for long-term memory (store/retrieve arbitrary key-value data across threads). This project does not need cross-thread memory -- each mission is an isolated thread. V1 has no mission history feature. | PostgresSaver (checkpointer) only |
| **React Query for mission streaming** | React Query is designed for request/response patterns with caching. SSE streaming is a persistent connection with event-by-event updates. Forcing streaming into React Query requires awkward workarounds (custom `useQuery` with `fetch` + `ReadableStream`). | Zustand actions with `fetch` + `ReadableStream` reader |
| **`@langchain/openai`** | Would work (OpenRouter is OpenAI-compatible), but requires manual `configuration.baseURL` and custom headers setup. `@langchain/openrouter` is already installed and handles this natively. | `@langchain/openrouter` (installed) |
| **Puppeteer / Playwright for PDF** | Spawns a full browser process. Slow, memory-heavy, requires Docker on serverless platforms. Totally unnecessary when `@react-pdf/renderer` generates PDFs programmatically. | `@react-pdf/renderer` |

## Stack Patterns by Variant

**If migrating to LangGraph Platform later:**
- Install `@langchain/react` and use `useStream` hook instead of custom SSE
- Deploy graph as a separate service via LangGraph Platform
- The graph definition stays the same -- only the deployment and client consumption change

**If adding mission history (V2):**
- Add Prisma models for `Mission` and `MissionEvent`
- Keep the PostgresSaver for agent execution state (separate concern)
- Use Prisma for queryable mission metadata (list past missions, show summaries)
- The checkpointer is not a query store -- it stores serialized graph state, not user-facing data

**If switching from OpenRouter to Anthropic/Groq/OpenAI directly:**
- Replace `@langchain/openrouter` with the corresponding `@langchain/anthropic`, `@langchain/groq`, or `@langchain/openai` package
- The `ChatOpenAI` / `ChatAnthropic` interface is standardized via `@langchain/core`
- Node implementations do not change -- only the `llm` instance in `lib/agent/llm.ts`

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@langchain/langgraph@^1.2.9` | `@langchain/core@^1.1.42` | Peer dependency satisfied. Already installed. |
| `@langchain/langgraph@^1.2.9` | `@langchain/langgraph-checkpoint@^1.0.1` | Auto-installed as dependency of langgraph. |
| `@langchain/langgraph-checkpoint-postgres@^1.0.1` | `pg@^8.12.0` | Peer dependency. Already installed (`pg@^8.20.0`). |
| `@langchain/langgraph-checkpoint-postgres@^1.0.1` | `@langchain/core@^1.0.1` | Peer dependency. Already installed. |
| `@langchain/openrouter@^0.2.3` | `@langchain/core@^1.1.42` | Peer dependency satisfied. Already installed. |
| `@react-pdf/renderer@^4.5.1` | React 19 | Confirmed compatible. |
| `docx@^9.6.1` | Node.js 20+ | No React dependency -- pure JS, server-side only. |
| `zustand@^5.0.12` | React 19 | Confirmed compatible. No breaking changes from v4 to v5 API. |
| `framer-motion@^12.38.0` | React 19 | Confirmed compatible. `motion` components work with React 19. |
| `Zod v4` (`^4.4.1`, installed) | `@langchain/langgraph` | LangGraph `StateSchema` accepts Zod v4 schemas. Use `z.object()` directly with `StateSchema`. The `.register(registry, ...)` pattern is for advanced use with reducers -- most fields can use plain Zod types (last-write-wins). |

## State Schema Definition Pattern

LangGraph.js v1.x supports multiple state schema patterns. For this project, use `StateSchema` with Zod:

```typescript
import { StateSchema, ReducedValue } from "@langchain/langgraph"
import * as z from "zod"

const MissionState = new StateSchema({
  jobDescription: z.string().default(""),
  existingResume: z.string().default(""),
  primaryTargets: z.array(z.string()).default(() => []),
  secondaryTargets: z.array(z.string()).default(() => []),
  intelGaps: z.array(gapSchema).default(() => []),
  currentQuestion: questionSchema.nullable().default(null),
  questionHistory: new ReducedValue(
    z.array(qaSchema).default(() => []),
    { inputSchema: qaSchema, reducer: (curr, next) => [...curr, next] }
  ),
  rejectionCount: z.number().default(0),
  operativeProfile: profileSchema.nullable().default(null),
  generatedResume: z.string().default(""),
  generatedCoverLetter: z.string().default(""),
  atsScore: atsResultSchema.nullable().default(null),
  phase: z.enum(["briefing", "intel_acquisition", /* ... */]).default("briefing"),
  agentLog: new ReducedValue(
    z.array(logSchema).default(() => []),
    { inputSchema: logSchema, reducer: (curr, next) => [...curr, next] }
  ),
})
```

`StateSchema` is the recommended pattern for LangGraph v1.x -- it is cleaner than `Annotation.Root` (legacy) and does not require the `.register()` pattern (Zod v4 advanced). Fields without a `ReducedValue` use last-write-wins semantics (the latest node return value wins).

## Sources

- **Context7: `/websites/langchain_oss_javascript_langgraph`** -- interrupts, human-in-the-loop, PostgresSaver, streaming (custom, updates, tools), StateSchema, Command routing. HIGH confidence.
- **Context7: `/diegomura/react-pdf`** -- server-side PDF generation with `renderToBuffer()`, `Document`/`Page`/`Text` component API. HIGH confidence.
- **Context7: `/dolanmiu/docx`** -- DOCX generation with `Document`, `Paragraph`, `TextRun`, `Packer.toBuffer()`. HIGH confidence.
- **npm registry** -- verified current versions of all packages (2026-05-02). HIGH confidence.
- **PRD.md** -- project constraints, existing dependencies, architecture decisions. HIGH confidence.

---
*Stack research for: The Infiltrator -- Agentic AI Job Application Assistant*
*Researched: 2026-05-02*
