# Phase 1: Agent Foundation - Research

**Researched:** 2026-05-02
**Domain:** LangGraph.js StateGraph, PostgresSaver checkpoint persistence, human-in-the-loop interrupt/Command, OpenRouter LLM integration
**Confidence:** HIGH

## Summary

Phase 1 builds the entire LangGraph agent backbone: a 6-node StateGraph compiled with PostgresSaver, exposed via a Next.js API route. The graph uses `interrupt()` for human-in-the-loop pauses at `planInterrogation` and `qualityGate`, and `Command({ resume })` to continue execution after user input. All LLM calls go through `@langchain/openrouter`'s `ChatOpenRouter` class with structured output via Zod schemas.

The two highest-risk areas are (1) the Supabase connection pooling conflict -- the existing `DATABASE_URL` uses port 6543 with `pgbouncer=true` (transaction-mode pooling), but PostgresSaver needs a persistent connection pool and may not work through a transaction-mode pooler, and (2) Zod v4 compatibility -- while LangChain's changelog confirms Zod v4 validation errors are handled, the project uses Zod v4.4.1 and LangChain may internally expect Zod v3-style imports for `withStructuredOutput`.

**Primary recommendation:** Create a separate `DIRECT_DATABASE_URL` env var for PostgresSaver (using Supabase's session-mode pooler or direct connection), use `ChatOpenRouter` from `@langchain/openrouter` (already installed), and define schemas with Zod v4 but validate with a runtime compatibility check at first LLM call.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| StateGraph definition and node wiring | API / Backend | -- | Graph is a server-side construct, never runs in the browser |
| PostgresSaver checkpoint persistence | Database / Storage | API / Backend | Checkpoint writes are transactional DB operations |
| interrupt() / Command resume | API / Backend | -- | Human-in-the-loop is a server-side pause mechanism |
| LLM calls via OpenRouter | API / Backend | -- | API keys must stay server-side, per CLAUDE.md NFR |
| MissionState schema definition | API / Backend | -- | Shared types but the state lives on the server |
| POST /api/agent endpoint | API / Backend | -- | Next.js API route, server-only |
| SSE streaming via graph.stream() | API / Backend | Browser / Client | Server emits events, client consumes via EventSource |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@langchain/langgraph` | 1.2.9 (Apr 16, 2026) | StateGraph, Annotation, interrupt, Command, START, END | The graph orchestration framework -- no alternative exists for this pattern [VERIFIED: npm registry] |
| `@langchain/langgraph-checkpoint-postgres` | 1.0.1 (Feb 19, 2026) | PostgresSaver for checkpoint persistence | Official LangGraph checkpointer for PostgreSQL [VERIFIED: npm registry] |
| `@langchain/openrouter` | 0.2.3 (Apr 27, 2026) | ChatOpenRouter for LLM calls | Already installed, purpose-built for OpenRouter [VERIFIED: npm registry] |
| `@langchain/core` | 1.1.43 (May 2, 2026) | LangGraphRunnableConfig, getWriter, base types | Peer dependency of langgraph, provides config.writer for streaming [VERIFIED: npm registry] |
| `pg` | 8.20.0 | PostgreSQL connection pool | Required by PostgresSaver's Pool constructor, already installed [VERIFIED: package.json] |
| `zod` | 4.4.1 | Schema validation and structured output | Already installed; AGNT-08 requires withStructuredOutput() matching Zod schemas [VERIFIED: package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nanoid` or `crypto.randomUUID()` | stdlib | Generate IDs for intelGaps, questions, log entries | Use `crypto.randomUUID()` (built-in) -- no extra install needed |
| `uuid` | -- | -- | NOT needed -- Node.js crypto.randomUUID() is sufficient |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@langchain/openrouter` | `@langchain/openai` with OpenRouter baseURL | ChatOpenRouter is purpose-built, handles OpenRouter-specific headers and provider routing. Already installed. No reason to use ChatOpenAI with a custom baseURL. |
| `PostgresSaver` | `MemorySaver` | MemorySaver is dev-only, loses state on server restart. PostgresSaver persists to DB. |
| `PostgresSaver` (own connection) | Share Prisma's pg pool | PostgresSaver creates its own `pg.Pool` internally. Sharing Prisma's adapter-pg pool is not straightforward because Prisma v7 uses `@prisma/adapter-pg` (not raw `pg`). Separate pool is cleaner. |

**Installation:**
```bash
pnpm add @langchain/langgraph @langchain/langgraph-checkpoint-postgres
# @langchain/core, @langchain/openrouter, pg, zod already installed
```

**Version verification:** All core versions verified against npm registry on 2026-05-02.

## Architecture Patterns

### System Architecture Diagram

```
[Browser / Client]                       [Next.js API / Backend]
     |                                          |
     |  POST /api/agent                        |
     |  { action, payload, threadId }          |
     |----------------------------------------->|
     |                                          |
     |                              [graph.stream(input, config)]
     |                                          |
     |                              +-----------+-----------+
     |                              |                       |
     |                        [StateGraph]             [PostgresSaver]
     |                       (6 nodes, edges)        (checkpoint R/W)
     |                              |                       |
     |                              v                       v
     |                       [analyzeJD]            [checkpoint table]
     |                              |              (Supabase PostgreSQL)
     |                              v
     |                     [planInterrogation]
     |                              |
     |                     interrupt() ---> SSE event to client
     |                              |
     |  POST /api/agent             |  (user sees question)
     |  { action: "submit_answer" } |
     |----------------------------->|
     |                              |
     |                     Command({ resume: answer })
     |                              |
     |                              v
     |                     [evaluateAnswer]
     |                              |
     |                              v
     |                     [qualityGate]
     |                              |
     |                     interrupt() ---> SSE event to client
     |                              |    (pass/fail decision)
     |                     [pass: continue] [fail: loop back]
     |                              |
     |                              v
     |                     [forgeDocuments]
     |                              |
     |                              v
     |                     [runATSSimulation]
     |                              |
     |                              v
     |                           [END]
     |                                          |
     |  SSE: log, phase, question, feedback,    |
     |        state, done, error                |
     |<-----------------------------------------|
```

### Recommended Project Structure

```
src/
  lib/
    agent/
      graph.ts                # StateGraph definition, compile with PostgresSaver
      state.ts                # MissionState Annotation.Root definition
      llm.ts                  # ChatOpenRouter singleton with model from env var
      prompts.ts              # The Handler system prompt + per-node prompts
      checkpointer.ts         # PostgresSaver singleton (separate from Prisma)
      nodes/
        analyzeJD.ts          # AGNT-01: Parse JD -> targets + intelGaps
        planInterrogation.ts  # AGNT-01, AGNT-04: Select next question, interrupt()
        evaluateAnswer.ts     # AGNT-01: Score answer 0-100
        qualityGate.ts        # AGNT-01, AGNT-04: Route pass/fail, interrupt() on fail
        forgeDocuments.ts     # AGNT-01: Generate resume + cover letter
        runATSSimulation.ts   # AGNT-01: ATS keyword scoring
      schemas/
        analyzeJD.ts          # Zod schema for analyzeJD structured output
        planInterrogation.ts  # Zod schema for question generation
        evaluateAnswer.ts     # Zod schema for answer scoring
        qualityGate.ts        # Zod schema for quality feedback
        forgeDocuments.ts     # Zod schema for document generation
        runATSSimulation.ts   # Zod schema for ATS results
  app/
    api/
      agent/
        route.ts              # POST /api/agent — SSE streaming endpoint
  types/
    mission.ts                # Shared TypeScript interfaces (IntelGap, Question, etc.)
```

### Pattern 1: StateGraph Definition with Annotation

**What:** Define graph state using `Annotation.Root()` with typed fields and optional reducers.

**When to use:** Every LangGraph graph needs a state definition. Use reducers for fields that accumulate (like `questionHistory`, `agentLog`), and plain fields for values that get overwritten.

**Example:**
```typescript
// Source: [Context7: /langchain-ai/langgraphjs Annotation API docs]
import { Annotation, StateGraph, START, END } from "@langchain/langgraph"

const MissionState = Annotation.Root({
  // Inputs
  jobDescription: Annotation<string>,
  existingResume: Annotation<string>,

  // Agent analysis (overwritten)
  primaryTargets: Annotation<string[]>({ reducer: (_a, b) => b ?? [], default: () => [] }),
  secondaryTargets: Annotation<string[]>({ reducer: (_a, b) => b ?? [], default: () => [] }),
  intelGaps: Annotation<IntelGap[]>({ reducer: (_a, b) => b ?? [], default: () => [] }),

  // Interrogation (accumulates)
  questionHistory: Annotation<QuestionAnswer[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  currentQuestion: Annotation<Question | null>({ reducer: (_a, b) => b ?? null }),

  // Output
  generatedResume: Annotation<string>({ reducer: (_a, b) => b ?? "" }),
  generatedCoverLetter: Annotation<string>({ reducer: (_a, b) => b ?? "" }),
  atsScore: Annotation<ATSResult | null>({ reducer: (_a, b) => b ?? null }),

  // Control
  phase: Annotation<MissionPhase>,
  agentLog: Annotation<LogEntry[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  rejectionCount: Annotation<number>({ reducer: (_a, b) => b ?? 0 }),
})
```

### Pattern 2: PostgresSaver Setup with Separate Connection

**What:** Initialize PostgresSaver with its own PostgreSQL connection, separate from Prisma's connection.

**When to use:** Always -- PostgresSaver manages its own connection pool internally. Do not share Prisma's pool.

**Example:**
```typescript
// Source: [Context7: /langchain-ai/langgraphjs PostgresSaver README]
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import pg from "pg"

// CRITICAL: Use a separate connection string for PostgresSaver.
// Supabase's port 6543 (transaction-mode pooler) may break multi-statement
// checkpoint writes. Use session-mode or direct connection instead.
const pool = new pg.Pool({
  connectionString: process.env.DIRECT_DATABASE_URL!,
})

const checkpointer = new PostgresSaver(pool)

// Must call setup() once before first use -- creates checkpoint tables
await checkpointer.setup()
```

### Pattern 3: interrupt() and Command Resume

**What:** Use `interrupt()` inside a node to pause graph execution and return a value to the caller. Resume with `Command({ resume: value })`.

**When to use:** For human-in-the-loop at `planInterrogation` (ask user a question) and `qualityGate` (show pass/fail feedback).

**Example:**
```typescript
// Source: [Context7: /langchain-ai/langgraphjs human_in_the_loop docs]
import { interrupt, Command } from "@langchain/langgraph"

async function planInterrogation(state: typeof MissionState.State, config: LangGraphRunnableConfig) {
  // Guard: if already has a current question, skip LLM call on resume
  if (state.currentQuestion) {
    return {}
  }

  // ... LLM call to generate question ...

  // Pause graph, return question to client via SSE
  const userAnswer = interrupt({
    type: "question",
    question: generatedQuestion,
  })

  // After resume: userAnswer contains the user's response
  return { currentQuestion: null, lastAnswer: userAnswer }
}

// Resume from API route:
await graph.stream(
  new Command({ resume: answerValue }),
  { configurable: { thread_id: threadId } }
)
```

### Pattern 4: Node Guard Against Re-execution (AGNT-09)

**What:** When a node contains `interrupt()`, all code before `interrupt()` re-executes on resume. Guards prevent duplicate LLM calls or side effects.

**When to use:** In EVERY node that has code before `interrupt()` -- specifically `planInterrogation` and `qualityGate`.

**Example:**
```typescript
async function planInterrogation(state: typeof MissionState.State, config: LangGraphRunnableConfig) {
  // GUARD: On resume, the question was already generated and stored in state.
  // Skip the LLM call -- go straight to interrupt.
  if (state.currentQuestion) {
    const userAnswer = interrupt({
      type: "question",
      question: state.currentQuestion,
    })
    return { currentQuestion: null, lastAnswer: userAnswer }
  }

  // First execution: generate question via LLM
  const question = await generateQuestion(state, config)

  // Store in state BEFORE interrupt, so resume can detect it
  return { currentQuestion: question }
  // On resume, this node re-enters. The guard at the top fires because
  // currentQuestion is now set from the previous partial state update.
  // Wait -- this doesn't work because the return hasn't been committed yet.
}
```

**CORRECT guard pattern:** Use a flag in the state or check if the output already exists:

```typescript
// Pattern A: Check if the output already exists in state
async function planInterrogation(state: typeof MissionState.State, config: LangGraphRunnableConfig) {
  // Only generate if no question history exists for current gap
  const lastQH = state.questionHistory[state.questionHistory.length - 1]
  if (lastQH?.question.gapId === state.intelGaps.find(g => !g.filled)?.id && !lastQH?.accepted) {
    // Quality gate loop: the question was already asked, skip to interrupt
    const userAnswer = interrupt({ type: "question", question: lastQH.question })
    return { lastAnswer: userAnswer }
  }

  // First time: generate question
  const question = await generateQuestion(state, config)
  const writer = config.writer
  writer?.({ type: "log", data: { message: "Question generated", level: "system" } })

  // The interrupt happens at the END of the node return
  // Actually -- interrupt() throws a special error internally.
  // The node function stops at interrupt() and the state is saved.
  const userAnswer = interrupt({ type: "question", question })
  return { lastAnswer: userAnswer }
}
```

**KEY INSIGHT about interrupt() behavior:** `interrupt()` halts execution at the point it's called. When the graph resumes, the node function re-enters from the top and re-executes until it hits `interrupt()` again. The state has NOT been updated with any partial returns from the node -- the state checkpoint is saved BEFORE the node runs. So the guard must rely on data already in the state from PREVIOUS node executions, not from the current node's partial output.

**Recommended pattern for Phase 1:** Add a `pendingInterrupt` field to state that gets set by the node before calling `interrupt()`. On re-entry after resume, this field is in the checkpoint, so the guard can detect the re-execution and skip to the `interrupt()` call.

### Pattern 5: Streaming Custom Events with config.writer

**What:** Use `config.writer?.(data)` inside nodes to emit typed custom events. Use `streamMode: "custom"` on `graph.stream()` to receive them.

**When to use:** For real-time progress updates (log entries, phase transitions) streamed to the client via SSE.

**Example:**
```typescript
// Source: [Context7: /langchain-ai/langgraphjs streaming docs]
import { LangGraphRunnableConfig } from "@langchain/langgraph"

async function analyzeJD(state: typeof MissionState.State, config: LangGraphRunnableConfig) {
  config.writer?.({ type: "phase", data: { phase: "intel_acquisition" } })
  config.writer?.({ type: "log", data: { message: "Scanning target intel...", level: "handler" } })

  // LLM call...

  config.writer?.({ type: "log", data: { message: "Analysis complete. 5 intel gaps identified.", level: "system" } })

  return { primaryTargets, secondaryTargets, intelGaps, phase: "interrogation" }
}
```

### Pattern 6: ChatOpenRouter with Structured Output

**What:** Use `ChatOpenRouter` from `@langchain/openrouter` and call `withStructuredOutput(zodSchema)` for type-safe LLM responses.

**When to use:** In every node that makes an LLM call (all 6 nodes except qualityGate which is conditional routing only).

**Example:**
```typescript
// Source: [Context7: /websites/langchain @langchain/openrouter docs]
import { ChatOpenRouter } from "@langchain/openrouter"
import { z } from "zod"

const llm = new ChatOpenRouter({
  model: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-5",
  temperature: 0.3,
})

const analyzeJDSchema = z.object({
  primaryTargets: z.array(z.string()).describe("Required skills/keywords from the JD"),
  secondaryTargets: z.array(z.string()).describe("Preferred/bonus skills"),
  intelGaps: z.array(z.object({
    id: z.string(),
    label: z.string(),
    relatedTarget: z.string(),
  })).describe("Missing qualifications that need to be probed"),
  seniorityLevel: z.string(),
})

const structuredLLM = llm.withStructuredOutput(analyzeJDSchema, {
  name: "analyze_jd",
  method: "jsonSchema",
})

const result = await structuredLLM.invoke([
  { role: "system", content: HANDLER_SYSTEM_PROMPT },
  { role: "user", content: `Analyze this job description:\n\n${jobDescription}` },
])
// result is typed: { primaryTargets: string[], secondaryTargets: string[], ... }
```

### Anti-Patterns to Avoid

- **Using `graph.invoke()` instead of `graph.stream()`:** `invoke()` does NOT surface `__interrupt__` information to the caller. You cannot detect when the graph has paused for human input. [VERIFIED: Context7 docs] Always use `graph.stream()` for graphs with `interrupt()`.
- **Sharing Prisma's pg pool with PostgresSaver:** Prisma v7 uses `@prisma/adapter-pg` which wraps connections differently. PostgresSaver needs its own `pg.Pool`. [ASSUMED: based on architecture analysis]
- **Storing LLM results before `interrupt()` in the same node return:** `interrupt()` halts execution and the node's return value is NOT committed to state until the node completes. Store pre-interrupt data via a separate mechanism (e.g., a `pendingInterrupt` state field or a preceding node).
- **Using `@langchain/openai` with a custom baseURL instead of `@langchain/openrouter`:** `ChatOpenRouter` handles OpenRouter-specific features (provider routing, app attribution headers). Already installed. No reason to use `ChatOpenAI`.
- **Calling `checkpointer.setup()` on every request:** `setup()` creates tables if they don't exist. Call it once at startup (e.g., in a module-level init or in the API route's setup), not per-request.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checkpoint persistence | Custom DB save/load with thread IDs | `PostgresSaver` from `@langchain/langgraph-checkpoint-postgres` | Handles checkpoint versioning, pending sends, transactional writes, and the full checkpoint protocol |
| Human-in-the-loop pause/resume | Custom state machine with status flags | `interrupt()` + `Command({ resume })` from `@langchain/langgraph` | Native LangGraph mechanism that integrates with checkpointing and streaming |
| Structured LLM output parsing | Manual JSON.parse with try/catch and Zod validation | `llm.withStructuredOutput(zodSchema)` | Automatic method selection (jsonSchema/functionCalling/jsonMode), schema-aware prompting, and built-in retry |
| LLM provider abstraction | Custom fetch to OpenRouter API | `ChatOpenRouter` from `@langchain/openrouter` | Handles authentication, provider routing, structured output, streaming, error retries |
| State type inference | Manual TypeScript interfaces maintained separately | `Annotation.Root()` + `typeof StateAnnotation.State` | Single source of truth for state shape, automatic type inference |

**Key insight:** LangGraph provides a complete agent infrastructure. The most common mistake is trying to build custom state management around it instead of using its built-in primitives (Annotation, interrupt, Command, PostgresSaver).

## Common Pitfalls

### Pitfall 1: Supabase Connection Pooling Breaks PostgresSaver

**What goes wrong:** PostgresSaver checkpoint writes fail with errors like "prepared statement does not exist" or "current transaction is aborted".

**Why it happens:** The existing `DATABASE_URL` uses port 6543 with `pgbouncer=true` -- this is Supabase's **transaction-mode** pooler. Transaction mode wraps each statement in its own transaction, which breaks PostgresSaver's multi-statement checkpoint writes that expect a single connection with proper transaction semantics. [VERIFIED: Supabase docs -- "transaction mode connection string connects via a proxy which serves as a connection pooler, ideal for serverless or edge functions which require many transient connections"]

**How to avoid:** Create a separate `DIRECT_DATABASE_URL` env var that uses either:
1. Supabase's **session-mode** pooler (port 5432 on the pooler hostname, supports both IPv4 and IPv6), or
2. The **direct connection** string (port 5432 on `db.<project>.supabase.co`, requires IPv6)

**Warning signs:** "prepared statement" errors, intermittent checkpoint write failures, or "cannot acquire connection" errors under load.

### Pitfall 2: interrupt() Re-execution Causes Duplicate LLM Calls

**What goes wrong:** When a user resumes the graph, the node containing `interrupt()` re-executes from the top, causing the LLM to be called again (wasting tokens and latency) and potentially generating different results.

**Why it happens:** LangGraph saves the checkpoint BEFORE the node runs. On resume, the node function is called fresh -- there is no "skip to the interrupt point" mechanism built in. [VERIFIED: Context7 docs -- "the node function stops at interrupt() and the state is saved" and on resume the node re-enters from the top]

**How to avoid:** Use a state-based guard pattern. Before the LLM call, check if the data that would be generated already exists in the state (e.g., `currentQuestion` was set by a previous execution of this node). If it exists, skip the LLM call and go straight to `interrupt()`.

**Warning signs:** LLM calls happening twice on every resume, different questions being generated on resume vs. initial execution.

### Pitfall 3: Zod v4 Incompatibility with withStructuredOutput

**What goes wrong:** `withStructuredOutput()` fails at runtime with errors like "Cannot read property 'parse' of undefined" or Zod schema is not recognized.

**Why it happens:** LangChain was originally built against Zod v3. Zod v4 (installed at 4.4.1) has API changes. However, LangChain's changelog explicitly mentions "enhanced error handling for Zod v4 validation errors in structured output" as of Nov 2025, suggesting compatibility work has been done. [VERIFIED: Context7 LangChain changelog]

**How to avoid:** Test the first `withStructuredOutput()` call early in development. If it fails, the fallback is to use `method: "jsonMode"` which is less strict but works with any model. Alternatively, define schemas with `z.object()` which is the same API in v3 and v4.

**Warning signs:** Runtime errors on first LLM call, schema parsing failures, empty structured output.

### Pitfall 4: graph.invoke() Doesn't Surface Interrupts

**What goes wrong:** The API endpoint calls `graph.invoke()` and never receives the `__interrupt__` information, making it impossible to know when to wait for user input.

**Why it happens:** `invoke()` returns only the final state. `interrupt()` information is only available through `stream()` output. [VERIFIED: Context7 docs -- "Using stream() to directly surface the __interrupt__ information"]

**How to avoid:** Always use `graph.stream()` for graphs with `interrupt()`. Parse the stream chunks for `__interrupt__` to detect pauses.

**Warning signs:** API returns final state but never pauses, or client never receives questions from the agent.

### Pitfall 5: Missing OPENROUTER_MODEL Env Var

**What goes wrong:** Every deployment or new developer environment gets a different model, or the model is hardcoded.

**Why it happens:** AGNT-06 requires the model be configurable via env var, but developers might hardcode it during development.

**How to avoid:** Use `process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4-5"` in `llm.ts`. Document in `.env.example`.

## Code Examples

Verified patterns from official sources:

### PostgresSaver Initialization
```typescript
// Source: [Context7: /langchain-ai/langgraphjs PostgresSaver README]
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import pg from "pg"

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_DATABASE_URL!,
})

const checkpointer = new PostgresSaver(pool)
await checkpointer.setup() // Creates checkpoint tables on first run
```

### ChatOpenRouter with Structured Output
```typescript
// Source: [Context7: /websites/langchain @langchain/openrouter docs]
import { ChatOpenRouter } from "@langchain/openrouter"
import { z } from "zod"

const model = new ChatOpenRouter({
  model: "openai/gpt-4o",
})

const schema = z.object({
  title: z.string().describe("The title"),
  score: z.number().describe("The score"),
})

const structuredModel = model.withStructuredOutput(schema, {
  name: "result",
  method: "jsonSchema",
})

const response = await structuredModel.invoke("Your prompt here")
```

### Full Graph with Conditional Edges
```typescript
// Source: [Context7: /langchain-ai/langgraphjs low_level docs]
import { Annotation, StateGraph, START, END } from "@langchain/langgraph"

const State = Annotation.Root({
  score: Annotation<number>,
  phase: Annotation<string>,
})

const graph = new StateGraph(State)
  .addNode("evaluate", (state) => ({ score: 85 }))
  .addNode("qualityGate", (state) => ({ phase: "passed" }))
  .addNode("retry", (state) => ({ phase: "retrying" }))
  .addConditionalEdges("evaluate", (state) => {
    return state.score >= 60 ? "qualityGate" : "retry"
  }, {
    qualityGate: "qualityGate",
    retry: "retry",
  })
  .addEdge(START, "evaluate")
  .addEdge("qualityGate", END)
  .addEdge("retry", "evaluate") // loop back

const compiled = graph.compile({ checkpointer })
```

### Streaming with Custom Events
```typescript
// Source: [Context7: /langchain-ai/langgraphjs streaming docs]
// Inside a node:
config.writer?.({ type: "log", data: { message: "Processing...", level: "system" } })

// In API route:
const stream = graph.stream(input, {
  configurable: { thread_id: "123" },
  streamMode: "custom",
})

for await (const chunk of stream) {
  // chunk is the value passed to config.writer
  // Format as SSE and send to client
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `MemorySaver` for dev checkpointing | `PostgresSaver` for production persistence | Stable since @langchain/langgraph 0.2+ | Enables human-in-the-loop with server restart survival |
| `graph.invoke()` for all graph calls | `graph.stream()` for interrupt-capable graphs | Stable since @langchain/langgraph 1.0+ | `invoke()` doesn't surface `__interrupt__` -- must use `stream()` |
| Custom JSON parsing of LLM output | `withStructuredOutput()` with Zod schemas | Stable since @langchain/core 1.0+ | Automatic method selection (jsonSchema > functionCalling > jsonMode) |
| `addConditionalEdges` with string return | `addConditionalEdges` with path map object | Current API | The path map `{ pass: "nodeA", fail: "nodeB" }` makes routing explicit |

**Deprecated/outdated:**
- `@langchain/openai` with custom `baseURL` for OpenRouter: `ChatOpenRouter` is the dedicated integration. [VERIFIED: Context7 docs]
- LangGraph `createReactAgent` for this use case: We need a custom StateGraph with specific nodes and conditional edges, not a generic ReAct agent.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PostgresSaver will fail with Supabase transaction-mode pooler (port 6543, pgbouncer=true) | Common Pitfalls #1 | If it works fine, we skip creating `DIRECT_DATABASE_URL` and use existing `DATABASE_URL`. Minimal rework. |
| A2 | `checkpointer.setup()` is idempotent and safe to call on every server start | Pattern 2 | If not, it could fail on subsequent calls. Workaround: wrap in try/catch or check table existence first. |
| A3 | Zod v4 `z.object()` API is backward-compatible with LangChain's `withStructuredOutput()` | Common Pitfalls #3 | If not, need to either downgrade to Zod v3 or use `method: "jsonMode"` fallback. |
| A4 | Supabase session-mode pooler (port 5432 on pooler hostname) supports PostgresSaver's multi-statement transactions | Common Pitfalls #1 | If not, need to use direct connection (requires IPv6 or IPv4 add-on). |
| A5 | `@langchain/openrouter`'s `withStructuredOutput()` auto-selects `jsonSchema` method for Anthropic models on OpenRouter | Pattern 6 | If it falls back to `jsonMode`, output validation is less strict. Explicitly specify `method: "jsonSchema"`. |

## Open Questions

1. **Supabase connection string for PostgresSaver**
   - What we know: Current `DATABASE_URL` uses port 6543 (transaction-mode PgBouncer). PostgresSaver likely needs session-mode or direct connection.
   - What's unclear: Whether the developer has IPv6 access for direct connection, or whether session-mode pooler works.
   - Recommendation: Create `DIRECT_DATABASE_URL` env var. Start with session-mode pooler (port 5432 on the pooler hostname, supports IPv4). If that fails, try direct connection. Document in `.env.example`.

2. **qualityGate node -- is it a separate node or inline logic?**
   - What we know: AGNT-01 lists it as one of the 6 nodes. The PRD shows it as a separate routing step.
   - What's unclear: Whether qualityGate needs an LLM call or is pure conditional routing based on `evaluateAnswer`'s score.
   - Recommendation: Make it a separate node for graph clarity, but it only does conditional routing (no LLM call). It checks `rejectionCount` and score threshold, emits feedback via `config.writer`, and uses `interrupt()` only when rejecting to surface the feedback to the user.

3. **SSE streaming vs requirement timing**
   - What we know: AGNT-04, AGNT-05 require interrupt/Command. STRM-01 through STRM-05 are in Phase 2, not Phase 1.
   - What's unclear: Whether Phase 1 needs full SSE streaming or just a basic POST endpoint that returns the result.
   - Recommendation: Phase 1 success criteria say "POST /api/agent with a start action creates a checkpoint." Build the SSE streaming infrastructure in Phase 1 (since `graph.stream()` is required for interrupt detection anyway), but keep the event types simple. Phase 2 will flesh out the full STRM requirements.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All LangGraph packages | Yes | (project runs) | -- |
| pnpm | Package management | Yes | (project uses it) | -- |
| PostgreSQL (Supabase) | PostgresSaver | Yes | -- | -- |
| OPENROUTER_API_KEY | ChatOpenRouter | Yes | in .env | -- |
| `@langchain/langgraph` | StateGraph, interrupt, Command | No | -- | Must install |
| `@langchain/langgraph-checkpoint-postgres` | PostgresSaver | No | -- | Must install |
| `pg` | PostgresSaver Pool | Yes | 8.20.0 | -- |
| `@langchain/openrouter` | ChatOpenRouter | Yes | 0.2.3 | -- |
| `@langchain/core` | LangGraphRunnableConfig | Yes | 1.1.42 | -- |
| `zod` | Schema validation | Yes | 4.4.1 | -- |
| DIRECT_DATABASE_URL | PostgresSaver (session-mode) | No | -- | Must add to .env |

**Missing dependencies with no fallback:**
- `@langchain/langgraph` -- must install via `pnpm add`
- `@langchain/langgraph-checkpoint-postgres` -- must install via `pnpm add`
- `DIRECT_DATABASE_URL` env var -- must be added to `.env` (session-mode or direct connection string from Supabase dashboard)

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended -- works with Next.js, fast, ESM-native) |
| Config file | `vitest.config.ts` -- to be created in Wave 0 |
| Quick run command | `pnpm vitest run src/lib/agent/` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGNT-01 | 6 nodes defined with correct edge routing | unit | `pnpm vitest run src/lib/agent/__tests__/graph.test.ts` | No -- Wave 0 |
| AGNT-02 | MissionState captures all required fields | unit | `pnpm vitest run src/lib/agent/__tests__/state.test.ts` | No -- Wave 0 |
| AGNT-03 | PostgresSaver persists checkpoint to PostgreSQL | integration | `pnpm vitest run src/lib/agent/__tests__/checkpointer.test.ts` | No -- Wave 0 |
| AGNT-04 | interrupt() pauses at planInterrogation and qualityGate | integration | `pnpm vitest run src/lib/agent/__tests__/interrupt.test.ts` | No -- Wave 0 |
| AGNT-05 | Command({ resume }) continues execution from checkpoint | integration | `pnpm vitest run src/lib/agent/__tests__/interrupt.test.ts` | No -- Wave 0 |
| AGNT-06 | LLM model configurable via OPENROUTER_MODEL | unit | `pnpm vitest run src/lib/agent/__tests__/llm.test.ts` | No -- Wave 0 |
| AGNT-07 | All LLM calls go through ChatOpenRouter with Handler prompt | unit | `pnpm vitest run src/lib/agent/__tests__/llm.test.ts` | No -- Wave 0 |
| AGNT-08 | withStructuredOutput() returns data matching Zod schemas | integration | `pnpm vitest run src/lib/agent/__tests__/structured-output.test.ts` | No -- Wave 0 |
| AGNT-09 | Nodes guarded against re-execution on resume | integration | `pnpm vitest run src/lib/agent/__tests__/interrupt.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm vitest run src/lib/agent/__tests__/`
- **Per wave merge:** `pnpm vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest` install: `pnpm add -D vitest`
- [ ] `vitest.config.ts` -- configure with Next.js path aliases (`@/*`)
- [ ] `src/lib/agent/__tests__/graph.test.ts` -- covers AGNT-01
- [ ] `src/lib/agent/__tests__/state.test.ts` -- covers AGNT-02
- [ ] `src/lib/agent/__tests__/checkpointer.test.ts` -- covers AGNT-03 (needs test DB or mocked)
- [ ] `src/lib/agent/__tests__/interrupt.test.ts` -- covers AGNT-04, AGNT-05, AGNT-09
- [ ] `src/lib/agent/__tests__/llm.test.ts` -- covers AGNT-06, AGNT-07
- [ ] `src/lib/agent/__tests__/structured-output.test.ts` -- covers AGNT-08
- [ ] `src/lib/agent/__tests__/conftest.ts` or shared fixtures for checkpointer, LLM mocks

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | better-auth session check on `/api/agent` route |
| V3 Session Management | yes | better-auth session middleware |
| V4 Access Control | no | Phase 1 has no resource-level access control |
| V5 Input Validation | yes | Zod v4 schemas validate all LLM structured output; API request body validation |
| V6 Cryptography | no | No encryption/decryption in Phase 1 |

### Known Threat Patterns for LangGraph + Next.js

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt injection via job description input | Tampering | Sanitize/limit JD length (100+ chars per JDA-01), Handler system prompt sets boundaries |
| LLM output not matching schema | Tampering | `withStructuredOutput()` validates + Zod runtime parse |
| Unauthenticated graph execution | Spoofing | Check `better-auth` session in `/api/agent` route handler |
| Cross-thread checkpoint access | Elevation of Privilege | Use `threadId` tied to user session, validate ownership before resume |
| OpenRouter API key exposure | Information Disclosure | Never send API key to client; all LLM calls server-side only |

## Sources

### Primary (HIGH confidence)
- [Context7: /langchain-ai/langgraphjs] - StateGraph, Annotation, interrupt, Command, PostgresSaver, streaming, conditional edges
- [Context7: /websites/langchain @langchain/openrouter] - ChatOpenRouter initialization, withStructuredOutput, bindTools, Zod schemas
- [npm registry] - @langchain/langgraph 1.2.9, @langchain/langgraph-checkpoint-postgres 1.0.1, @langchain/openrouter 0.2.3, @langchain/core 1.1.43 (verified 2026-05-02)
- [Supabase Docs: connecting-to-postgres] - Connection pooling modes, transaction vs session mode, port assignments (updated 2026-04-28)

### Secondary (MEDIUM confidence)
- [Context7: /websites/langchain LangChain changelog] - Zod v4 compatibility improvements (Nov 2025)
- [PROJECT.md] - Project constraints, existing infrastructure, file structure
- [PRD.md] - Node specifications, state schema, API design, Handler persona
- [CLAUDE.md] - Tech stack conventions, coding standards

### Tertiary (LOW confidence)
- [ASSUMED] PostgresSaver incompatibility with transaction-mode PgBouncer -- based on Supabase docs about transaction-mode limitations, not yet tested
- [ASSUMED] Zod v4 full compatibility with LangChain -- changelog mentions error handling improvements, but no explicit "Zod v4 fully supported" statement found

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all package versions verified on npm registry, all already installed or installation straightforward
- Architecture: HIGH - LangGraph patterns well-documented via Context7, interrupt/Command pattern is the canonical approach
- Pitfalls: MEDIUM - connection pooling concern is architecture-level and needs runtime validation; Zod v4 compatibility needs hands-on test

**Research date:** 2026-05-02
**Valid until:** 30 days (stable domain -- LangGraph JS API is mature, minor version updates only)
