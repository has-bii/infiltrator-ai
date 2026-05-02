# Architecture Research

**Domain:** LangGraph.js agentic workflow in Next.js 16 App Router
**Researched:** 2026-05-02
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
+---------------------------------------------------------------------+
|                         CLIENT (Browser)                             |
+---------------------------------------------------------------------+
|  +------------------------+  +----------------------------------+    |
|  |  Zustand MissionStore  |  |  Mission UI (Phase Router)       |    |
|  |  - missionState        |  |  - MissionController.tsx         |    |
|  |  - isStreaming         |  |  - phases/*.tsx                  |    |
|  |  - threadId            |  |  - documents/*.tsx               |    |
|  |  - actions             |  |  - ui/*.tsx                      |    |
|  +-----------+------------+  +----------------------------------+    |
|              | SSE stream consumer  |  User input dispatcher          |
+--------------|----------------------------------------------------+
               | POST /api/agent { action, payload, threadId }
               | EventSource stream response
               v
+---------------------------------------------------------------------+
|                     NEXT.JS APP ROUTER (Server)                     |
+---------------------------------------------------------------------+
|  +---------------------------+  +--------------------------------+  |
|  |  app/api/agent/route.ts   |  |  app/api/export/route.ts       |  |
|  |  - Auth guard             |  |  - PDF generation              |  |
|  |  - SSE stream setup       |  |  - DOCX generation             |  |
|  |  - Graph invocation       |  |                                |  |
|  |  - Stream event formatting|  |                                |  |
|  +-------------+-------------+  +--------------------------------+  |
|                |                                                     |
+----------------|-----------------------------------------------------+
                 |
                 v
+---------------------------------------------------------------------+
|                      AGENT LAYER (Server-only)                       |
+---------------------------------------------------------------------+
|  +---------------------------+  +--------------------------------+  |
|  |  lib/agent/graph.ts       |  |  lib/agent/llm.ts              |  |
|  |  - StateGraph definition  |  |  - ChatOpenAI (OpenRouter)     |  |
|  |  - Compiled graph         |  |  - Singleton instance          |  |
|  |  - PostgresSaver checkpnt |  |                                |  |
|  +-------------+-------------+  +--------------------------------+  |
|                |                                                     |
|  +-------------+-------------+  +--------------------------------+  |
|  |  lib/agent/nodes/         |  |  lib/agent/prompts.ts           |  |
|  |  - analyzeJD.ts           |  |  - System prompt (Handler)     |  |
|  |  - planInterrogation.ts   |  |  - Node prompt templates       |  |
|  |  - evaluateAnswer.ts      |  |                                |  |
|  |  - qualityGate.ts         |  +--------------------------------+  |
|  |  - forgeDocuments.ts      |                                     |
|  |  - runATSSimulation.ts    |                                     |
|  +-------------+-------------+                                     |
|                |                                                     |
+----------------|-----------------------------------------------------+
                 |
                 v
+---------------------------------------------------------------------+
|                      PERSISTENCE LAYER                               |
+---------------------------------------------------------------------+
|  +-----------------------------+  +-------------------------------+  |
|  |  PostgreSQL (Supabase)      |  |  PostgresSaver Checkpointer  |  |
|  |  - user, session, account   |  |  - checkpoints table         |  |
|  |  - verification             |  |  - checkpoint_writes table   |  |
|  |  - checkpoint_blobs (new)   |  |  - checkpoint_blobs (new)    |  |
|  +-----------------------------+  +-------------------------------+  |
+---------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **MissionController.tsx** | Phase router. Reads `phase` from Zustand, renders correct phase component | `switch(phase)` in render, no router needed |
| **useMissionStore.ts** | Client-side state holder. Stores full `MissionState`, `threadId`, `isStreaming` flag, `startMission`/`submitAnswer`/`reset` actions | Zustand store with `create()` |
| **API route /api/agent** | Auth guard, graph invocation with `thread_id`, SSE stream piping of `graph.stream()` chunks | Next.js Route Handler, `ReadableStream` |
| **lib/agent/graph.ts** | StateGraph definition, node wiring, edge definitions, checkpointer compilation. Singleton graph instance | `StateGraph(State).addNode(...).compile({ checkpointer })` |
| **lib/agent/nodes/\*** | Pure graph node functions. Each receives state + config, calls LLM, returns partial state update or `Command` | `async (state, config) => { ... }` functions |
| **PostgresSaver** | Durable state persistence across interrupt/resume cycles. Survives server restarts | `PostgresSaver.fromConnString(DATABASE_URL)`, `setup()` for table creation |
| **llm.ts** | Singleton ChatOpenAI instance pointed at OpenRouter with proper headers | `new ChatOpenAI({ modelName, configuration: { baseURL } })` |

## Architectural Patterns

### Pattern 1: Server-Side State Ownership with PostgresSaver

**What:** The LangGraph checkpointer owns the canonical agent execution state in PostgreSQL. The client sends a `threadId`, and the server resumes from whatever checkpoint was last saved for that thread. The client does NOT send the full `MissionState` back to the server.

**When to use:** Any LangGraph workflow with `interrupt()` that needs to survive server restarts or page refreshes.

**Trade-offs:** The PRD says "the server is stateless and the client owns all state." This is architecturally wrong for LangGraph's interrupt model. The checkpointer IS the state store. Sending full state from client would mean bypassing the checkpointer entirely, which defeats the purpose of persistence and breaks the `interrupt()`/`Command({ resume })` contract. The correct pattern: server owns execution state via checkpointer, client owns UI state (current phase, streaming flag, input values) via Zustand.

**Why the PRD's approach won't work:**
- `interrupt()` saves state to the checkpointer and returns `__interrupt__` to the caller
- `Command({ resume })` resumes from the checkpoint, not from client-supplied state
- If you send full state on each request, you'd need to write your own checkpointer logic instead of using LangGraph's built-in one

**Corrected approach:**
```typescript
// CLIENT: Zustand holds threadId + UI state only
interface MissionStore {
  threadId: string | null
  currentPhase: MissionPhase
  currentQuestion: Question | null
  isStreaming: boolean
  logs: LogEntry[]
  // Results populated from SSE events
  generatedResume: string | null
  generatedCoverLetter: string | null
  atsResult: ATSResult | null
}

// SERVER: PostgresSaver holds full execution state
// Client sends { action, payload, threadId }
// Server looks up threadId in checkpointer and resumes from there
```

**Example:**
```typescript
// lib/agent/graph.ts
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import { StateGraph, Annotation, START, END } from "@langchain/langgraph"

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!)

// Singleton graph instance
let _graph: CompiledGraph | null = null
export function getGraph() {
  if (_graph) return _graph
  _graph = new StateGraph(State)
    .addNode("analyze_jd", analyzeJDNode)
    .addNode("plan_interrogation", planInterrogationNode)
    .addNode("evaluate_answer", evaluateAnswerNode)
    .addNode("quality_gate", qualityGateNode)
    .addNode("forge_documents", forgeDocumentsNode)
    .addNode("run_ats_simulation", runATSSimulationNode)
    .addEdge(START, "analyze_jd")
    .addEdge("analyze_jd", "plan_interrogation")
    .addEdge("plan_interrogation", "evaluate_answer")
    .addEdge("evaluate_answer", "quality_gate")
    .addConditionalEdges("quality_gate", qualityGateRouter)
    .addEdge("forge_documents", "run_ats_simulation")
    .addEdge("run_ats_simulation", END)
    .compile({ checkpointer })
  return _graph
}
```

### Pattern 2: interrupt() with Command Resume for Human-in-the-Loop

**What:** Use `interrupt()` inside graph nodes to pause execution and wait for user input. The caller receives `__interrupt__` in the stream result. To resume, invoke the graph again with `new Command({ resume: userAnswer })` and the same `thread_id`.

**When to use:** The interrogation loop where the agent asks a question and waits for the user to answer.

**Trade-offs:** Clean separation of concerns. The node re-executes from the beginning after resume, so any pre-interrupt code runs again. For `planInterrogation`, this means the LLM call to generate the question runs again after the user answers, which is wasteful. Solution: structure the node so the `interrupt()` is the first thing that happens, or cache the question in state before interrupting.

**Critical detail from LangGraph docs (HIGH confidence):**
> "After resuming, the node restarts from its beginning, re-executing any code that preceded the interrupt() call."

**This means the planInterrogation node must be structured carefully:**
```typescript
// WRONG: LLM call before interrupt = wasteful re-execution on resume
const planInterrogationNode = async (state) => {
  const question = await llm.invoke(...) // Runs TWICE
  const answer = interrupt(question)     // Pauses here
  return { currentAnswer: answer }
}

// CORRECT: Check if we already have the question, or use evaluateAnswer for resume
// Option A: Two separate nodes
const askQuestionNode = async (state) => {
  const question = await llm.invoke(...) // Generate question
  interrupt(question)                     // Pause, send to user
  return {}                               // Question already in state from LLM output
}

// Option B: Guard with state check (node restarts but skips LLM on resume)
const planInterrogationNode = async (state) => {
  // On first run: generate question
  // On resume: state.currentQuestion is already set from previous run
  if (!state.currentQuestion) {
    const question = await llm.invoke(...)
    return { currentQuestion: question, ...otherOutputs }
  }
  // On resume: interrupt to get the answer
  const answer = interrupt({
    type: "question",
    question: state.currentQuestion,
  })
  return { currentAnswer: answer }
}
```

**Recommended approach:** Use Option A with separate nodes for "ask" and "collect answer". This avoids re-executing LLM calls on resume and keeps each node's responsibility clean.

**Revised graph structure:**
```
analyze_jd -> plan_interrogation -> ask_question -> [interrupt]
                                                    |
                                              (user answers via UI)
                                                    |
                                              collect_answer -> evaluate_answer
                                                                   |
                                                              quality_gate
                                                          pass /        \ fail
                                                    plan_interrogation  ask_question (with feedback)
                                                          (all gaps filled)
                                                              forge_documents -> run_ats_simulation -> END
```

**Example:**
```typescript
import { interrupt, Command } from "@langchain/langgraph"

// Node that generates and asks a question
const askQuestionNode: GraphNode<typeof State> = async (state, config) => {
  // Find next unfilled gap
  const nextGap = state.intelGaps.find(g => !g.filled)
  if (!nextGap) {
    // All gaps filled, move to forgery
    return new Command({ goto: "forge_documents" })
  }

  // Generate question via LLM
  const question = await generateQuestion(state, nextGap)

  // Emit log event for client
  config.writer?.({
    type: "log",
    data: { message: "Intel gap identified. Commencing interrogation.", level: "handler" },
  })

  // Pause execution, send question to client
  interrupt({ question })

  // This code only runs if we somehow resume without going through collect_answer
  // In practice, collect_answer handles the resume
  return { currentQuestion: question }
}

// Node that collects the answer after user responds
const collectAnswerNode: GraphNode<typeof State> = async (state) => {
  const userAnswer = interrupt("Waiting for operative response...")
  return { currentAnswer: userAnswer }
}
```

**Wait -- there is a subtlety.** The `interrupt()` return value comes from `Command({ resume })`. So the actual flow is:

1. `askQuestionNode` calls `interrupt(question)` -- graph pauses, client gets `__interrupt__` with the question
2. User answers, client sends `POST /api/agent { action: "submit_answer", answer: "...", threadId }`
3. Server calls `graph.stream(new Command({ resume: answer }), { configurable: { thread_id } })`
4. LangGraph resumes from the checkpoint. The `interrupt()` call in `askQuestionNode` returns `answer`
5. `askQuestionNode` continues executing after the `interrupt()` line

So the correct pattern is simpler than two separate nodes:

```typescript
const askQuestionNode = async (state, config) => {
  const nextGap = state.intelGaps.find(g => !g.filled)
  if (!nextGap) {
    return new Command({ goto: "forge_documents" })
  }

  // On first run: generate question
  let question = state.currentQuestion
  if (!question) {
    question = await generateQuestion(state, nextGap)
    config.writer?.({ type: "log", data: { message: "Intel gap identified...", level: "handler" } })
  }

  // Pause -- on first run this sends the question; on resume this returns the answer
  const answer = interrupt({ question })

  // Only reached after resume with Command({ resume: answer })
  return { currentQuestion: null, currentAnswer: answer }
}

// Then: askQuestion -> evaluateAnswer -> qualityGate
// qualityGate pass -> askQuestion (loops)
// qualityGate fail -> askQuestion (loops with feedback via state)
```

### Pattern 3: SSE Streaming with streamMode: "updates"

**What:** Use `graph.stream()` with `streamMode: "updates"` to get per-node output chunks. Wrap in a Next.js Route Handler that creates a `ReadableStream` and pipes events as newline-delimited JSON.

**When to use:** Any LangGraph workflow that needs real-time progress updates sent to the browser.

**Trade-offs:** `streamMode: "updates"` gives you the state delta from each node. For richer events (log messages, progress), combine with `streamMode: ["updates", "custom"]` and use `config.writer()` in nodes.

**Recommended: Use `streamMode: "custom"` as the primary mode** because nodes can emit typed events that the client can handle directly, without the client needing to know about graph node names.

**Example (API route):**
```typescript
// app/api/agent/route.ts
import { auth } from "@/lib/auth"
import { getGraph } from "@/lib/agent/graph"
import { Command } from "@langchain/langgraph"
import { headers } from "next/headers"

export async function POST(request: Request) {
  // Auth guard
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await request.json()
  const { action, payload, threadId } = body
  const graph = getGraph()
  const config = {
    configurable: { thread_id: threadId },
    streamMode: "custom" as const,
  }

  // Build input or resume command based on action
  let input: unknown
  if (action === "start_mission") {
    input = {
      jobDescription: payload.jobDescription,
      existingResume: payload.existingResume ?? "",
    }
  } else if (action === "submit_answer") {
    input = new Command({ resume: payload.answer })
  }

  const stream = await graph.stream(input, config)

  // Create SSE ReadableStream
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          // chunk is whatever the node emitted via config.writer()
          const data = typeof chunk === "string" ? chunk : JSON.stringify(chunk)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }
        controller.enqueue(encoder.encode("data: {\"type\":\"done\"}\n\n"))
      } catch (error) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`
        ))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
```

**Example (node emitting custom events):**
```typescript
const analyzeJDNode: GraphNode<typeof State> = async (state, config) => {
  config.writer?.({ type: "phase", data: { phase: "intel_acquisition" } })
  config.writer?.({
    type: "log",
    data: { id: crypto.randomUUID(), message: "Scanning target intel...", level: "system", timestamp: Date.now() },
  })

  const result = await llm.invoke([systemPrompt, humanPrompt(state.jobDescription)])

  config.writer?.({
    type: "log",
    data: { id: crypto.randomUUID(), message: `Target analyzed. ${result.intelGaps.length} intel gaps identified.`, level: "handler", timestamp: Date.now() },
  })

  return {
    primaryTargets: result.primaryTargets,
    secondaryTargets: result.secondaryTargets,
    intelGaps: result.intelGaps,
  }
}
```

### Pattern 4: Quality Gate with Command-Based Routing

**What:** Use `Command({ goto })` from the qualityGate node to route either back to `askQuestion` (on failure with feedback) or continue to `forgeDocuments` (on pass). The rejection count and feedback are stored in state.

**When to use:** Conditional routing that also needs to pass data (like feedback messages).

**Trade-offs:** `Command` with `goto` replaces `addConditionalEdges` for dynamic routing. Cleaner when the routing logic also needs to update state.

**Example:**
```typescript
const qualityGateNode: GraphNode<typeof State> = async (state, config) => {
  const { score, feedback } = state.lastEvaluation

  if (score >= 60) {
    // Accept answer, mark gap as filled
    config.writer?.({ type: "feedback", data: { message: "Answer accepted.", accepted: true } })
    const updatedGaps = state.intelGaps.map(g =>
      g.id === state.currentQuestion?.gapId ? { ...g, filled: true } : g
    )
    return {
      intelGaps: updatedGaps,
      questionHistory: [...state.questionHistory, {
        question: state.currentQuestion!,
        answer: state.currentAnswer,
        score,
        accepted: true,
      }],
      currentAnswer: null,
      currentQuestion: null,
      rejectionCount: 0,
    }
  }

  // Reject
  const newRejectionCount = state.rejectionCount + 1
  if (newRejectionCount >= 3) {
    // Force accept after 3 rejections
    config.writer?.({ type: "feedback", data: { message: "Maximum retries exceeded. Proceeding with low confidence.", accepted: true } })
    const updatedGaps = state.intelGaps.map(g =>
      g.id === state.currentQuestion?.gapId ? { ...g, filled: true, confidence: "low" } : g
    )
    return {
      intelGaps: updatedGaps,
      questionHistory: [...state.questionHistory, {
        question: state.currentQuestion!,
        answer: state.currentAnswer,
        score,
        accepted: true,
      }],
      currentAnswer: null,
      currentQuestion: null,
      rejectionCount: 0,
    }
  }

  // Reject with feedback, loop back
  config.writer?.({
    type: "feedback",
    data: { message: feedback, accepted: false },
  })
  return new Command({
    update: {
      rejectionCount: newRejectionCount,
      currentAnswer: null,
    },
    goto: "ask_question",
  })
}
```

## Recommended Project Structure

```
src/
  lib/
    agent/
      graph.ts                    # StateGraph definition, compiled graph singleton
      state.ts                    # Annotation.Root state schema + initialState
      llm.ts                      # ChatOpenAI (OpenRouter) singleton
      prompts.ts                  # All prompt templates (Handler system + node prompts)
      checkpointer.ts             # PostgresSaver singleton + setup
      nodes/
        analyzeJD.ts              # Parse JD -> targets + gaps
        planInterrogation.ts      # Select next gap, generate question (combined with ask)
        askQuestion.ts            # interrupt() for user input
        evaluateAnswer.ts         # Score answer 0-100
        qualityGate.ts            # Route: accept/reject/force-accept
        forgeDocuments.ts         # Generate resume + cover letter
        runATSSimulation.ts       # ATS keyword scoring
      types.ts                    # IntelGap, Question, QuestionAnswer, OperativeProfile, ATSResult, LogEntry
    store/
      useMissionStore.ts          # Zustand: threadId, phase, currentQuestion, isStreaming, results
    export/
      generatePDF.ts              # @react-pdf/renderer
      generateDOCX.ts             # docx library
  app/
    api/
      agent/
        route.ts                  # POST: graph invocation + SSE stream
      export/
        route.ts                  # POST: PDF/DOCX generation endpoint
    mission/
      layout.tsx                  # Full-screen layout, no sidebar
      page.tsx                    # Renders MissionController
  components/
    dashboard/
      NewMissionCard.tsx           # CTA card for dashboard
    mission/
      MissionController.tsx       # Phase router (switch on store.phase)
      phases/
        BriefingScreen.tsx
        IntelAcquisition.tsx
        OperativeProfile.tsx
        Interrogation.tsx
        Forgery.tsx
        StressTest.tsx
        Extraction.tsx
      ui/
        TerminalPanel.tsx          # Scrolling log feed
        HandlerMessage.tsx         # Character-by-character streaming text
        TerminalInput.tsx          # Textarea wrapper
        TerminalRadioGroup.tsx     # RadioGroup wrapper
        PhaseIndicator.tsx         # Progress bar
        StatusBadge.tsx            # CLEARED / COMPROMISED badges
      documents/
        ResumePreview.tsx
        CoverLetterPreview.tsx
```

### Structure Rationale

- **lib/agent/nodes/:** Each node is a standalone function. No shared mutable state. Receives state + config, returns partial state or `Command`. This makes nodes testable independently.
- **lib/agent/checkpointer.ts:** Separate file because `PostgresSaver.setup()` must run exactly once (creates DB tables). Keeps graph.ts clean.
- **lib/agent/state.ts:** Single source of truth for the state schema. Uses `Annotation.Root` which is the current recommended API for LangGraph.js.
- **app/api/agent/route.ts:** Single endpoint handles all mission actions. The `action` field dispatches to either initial invoke or `Command({ resume })`. Simpler than multiple endpoints.
- **components/mission/phases/:** One component per mission phase. MissionController reads `phase` from Zustand and renders the right one. No React Router needed -- phase is UI state, not a URL.

## Data Flow

### Mission Start Flow

```
[User pastes JD + optional resume on IntelAcquisition/OperativeProfile phases]
    |
    v
[MissionController] -> store.startMission(jd, resume)
    |
    v
[useMissionStore] -> generates threadId (crypto.randomUUID())
                 -> sets isStreaming = true
                 -> calls POST /api/agent
                 -> action: "start_mission", payload: { jobDescription, existingResume }, threadId
    |
    v
[API Route /api/agent] -> auth check
                     -> graph.stream(input, { configurable: { thread_id }, streamMode: "custom" })
                     |
                     v
                     [analyze_jd node]
                       -> config.writer({ type: "log", data: "Scanning target..." })
                       -> LLM call: parse JD
                       -> config.writer({ type: "log", data: "N gaps identified" })
                       -> returns { primaryTargets, secondaryTargets, intelGaps }
                     |
                     v
                     [ask_question node]
                       -> finds first unfilled gap
                       -> LLM call: generate question
                       -> config.writer({ type: "question", data: { question } })
                       -> config.writer({ type: "phase", data: { phase: "interrogation" } })
                       -> interrupt({ question })
                       -> GRAPH PAUSES -- state saved to PostgresSaver
    |
    v (SSE events stream to client)
[useMissionStore] -> EventSource listener receives events
                 -> type: "log" -> appendLog(entry)
                 -> type: "phase" -> setPhase(phase)
                 -> type: "question" -> setCurrentQuestion(question)
                 -> type: "done" -> setIsStreaming(false)
    |
    v
[Interrogation.tsx] -> renders currentQuestion with appropriate input component
```

### Answer Submission Flow

```
[User types answer, clicks TRANSMIT]
    |
    v
[Interrogation.tsx] -> store.submitAnswer(answer)
    |
    v
[useMissionStore] -> sets isStreaming = true, clears input
                 -> calls POST /api/agent
                 -> action: "submit_answer", payload: { answer }, threadId
    |
    v
[API Route /api/agent] -> graph.stream(new Command({ resume: answer }), config)
                     |
                     v
                     [ask_question node RESUMES]
                       -> interrupt() returns answer
                       -> returns { currentAnswer: answer }
                     |
                     v
                     [evaluate_answer node]
                       -> LLM call: score answer
                       -> config.writer({ type: "log", data: "Evaluating response..." })
                       -> returns { lastEvaluation: { score, feedback } }
                     |
                     v
                     [quality_gate node]
                       -> if score >= 60: mark gap filled, continue to ask_question
                       -> if score < 60 && rejections < 3:
                            config.writer({ type: "feedback", data: { feedback, accepted: false } })
                            return Command({ goto: "ask_question" })
                            -> ask_question RESUMES with same thread
                            -> But wait -- on resume, the node RE-EXECUTES from the top
                            -> This is the problem described in Pattern 2
```

### Revised Answer Submission Flow (Corrected)

The re-execution problem on resume means the flow should be:

```
[quality_gate FAIL] -> Command({ goto: "ask_question", update: { rejectionCount: n } })
    |
    v
[ask_question RESUMES from checkpoint]
    -> The node re-executes from its beginning
    -> But state.currentQuestion is still set from the previous run
    -> It should NOT regenerate the question
    -> Instead: interrupt with the existing question + feedback from state
    |
    v
[Client receives interrupt with same question + feedback context]
    -> Interrogation.tsx shows feedback, re-enables input
```

**This means askQuestion must handle both first-run and re-ask scenarios:**

```typescript
const askQuestionNode = async (state, config) => {
  const nextGap = state.intelGaps.find(g => !g.filled)
  if (!nextGap) {
    return new Command({ goto: "forge_documents" })
  }

  let question = state.currentQuestion

  if (!question) {
    // First time asking -- generate via LLM
    question = await generateQuestion(state, nextGap)
    return { currentQuestion: question }
    // After this return, the graph continues to evaluate_answer
    // WAIT -- this doesn't work either. The node returns, then the edge goes to evaluate_answer.
  }

  // Re-asking (quality gate failure) or initial ask with existing question
  // interrupt() pauses here, sending the question to the client
  const answer = interrupt({ question })
  return { currentAnswer: answer }
}
```

**Actually, the correct architecture is simpler. The graph should be:**

```
analyze_jd -> ask_question <-> evaluate_answer <-> quality_gate
                  |
            (all gaps filled)
                  |
            forge_documents -> run_ats_simulation -> END
```

With this structure:
1. `ask_question` generates the question (LLM call), stores it in state, then calls `interrupt()` to pause
2. Client gets the question via `__interrupt__`, user answers
3. `Command({ resume: answer })` causes `ask_question` to re-execute from the top
4. On re-execution, `state.currentQuestion` is already set, so it skips the LLM call and goes straight to `interrupt()`
5. `interrupt()` returns the user's answer
6. Node continues, returns `{ currentAnswer: answer }`
7. Edge goes to `evaluate_answer`
8. `evaluate_answer` scores it, returns `{ lastEvaluation }`
9. Edge goes to `quality_gate`
10. `quality_gate` either marks gap filled (falls through to next `ask_question`) or sends `Command({ goto: "ask_question" })` with incremented rejection count
11. On the next `ask_question` run, the rejection count in state tells it to re-use the same question

### State Management

```
                        PostgresSaver (Server)
                               |
                    thread_id acts as the key
                               |
                    +----------+-----------+
                    |                      |
              Full execution        __interrupt__ info
              state stored here    surfaced on pause
                    |
                    | (NOT sent by client)
                    |

                        Zustand (Client)
                               |
                    +----------+-----------+
                    |          |           |
               threadId    phase      isStreaming
               currentQ    currentA   logs[]
               results[]   (UI only)
```

**Key principle:** Zustand holds UI display state. PostgresSaver holds execution state. They overlap only on `threadId`. The client never sends the full MissionState to the server -- only `threadId` and the user's latest answer.

**SSE event types bridge the gap:**
```
Server (custom stream)          Client (Zustand)
---------------------          ----------------
{ type: "log" }        ------>  appendLog()
{ type: "phase" }      ------>  setPhase()
{ type: "question" }   ------>  setCurrentQuestion()
{ type: "feedback" }   ------>  setFeedback()
{ type: "state" }      ------>  updateState() (for results like resume, ATS score)
{ type: "done" }       ------>  setIsStreaming(false)
{ type: "error" }      ------>  setError()
```

### Key Data Flows

1. **Mission initialization:** Client generates `threadId`, sends JD to server. Server runs `analyze_jd` node (LLM call), stores result in checkpointer, then hits `interrupt()` in `ask_question`. Client receives question via SSE.
2. **Interrogation loop:** Client sends `Command({ resume: answer })` with same `threadId`. Server resumes from checkpoint, evaluates answer, runs quality gate. If pass: marks gap filled, loops to next question. If fail: loops with feedback. Each step emits custom events via `config.writer()`.
3. **Document generation:** After all gaps filled, `ask_question` routes to `forge_documents`. Node generates resume + cover letter via LLM, emits `state` event with results. Then routes to `run_ats_simulation`.
4. **State recovery on page refresh:** Client stores `threadId` in sessionStorage. On mount, it can call a `GET /api/agent?threadId=xxx` endpoint that calls `graph.getState(config)` to retrieve the current checkpoint state and resume from where it left off.

## State Schema Design

### Recommended: Annotation.Root with Zod v4

The project already uses Zod v4. LangGraph.js supports Zod v4 state schemas via the registry pattern. However, `Annotation.Root` is the simpler, more idiomatic approach and avoids the registry complexity.

```typescript
// lib/agent/state.ts
import { Annotation, messagesStateReducer } from "@langchain/langgraph"

export const MissionState = Annotation.Root({
  // Inputs (set once at mission start)
  jobDescription: Annotation<string>({ default: () => "" }),
  existingResume: Annotation<string>({ default: () => "" }),

  // Agent analysis (set by analyze_jd)
  primaryTargets: Annotation<string[]>({ default: () => [] }),
  secondaryTargets: Annotation<string[]>({ default: () => [] }),
  intelGaps: Annotation<IntelGap[]>({ default: () => [] }),

  // Interrogation loop state
  currentQuestion: Annotation<Question | null>({ default: () => null }),
  currentAnswer: Annotation<string>({ default: () => "" }),
  questionHistory: Annotation<QuestionAnswer[]>({
    reducer: (existing, update) => [...existing, update],
    default: () => [],
  }),
  rejectionCount: Annotation<number>({ default: () => 0 }),

  // Evaluation result (transient, used between evaluate_answer and quality_gate)
  lastEvaluation: Annotation<{ score: number; feedback: string } | null>({ default: () => null }),

  // Output documents
  generatedResume: Annotation<string>({ default: () => "" }),
  generatedCoverLetter: Annotation<string>({ default: () => "" }),
  atsResult: Annotation<ATSResult | null>({ default: () => null }),
})
```

**Key decisions:**
- `questionHistory` uses a reducer (append-only) because it accumulates across the interrogation loop. Without a reducer, each node return would overwrite the entire array.
- `rejectionCount` does NOT use a reducer. It's explicitly set to 0 on acceptance and incremented on rejection. Last-write-wins is correct here.
- `currentQuestion` and `currentAnswer` are last-write-wins. They represent "the current thing being worked on," not accumulated history.
- `lastEvaluation` is transient state between `evaluate_answer` and `quality_gate` nodes. It does not need a reducer.
- The `phase` field from the PRD is NOT in the graph state. Phase is UI-only state managed by Zustand. The server emits `phase` events via `config.writer()`, but the graph itself does not track phases. The graph tracks structural state (gaps filled, documents generated) not presentation state.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 concurrent missions | Current architecture is fine. PostgresSaver handles concurrent threads. One graph singleton per process. |
| 100-1000 concurrent missions | Add connection pooling to PostgresSaver. Consider PgBouncer for the checkpoint DB connection. Monitor checkpoint table size -- add a cleanup job to delete completed mission threads older than 24h. |
| 1000+ concurrent missions | Consider offloading LLM calls to a background worker (Inngest is already in package.json). The API route becomes a thin orchestrator: start workflow, stream events. The actual graph execution happens in the worker. |

### Scaling Priorities

1. **First bottleneck:** OpenRouter API rate limits. Each mission makes 5-10 LLM calls. At high concurrency, you'll hit rate limits before database or server limits. Mitigation: configure timeouts, add retry logic in nodes, use model with higher rate limits.
2. **Second bottleneck:** PostgresSaver checkpoint table growth. Each node execution creates a checkpoint. A 7-question interrogation creates ~30+ checkpoints per mission. Mitigation: periodic cleanup of completed threads. LangGraph provides `graph.deleteThread(threadId)` for this.

## Anti-Patterns

### Anti-Pattern 1: Sending Full State from Client to Server

**What people do:** Include the entire `MissionState` in every API request, treating the server as a stateless function processor.

**Why it's wrong:** LangGraph's checkpointer IS the state store. Sending full state bypasses checkpointing, breaks `interrupt()`/`Command({ resume })` semantics, and creates a race condition between client state and server checkpoint state.

**Do this instead:** Send only `{ threadId, action, payload }`. The server looks up state from the checkpointer using `threadId`. The client only stores UI-relevant state in Zustand.

### Anti-Pattern 2: Using React Router for Phase Navigation

**What people do:** Create `/mission/intel`, `/mission/interrogation`, etc. as separate routes.

**Why it's wrong:** Phase is not a URL concern. The agent controls phase transitions via the graph. If the user navigates to `/mission/interrogation` directly, there's no graph state to support it. Also, interrupt/resume would need to handle URL changes, adding complexity.

**Do this instead:** Single `/mission` route. Phase is Zustand state. `MissionController` reads `phase` from the store and renders the appropriate phase component. Phase transitions happen via SSE events from the server.

### Anti-Pattern 3: Calling graph.invoke() Instead of graph.stream()

**What people do:** Use `graph.invoke()` and only return the final result, losing all intermediate progress.

**Why it's wrong:** The user sees nothing for 10-30 seconds while LLM calls execute. No terminal log updates, no phase transitions. The entire UX collapses.

**Do this instead:** Always use `graph.stream()` with `streamMode: "custom"`. Emit events from nodes via `config.writer()`. The client gets real-time updates for every step.

### Anti-Pattern 4: Creating a New PostgresSaver Instance Per Request

**What people do:** `const checkpointer = PostgresSaver.fromConnString(DATABASE_URL)` inside the API route handler.

**Why it's wrong:** Creates a new database connection pool per request. Exhausts connections at scale. Also, `PostgresSaver.setup()` (table creation) would run on every request.

**Do this instead:** Singleton `PostgresSaver` instance created at module scope in `lib/agent/checkpointer.ts`. Run `setup()` once at app startup (or in a migration script).

### Anti-Pattern 5: Putting Phase in Graph State

**What people do:** Include `phase: MissionPhase` in the `Annotation.Root` state schema and update it from nodes.

**Why it's wrong:** Phase is a presentation concern. The graph does not need to know about "briefing" vs "interrogation" -- it knows about "analyze_jd" vs "ask_question." Mixing presentation state with execution state creates coupling between the agent logic and the UI.

**Do this instead:** Emit `{ type: "phase", data: { phase } }` via `config.writer()` from nodes that correspond to phase transitions. The client maps graph events to UI phases.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **OpenRouter (LLM)** | `@langchain/openai` ChatOpenAI with custom baseURL | API key in server env only. Rate limits are the primary constraint. |
| **Supabase (PostgreSQL)** | `PostgresSaver.fromConnString(DATABASE_URL)` | Same database as the app's Prisma schema. PostgresSaver creates its own tables via `setup()`. Does NOT conflict with Prisma's tables. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Zustand <-> API Route** | POST + SSE (EventSource) | Single endpoint `/api/agent`. Client sends actions, receives streamed events. No polling. |
| **API Route <-> Graph** | `graph.stream()` with custom streamMode | Route handler iterates the async generator and pipes to SSE. |
| **Graph <-> Nodes** | Function calls (state in, partial state out) | Nodes are pure functions. No direct DB access. State flows through the graph. |
| **Nodes <-> LLM** | `llm.invoke()` / `llm.stream()` | All LLM calls go through the singleton ChatOpenAI instance in `llm.ts`. |
| **Auth (better-auth) <-> API Route** | `auth.api.getSession({ headers })` | Same pattern as existing routes. Protect `/api/agent` and `/mission` route. |

### PostgresSaver Table Coexistence with Prisma

PostgresSaver creates its own tables (`checkpoints`, `checkpoint_writes`, `checkpoint_blobs`) via `setup()`. These do not interfere with Prisma's managed tables. However:

1. **Do NOT add these tables to `prisma/schema.prisma`.** Prisma will try to manage them and conflict with PostgresSaver's own schema management.
2. **Run `checkpointer.setup()` once.** Either in a startup script or as part of deployment. Not on every request.
3. **Database URL is shared.** Both Prisma and PostgresSaver connect to the same Supabase PostgreSQL instance using `DATABASE_URL`. This is fine -- they manage different tables.

## Build Order (Dependency Graph)

```
Phase 1: Foundation (no UI dependencies)
  1a. Install dependencies (@langchain/langgraph, @langchain/langgraph-checkpoint-postgres, zustand)
  1b. lib/agent/state.ts          -- state schema, no deps
  1c. lib/agent/llm.ts            -- LLM singleton, no deps
  1d. lib/agent/checkpointer.ts   -- PostgresSaver singleton + setup
  1e. lib/agent/prompts.ts        -- prompt templates, no deps

Phase 2: Graph Core (depends on Phase 1)
  2a. lib/agent/nodes/analyzeJD.ts        -- simplest node, LLM only
  2b. lib/agent/graph.ts                  -- wire up nodes with edges, compile with checkpointer
  2c. app/api/agent/route.ts              -- SSE streaming endpoint (test with curl)

Phase 3: Interrogation Loop (depends on Phase 2)
  3a. lib/agent/nodes/askQuestion.ts      -- interrupt + question generation
  3b. lib/agent/nodes/evaluateAnswer.ts   -- scoring
  3c. lib/agent/nodes/qualityGate.ts      -- Command-based routing
  3d. Test interrupt/resume cycle end-to-end via API

Phase 4: Document Generation (depends on Phase 3)
  4a. lib/agent/nodes/forgeDocuments.ts
  4b. lib/agent/nodes/runATSSimulation.ts
  4c. lib/export/generatePDF.ts
  4d. lib/export/generateDOCX.ts
  4e. app/api/export/route.ts

Phase 5: Client Layer (depends on Phase 2-4)
  5a. lib/store/useMissionStore.ts         -- Zustand store + SSE consumer
  5b. components/mission/MissionController.tsx
  5c. components/mission/phases/*.tsx      -- one at a time, in phase order
  5d. components/mission/ui/*.tsx          -- reusable terminal components
  5e. components/mission/documents/*.tsx

Phase 6: Integration (depends on Phase 5)
  6a. components/dashboard/NewMissionCard.tsx
  6b. app/mission/layout.tsx               -- full-screen, no sidebar
  6c. Auth guard updates (proxy.ts for /mission)
  6d. End-to-end testing
```

**Critical path:** Phase 1 -> Phase 2 -> Phase 3 (the interrupt/resume cycle is the hardest part and must be validated early). Phase 4 and 5 can partially parallelize (document generation nodes and client components can be built simultaneously).

## Sources

- LangGraph.js official docs -- interrupt and human-in-the-loop patterns: https://docs.langchain.com/oss/javascript/langgraph/interrupts (HIGH confidence, verified via Context7)
- LangGraph.js official docs -- PostgresSaver setup: https://docs.langchain.com/oss/javascript/langgraph/add-memory (HIGH confidence, verified via Context7)
- LangGraph.js official docs -- streaming and custom events: https://docs.langchain.com/oss/javascript/langgraph/streaming (HIGH confidence, verified via Context7)
- LangGraph.js official docs -- StateGraph API, Command routing: https://docs.langchain.com/oss/javascript/langgraph/use-graph-api (HIGH confidence, verified via Context7)
- LangGraph.js official docs -- state persistence: https://docs.langchain.com/oss/javascript/langgraph/persistence (HIGH confidence, verified via Context7)
- LangGraph.js official docs -- Graph API reference: https://docs.langchain.com/oss/javascript/langgraph/graph-api (HIGH confidence, verified via Context7)
- Project PRD v2.0 (local file, read 2026-05-02) -- state schema, node definitions, API design
- Project existing codebase -- Prisma schema, auth config, proxy.ts, package.json

---
*Architecture research for: LangGraph.js agentic workflow in Next.js 16*
*Researched: 2026-05-02*
