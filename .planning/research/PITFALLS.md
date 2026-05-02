# Pitfalls Research

**Domain:** LangGraph.js agentic workflow with interrupt-based Q&A, Next.js 16 App Router, OpenRouter LLM calls, document generation (PDF/DOCX), ATS simulation
**Researched:** 2026-05-02
**Confidence:** HIGH (LangGraph docs verified via Context7; Next.js docs verified via Context7; some pitfalls from training data + community patterns marked accordingly)

## Critical Pitfalls

### Pitfall 1: Side Effects Before `interrupt()` Get Re-Executed on Resume

**What goes wrong:**
When LangGraph resumes execution after an `interrupt()`, the entire node function re-executes from the beginning. Any code before the `interrupt()` call -- LLM calls, API requests, database writes, counter increments -- runs a second time. In this project, placing the LLM call that generates a question *before* the `interrupt()` in `planInterrogation` means every time the user answers, the question gets regenerated unnecessarily (and differently, wasting tokens and potentially changing the question the user thought they were answering).

**Why it happens:**
LangGraph checkpointing saves state *after* a node completes. When a node is interrupted mid-execution, the checkpoint captures the state *before* the node ran. On resume, the node runs from scratch, with the `interrupt()` call returning the resume value instead of pausing. This is by design (documented explicitly in LangGraph's "Common Pitfalls" section) but contradicts developer intuition that "the function paused and will continue where it left off."

**How to avoid:**
Structure every node that contains an `interrupt()` so that all expensive/side-effect operations happen *after* the interrupt returns. For the interrogation loop:

```typescript
// BAD -- LLM call re-executes on every resume
function planInterrogation(state) {
  const question = await llm.invoke(prompt) // Runs TWICE
  const answer = interrupt({ question })      // Pauses here
  return { answer }
}

// GOOD -- LLM call only runs once
function planInterrogation(state) {
  const answer = interrupt({ question: state.currentQuestion }) // Pauses
  // Code below only runs on resume
  return { answer }
}

// BEST -- Generate question in a separate node, interrupt in its own node
function generateQuestion(state) {
  const question = await llm.invoke(prompt)
  return { currentQuestion: question }
}
function collectAnswer(state) {
  const answer = interrupt({ question: state.currentQuestion })
  return { lastAnswer: answer }
}
```

**Warning signs:**
- LLM token usage is 2x expected
- Questions change between when they're displayed and when the answer is evaluated
- OpenRouter billing shows duplicate calls for the same node
- Node execution logs show the same node running twice per user interaction

**Phase to address:**
Phase 1 (Agent Core) -- The graph topology and node structure must be designed with interrupt placement as a first-class concern, not refactored in later.

---

### Pitfall 2: Mixing `invoke()` and `stream()` for Interrupt Detection

**What goes wrong:**
The PRD specifies SSE streaming (`POST /api/agent` returns a stream). However, LangGraph's `invoke()` method does **not** return interrupt information in its result -- you must call `graph.getState(config)` separately to detect that an interrupt occurred. Only `graph.stream()` surfaces `__interrupt__` events in the output. If the route handler uses `invoke()` to run the graph and then tries to stream results separately, it will never know the graph paused for user input.

**Why it happens:**
The LangGraph docs explicitly state: "invoke does not return the interrupt information. To access this information, you must use the getState method." Developers familiar with LangChain but not LangGraph's interrupt system expect `invoke()` to return a result that indicates the graph paused. It does not -- it returns the last checkpoint's state values without any interrupt metadata.

**How to avoid:**
Use `graph.stream()` exclusively as the execution entry point in the API route handler. The stream will emit `__interrupt__` chunks that the SSE layer can forward to the client:

```typescript
// In /api/agent/route.ts
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder()
    for await (const chunk of await graph.stream(input, config)) {
      // chunk may be { __interrupt__: [...] } or { nodeName: stateUpdate }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
    }
    controller.close()
  }
})
return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' }
})
```

**Warning signs:**
- Client never receives interrupt/question events
- `graph.getState()` has to be called as a separate request after every `invoke()`
- Two API calls per user interaction instead of one streaming response

**Phase to address:**
Phase 1 (Agent Core) -- The API route handler and graph execution pattern must be built around `stream()` from the start.

---

### Pitfall 3: `GraphInterrupt` Swallowed by try/catch in Nodes

**What goes wrong:**
The `interrupt()` function works by throwing a special `GraphInterrupt` error. If any node wraps its logic in a `try/catch` block (common for error handling around LLM calls), the `GraphInterrupt` error gets caught and the graph never actually pauses. The user sees the graph "complete" without ever being asked a question. The checkpoint is never written. The mission proceeds with empty/null answers.

**Why it happens:**
Developers naturally wrap LLM calls in try/catch to handle timeouts, rate limits, and parsing errors. Since `interrupt()` throws, a catch-all `catch (e)` block intercepts the `GraphInterrupt` alongside actual errors.

**How to avoid:**
Either avoid try/catch around interrupt calls entirely, or explicitly re-throw `GraphInterrupt`:

```typescript
import { interrupt, GraphInterrupt } from "@langchain/langgraph"

async function myNode(state) {
  try {
    const question = await llm.invoke(prompt)
    const answer = interrupt({ question })
    // process answer...
  } catch (e) {
    if (e instanceof GraphInterrupt) throw e  // MUST re-throw
    // handle actual errors
    throw e
  }
}
```

**Warning signs:**
- Graph runs to completion without pausing
- No `__interrupt__` events in the stream
- Interrupt nodes appear to be skipped entirely
- User never sees interrogation questions

**Phase to address:**
Phase 1 (Agent Core) -- Establish a lint rule or code review checklist item: "No try/catch around interrupt() without GraphInterrupt re-throw."

---

### Pitfall 4: OpenRouter `ChatOpenAI` Configuration Mismatch

**What goes wrong:**
The PRD shows using `@langchain/openai`'s `ChatOpenAI` with OpenRouter's `baseURL`. However, the project already has `@langchain/openrouter` installed. These are different packages with different behavior. Using `@langchain/openai` with OpenRouter's baseURL works for basic calls but may not handle OpenRouter-specific features (model routing headers, provider fallback, usage tracking) correctly. More critically, `@langchain/openai`'s `withStructuredOutput()` relies on the OpenAI function/tool calling API format, which OpenRouter may proxy differently depending on the underlying model provider.

**Why it happens:**
The PRD was written referencing the `@langchain/openai` pattern, but the project's `package.json` already has `@langchain/openrouter` installed. Developers may follow the PRD exactly and end up with two competing OpenAI-compatible clients, or may mix configurations between them.

**How to avoid:**
Decide on one package and use it consistently. Prefer `@langchain/openrouter` since it is purpose-built for OpenRouter and already installed:

```typescript
// Use the dedicated package
import { ChatOpenAI } from "@langchain/openrouter"

const model = new ChatOpenAI({
  model: "anthropic/claude-sonnet-4-5",
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  temperature: 0.3,
})
```

If `withStructuredOutput()` behaves differently through OpenRouter vs. native OpenAI, implement a manual JSON parsing fallback with retry logic.

**Warning signs:**
- "Model not found" errors from OpenRouter
- Structured output parsing failures that work in testing but fail in production
- Two OpenAI-compatible imports in the codebase
- Inconsistent API key handling between packages

**Phase to address:**
Phase 1 (Agent Core) -- LLM client configuration is foundational. Pick one package and validate `withStructuredOutput()` against the target model through OpenRouter before building nodes.

---

### Pitfall 5: LLM Structured Output Parsing Failures Cascade Through the Graph

**What goes wrong:**
Every node in the LangGraph graph (analyzeJD, planInterrogation, evaluateAnswer, forgeDocuments, runATSSimulation) relies on the LLM returning valid JSON matching a Zod schema via `withStructuredOutput()`. If any single node's LLM call returns malformed JSON or valid JSON that doesn't match the schema, the entire graph crashes. In an interrupt-based workflow, this is especially painful because the user may have already answered 5 questions before a parsing failure in `evaluateAnswer` kills the mission.

**Why it happens:**
`withStructuredOutput()` can fail in several ways: (1) The model returns prose instead of JSON despite being instructed otherwise. (2) The model returns valid JSON but with wrong field types (string instead of number for a score). (3) OpenRouter proxies the response differently for some models, stripping the structured output format. (4) Network errors mid-stream corrupt partial responses. None of these have built-in retry at the graph level.

**How to avoid:**
Wrap every `withStructuredOutput()` call in a retry loop with a fallback to manual JSON extraction:

```typescript
async function callWithRetry<T>(
  llm: BaseChatModel,
  prompt: string,
  schema: z.ZodType<T>,
  maxRetries = 3
): Promise<T> {
  const structuredLlm = llm.withStructuredOutput(schema)
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await structuredLlm.invoke(prompt)
    } catch (e) {
      if (attempt === maxRetries - 1) throw e
      // Wait with exponential backoff before retry
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }
  }
  throw new Error("Unreachable")
}
```

Additionally, validate critical fields (like `score` in evaluateAnswer being a number 0-100) before returning from the node. If validation fails, return a safe default rather than crashing.

**Warning signs:**
- "Failed to parse" or Zod validation errors in server logs
- Graph execution stops mid-mission with no recovery
- Users report losing progress after answering multiple questions
- Token usage spikes (retry loops consuming extra tokens)

**Phase to address:**
Phase 1 (Agent Core) -- Build the retry/validation wrapper as a shared utility before writing any node logic. Phase 3 (Interrogation Loop) should specifically test the evaluateAnswer retry behavior.

---

### Pitfall 6: Quality Gate Rejection Loop Creates Unrecoverable UX Dead Ends

**What goes wrong:**
The PRD specifies: score < 60 = reject, max 3 rejections per question, then force-accept with `confidence: 'low'`. In practice, the LLM's `evaluateAnswer` node may consistently reject answers that are actually good because the scoring prompt is too strict, or the user may not understand what specific improvement is needed despite feedback. After 3 rejections, the forced acceptance with `confidence: 'low'` makes the user feel they failed, and downstream nodes (forgeDocuments) may produce worse output because they see `confidence: 'low'` and don't know what to do with it.

**Why it happens:**
Quality gates are a new UX pattern. Users expect either success or a clear path to success. A loop of "rejected -> try again -> rejected -> try again -> rejected -> forced acceptance" feels like a broken interface, not a helpful process. The LLM's feedback may use Handler persona language that comes across as harsh without being actionable.

**How to avoid:**
Design the quality gate with progressive assistance, not just rejection:

1. On first rejection: Show specific feedback + a hint about what a good answer looks like
2. On second rejection: Offer the user an option to accept a weaker answer or provide a simplified alternative question
3. On third rejection: Auto-accept but frame it positively in the Handler persona ("Intel sufficient. Proceeding with available data.") instead of marking it as `confidence: 'low'` which taints downstream output
4. Track rejection count globally, not just per-question -- if the user hits 5 total rejections across the mission, lower the threshold to 40 for remaining questions

**Warning signs:**
- Users abandon the mission during the interrogation phase
- Feedback messages are long but unhelpful ("Be more specific" without saying what's vague)
- Users report feeling frustrated or "interrogated" in a bad way
- Downstream document quality is poor because low-confidence answers propagate

**Phase to address:**
Phase 3 (Interrogation Loop) -- This is the highest-risk UX phase. The rejection loop must be tested with real users before the interrogation phase is considered complete. Consider adding a "skip question" option from the start.

---

### Pitfall 7: Next.js App Router SSE Streaming Breaks on Errors

**What goes wrong:**
The `POST /api/agent` route handler creates a `ReadableStream` that wraps the LangGraph `graph.stream()` iterator. If any error occurs mid-stream (LLM timeout, parsing failure, network error), the error either: (a) crashes the stream without sending an error event to the client, leaving the UI in a perpetual "loading" state, or (b) gets swallowed by the ReadableStream's `start()` function and the stream hangs open forever.

**Why it happens:**
The Web Streams API's `ReadableStream.start()` function does not automatically propagate errors to the client. If `graph.stream()` throws, the `start()` function's promise rejects but the controller may not have been closed or an error event sent. The client's `EventSource` or `fetch()` with a reader never receives a signal that the stream ended.

**How to avoid:**
Wrap the entire streaming logic in a try/catch that always sends an error event and closes the stream:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder()
    try {
      for await (const chunk of await graph.stream(input, config)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
    } catch (error) {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'error', data: { message: error.message } })}\n\n`
      ))
    } finally {
      controller.close()
    }
  }
})
```

On the client side, implement a timeout that triggers if no event is received within 30 seconds, showing a "Connection lost" message with a retry option.

**Warning signs:**
- UI shows infinite spinner after any LLM call takes too long
- Refreshing the page is the only way to recover from errors
- No error messages shown to users during failures
- Network tab shows the SSE connection hanging open after server error

**Phase to address:**
Phase 1 (Agent Core) -- The streaming infrastructure must be built with error resilience from the start. Phase 2 (API Integration) should include specific error scenario testing.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Sending full `MissionState` in every request body (PRD design) | Simple stateless server, no server-side state management | Large payloads over SSE; no protection against state drift between client and checkpointer; client becomes source of truth over server checkpoint | V1 only -- migrate to checkpointer-as-source-of-truth in V2 where server state is authoritative |
| Using `MemorySaver` instead of `PostgresSaver` during development | Zero setup, no database dependency, faster iteration | State lost on server restart; cannot resume missions after refresh; misleading development experience | Development only -- switch to PostgresSaver before any real testing |
| Hardcoded model name instead of env var config | One fewer thing to configure | Cannot swap models without code deploy; cannot A/B test models; tied to one provider's availability | Never -- the PRD already specifies env var config, follow it |
| Character-by-character streaming via `setInterval` on client | Simple implementation, matches PRD spec | Performance degrades with long messages (DOM thrashing); cannot pause/cancel; does not work with SSR | Acceptable for V1 if messages are <500 chars. Replace with CSS animation or virtual scrolling for longer content. |
| Single-threaded graph execution | Simpler deployment, no queue infrastructure | Cannot handle concurrent missions; one slow LLM call blocks all users | Acceptable for beta/mVP with <10 concurrent users. Need task queue for production scale. |
| Using Zod v4 for validation while LangChain may expect Zod v3 | Project already uses Zod v4 per CLAUDE.md | `withStructuredOutput()` may have Zod version compatibility issues -- LangChain's structured output was built against Zod v3 API | Validate early in Phase 1. If incompatible, pin LangChain to a version that supports Zod v4, or create a Zod v3 schema bridge for LLM calls only. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@langchain/openrouter` | Using `@langchain/openai` with a custom `baseURL` instead of the dedicated `@langchain/openrouter` package | Use `ChatOpenAI` from `@langchain/openrouter` -- it handles OpenRouter-specific headers, auth, and model routing natively |
| OpenRouter API | Not setting `HTTP-Referer` and `X-Title` headers -- OpenRouter requires these for request attribution and may rate-limit or reject requests without them | Set them in the ChatOpenAI configuration or as default headers. The PRD shows this correctly. |
| PostgresSaver checkpointer | Forgetting to run `checkpointer.setup()` to create the checkpoint tables before first use | Call `setup()` once during app initialization (e.g., in a startup script or lazy-initialization pattern). The tables must exist before any graph execution with a thread_id. |
| PostgresSaver + Supabase | Using the Supabase connection pooler URL (port 6543) instead of the direct connection URL (port 5432) -- PostgresSaver may need direct connections for transactional writes | Test both connection modes. If the pooler causes issues with checkpoint writes, use the direct connection string for the checkpointer only. |
| PostgresSaver + Prisma | Expecting Prisma to manage the checkpoint tables -- PostgresSaver creates its own tables via `setup()`, they are not in `schema.prisma` | Let PostgresSaver own its tables. Do not add them to Prisma schema. They are an internal implementation detail. |
| `@react-pdf/renderer` | Using components that rely on browser APIs (window, document) -- react-pdf renders in a Node.js environment for PDF generation | Only use react-pdf's supported subset of components. Test PDF generation on the server route, not just in browser preview. |
| `docx` library | Expecting Markdown to render automatically -- the `docx` library uses its own document model, not Markdown | Write a Markdown-to-docx converter that maps headings, paragraphs, lists, and bold/italic to docx's `TextRun`, `Paragraph`, and `HeadingLevel` types. |
| SSE client in browser | Using `EventSource` which only supports GET requests -- the PRD specifies POST for `/api/agent` | Use `fetch()` with `response.body.getReader()` instead of `EventSource`. `EventSource` cannot send POST bodies. |
| OpenRouter rate limits | No retry/backoff on 429 responses -- OpenRouter has per-model rate limits that vary by provider | Implement exponential backoff with jitter. Start at 1s, max 3 retries. Surface "The Handler is waiting for clearance..." message to user during backoff. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full state in every request body | Payload size grows linearly with interrogation progress (question history, agent log accumulate) | Only send state deltas or the minimum needed for the current action. For `submit_answer`, send only `threadId` + `answer` + `questionId` -- let the checkpointer provide the full state. | 10+ questions into a mission, the payload could exceed 50KB per request |
| Sequential LLM calls in `forgeDocuments` | Both resume and cover letter generated in one node, sequentially. Two separate LLM calls take 15-30s combined | Stream progress updates via `config.writer()` during generation so the user sees activity. Consider running resume and cover letter generation in parallel using `Promise.all()`. | Always slow -- the user waits 15-30s with no feedback if streaming is not implemented |
| PostgresSaver checkpoint writes | Every graph step writes a full state checkpoint to Postgres. With large state objects, this becomes a bottleneck | Keep state lean. Store large text (generated resume, cover letter) separately or compress before checkpointing. Use `state.__checkpoint_id__` to avoid unnecessary writes. | At 20+ checkpoints per mission with full document content in state |
| Client-side Zustand store bloat | Storing the full `MissionState` including all generated content, logs, and history in memory | Zustand is fine for this at mission scale. But clear the store on mission completion/reset. Watch for memory leaks if components subscribe to granular slices without cleanup. | Multiple missions in same tab session without reset |
| Character-by-character streaming of long messages | 500-char Handler message at 15ms/char = 7.5s of animation. User reads faster than it types. | For messages >200 chars, increase speed to 8-10ms/char or offer a "skip" button that instantly reveals the full message. | Any Handler message over 3 sentences |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Sending OPENROUTER_API_KEY to the client | API key exposed in browser, usable by anyone to make LLM calls at the project owner's expense | All LLM calls MUST go through `/api/agent` server route. Never pass the API key to client-side code. Verify this in code review. |
| Passing user-provided content directly into LLM prompts without sanitization | Prompt injection via job description or resume paste. A malicious JD could instruct the LLM to output harmful content, ignore persona rules, or exfiltrate data | Sanitize inputs: strip any content that looks like system prompts or instructions. Wrap user content in clear delimiters in the prompt. Never trust LLM output without validation. |
| No rate limiting on `/api/agent` | A single user can spam the endpoint, running unlimited LLM calls and generating massive OpenRouter bills | Implement per-user rate limiting (e.g., 60 requests/minute). Track mission state to prevent starting multiple concurrent missions. |
| Thread ID spoofing | A user could guess another user's thread_id and resume their mission, seeing their job descriptions and answers | Generate thread IDs server-side using crypto.randomUUID(). Never accept a client-provided thread_id. Associate thread IDs with the authenticated user's session. |
| PDF/DOCX export with unsanitized content | If the generated Markdown contains HTML/script tags, the export libraries might render them, creating XSS vectors in the exported files | Sanitize all generated content before passing to export libraries. Strip HTML tags. Validate that the export only contains text content. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indication of how many questions remain | User has no idea how long the interrogation will take, creating anxiety and potential abandonment | Show "Question 3 of ~7" counter. The `planInterrogation` node should estimate remaining questions and emit it as a stream event. |
| Rejection feedback is generic | User submits an answer, gets rejected, but the feedback says "be more specific" without saying *what* to be specific about | The `evaluateAnswer` prompt must include explicit instructions to cite the exact deficiency. Example: "You mentioned 'managed a team' but did not state the team size or any measurable outcome. Restate with specific metrics." |
| "Skip question" is not available | User genuinely does not have experience in a gap area and cannot produce a good answer no matter how many times they try | Add a skip option that accepts a null/weak answer and marks the gap as `confidence: 'low'`. This is different from force-accepting after 3 rejections -- the user chooses to skip. |
| No progress saving during interrogation | If the user refreshes the page or the connection drops mid-mission, all progress is lost | With PostgresSaver, the checkpoint persists. On reconnection, detect an active thread_id in the session and offer to resume. V1 may defer this but the checkpointer makes it possible. |
| ATS stress test feels arbitrary | Score appears with no explanation of how it was calculated, making it feel like a random number | Show the exact keyword matching: each primaryTarget keyword listed with FOUND/MISSING. The score is `hits / total * 100`. Transparency builds trust. |
| Reforge loop is confusing | User gets COMPROMISED on ATS test, clicks REFORGE, but the reforge uses the same inputs and produces similar results | On reforge, inject the ATS misses into the forgeDocuments prompt explicitly: "The previous resume was missing these keywords: [misses]. Ensure they are included this time." |

## "Looks Done But Isn't" Checklist

- [ ] **Interrupt resume:** Often missing the `Command({ resume: value })` pattern -- verify that resuming actually works end-to-end (start graph, hit interrupt, resume with user input, graph continues correctly)
- [ ] **SSE error propagation:** Often missing error events in the stream -- verify that an LLM timeout produces a visible error on the client, not an infinite spinner
- [ ] **Structured output with OpenRouter:** Often assumed to work the same as native OpenAI -- verify `withStructuredOutput()` actually returns parsed objects when going through OpenRouter to the target model
- [ ] **PostgresSaver table creation:** Often forgotten in deployment -- verify `checkpointer.setup()` runs and checkpoint tables exist before any graph execution
- [ ] **PDF export of real content:** Often tested with placeholder text only -- verify PDF generation works with actual LLM-generated Markdown that includes lists, bold, headers, and special characters
- [ ] **DOCX export formatting:** Often produces plain text without formatting -- verify bold, italic, headings, and bullet points render correctly in the exported .docx
- [ ] **Quality gate threshold calibration:** Often set to arbitrary values -- verify the scoring prompt produces scores in the expected range (0-100) and the 60-point threshold actually separates good from bad answers in practice
- [ ] **ATS simulation determinism:** Often assumed to be consistent -- verify that running the same resume+JD through `runATSSimulation` twice produces the same score (or document why it differs)
- [ ] **Handler persona consistency:** Often breaks on error messages -- verify that error states, loading messages, and edge cases all use Handler persona language, not generic "Something went wrong"
- [ ] **Mission reset cleanup:** Often leaves stale state -- verify that "Run New Mission" clears both Zustand store and any server-side checkpoint thread

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Side effects before interrupt re-executing | MEDIUM | Move the side effect after the interrupt. If the side effect's result is needed for the interrupt payload, cache it in the graph state in a preceding node. |
| GraphInterrupt swallowed by try/catch | LOW | Add `if (e instanceof GraphInterrupt) throw e` to all catch blocks in nodes containing interrupt(). Search for all try/catch in node files. |
| Structured output parsing failure kills mission | MEDIUM | Add retry wrapper around all `withStructuredOutput()` calls. If all retries fail, return a safe default state that allows the graph to continue with degraded quality rather than crashing. |
| Quality gate too aggressive (users rage-quit) | MEDIUM | Lower threshold from 60 to 45. Add skip option. Add progressive assistance on repeated rejections. A/B test threshold values. |
| SSE stream hangs on error | LOW | Add try/catch/finally in ReadableStream.start() that always closes controller. Add client-side timeout (30s) with retry UI. |
| PostgresSaver tables missing in production | LOW | Add `checkpointer.setup()` call in app initialization. Add a health check that verifies checkpoint tables exist. |
| OpenRouter rate limiting | LOW | Implement exponential backoff. Surface waiting message to user. If persistent, fall back to a cheaper/faster model for non-critical nodes (e.g., ATS simulation). |
| PDF export fails with complex Markdown | MEDIUM | Add a Markdown-to-PDF preprocessor that strips unsupported syntax before passing to @react-pdf/renderer. Test with edge cases: tables, code blocks, nested lists. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Side effects before interrupt re-execute | Phase 1 (Agent Core) | Write a test that logs node execution count. Run graph, interrupt, resume. Assert node ran exactly twice (once initial, once resume) and LLM call count matches expectations. |
| invoke() vs stream() for interrupt detection | Phase 1 (Agent Core) | Assert that `graph.stream()` emits `__interrupt__` chunk. Assert that the SSE client receives and parses it correctly. |
| GraphInterrupt swallowed by try/catch | Phase 1 (Agent Core) | Add a node with try/catch around interrupt(). Verify the graph still pauses. Add lint rule. |
| OpenRouter ChatOpenAI config mismatch | Phase 1 (Agent Core) | Make a test LLM call through @langchain/openrouter to the target model. Verify structured output works. |
| Structured output parsing failures | Phase 1 (Agent Core) | Test with 10 different job descriptions. Verify all produce valid parsed output from analyzeJD. Add retry wrapper. |
| Quality gate rejection loop UX | Phase 3 (Interrogation Loop) | User test with 5 people. Measure completion rate and frustration scores. Tune threshold and feedback quality. |
| SSE streaming error handling | Phase 2 (API Integration) | Kill the LLM mid-stream (timeout). Verify client shows error, not infinite spinner. |
| PostgresSaver setup | Phase 1 (Agent Core) | Run `checkpointer.setup()` in test suite. Verify tables exist. Run a full graph execution with checkpoint. |
| PDF/DOCX export formatting | Phase 4 (Document Generation) | Generate 5 different resumes with varied Markdown. Open each PDF and DOCX. Verify formatting matches expectations. |
| ATS simulation accuracy | Phase 4 (Document Generation) | Run the same resume+JD pair 3 times. Verify scores are within 5 points of each other. Compare ATS score with manual keyword count. |
| Mission reset cleanup | Phase 5 (Integration & Polish) | Start a mission, answer 3 questions, click "Run New Mission". Verify Zustand store is empty and no stale thread IDs remain. |

## Sources

- HIGH confidence -- LangGraph.js official docs (human-in-the-loop concept guide, streaming how-to, persistence) via Context7 `/websites/langchain_oss_javascript_langgraph`
- HIGH confidence -- LangChain.js official docs (structured output, error handling, @langchain/openrouter integration) via Context7 `/websites/langchain_oss_javascript`
- HIGH confidence -- Next.js official docs (streaming in route handlers, Web Streams API) via Context7 `/vercel/next.js`
- HIGH confidence -- LangGraph.js "Common Pitfalls" section on interrupt resumption behavior (side effects re-execution, try/catch swallowing GraphInterrupt, multiple interrupts index matching)
- MEDIUM confidence -- OpenRouter integration patterns via Context7 `/websites/langchain_oss_javascript/integrations/chat/openrouter`
- MEDIUM confidence -- @react-pdf/renderer and docx library limitations (training data, not verified against current docs -- flag for Phase 4 validation)
- LOW confidence -- ATS simulation accuracy limitations (training data -- real ATS systems use proprietary algorithms; simulation can only approximate keyword matching)

---
*Pitfalls research for: LangGraph.js + Next.js AI Agent (The Infiltrator)*
*Researched: 2026-05-02*
