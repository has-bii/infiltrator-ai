# Project Research Summary

**Project:** The Infiltrator -- Agentic Job Application Assistant
**Domain:** AI-powered agent with LangGraph.js orchestration, Next.js 16 App Router, Postgres checkpointer, OpenRouter LLM
**Researched:** 2026-05-02
**Confidence:** HIGH

## Executive Summary

The Infiltrator is a spy-themed, agentic job application assistant that differentiates from competitors (Kickresume, Jobscan, ResumeWorded, Enhancv, Rezi) through a closed-loop Q&A interrogation with quality gates -- not just static form fields or one-shot AI generation. Experts build this type of product with a stateful graph-based agent framework (LangGraph.js) that supports interrupt-based human-in-the-loop, persistent checkpointing (PostgresSaver), and real-time streaming (SSE). The agent analyzes a job description, dynamically interrogates the user to close identified "intel gaps," rejects weak answers with specific feedback, then forges tailored resume and cover letter documents. The entire experience is wrapped in a narrative-driven terminal UI where the LLM adopts a "Handler" spy persona.

The recommended approach is a self-contained LangGraph.js graph running inside Next.js API routes, using PostgresSaver for durable checkpoint persistence and custom SSE streaming to the client via Zustand. This avoids external dependencies like LangGraph Platform/Cloud. The critical technical challenge is the interrupt/resume cycle: LangGraph re-executes the entire node on resume, so nodes containing `interrupt()` must be structured so that expensive side effects (LLM calls) either precede the interrupt in a separate node or are guarded by state checks. The PRD's claim that "the server is stateless and the client owns all state" is architecturally incompatible with LangGraph's checkpoint model -- the PostgresSaver must be the canonical state store, with the client holding only UI state in Zustand.

Key risks center on the interrupt/resume mechanism (side-effect re-execution, GraphInterrupt swallowed by try/catch), LLM structured output reliability through OpenRouter, and the quality gate rejection loop creating frustrating UX dead ends. All are mitigable with established patterns from LangGraph documentation and explicit handling strategies detailed in PITFALLS.md. The stack is entirely compatible -- all new packages (langgraph, checkpointer-postgres, zustand, framer-motion, react-pdf, docx) work with the existing Next.js 16, React 19, and Zod v4 setup.

## Key Findings

### Recommended Stack

All technologies are verified compatible with the existing codebase (Next.js 16, React 19, Zod v4, Supabase Postgres).

**Core technologies:**
- **@langchain/langgraph ^1.2.9** -- Agent orchestration with `interrupt()` for human-in-the-loop, `PostgresSaver` for durable state, `Command({ resume })` for resuming paused graphs. The only JS framework with native interrupt-based HITL.
- **@langchain/langgraph-checkpoint-postgres ^1.0.1** -- Postgres-backed checkpoint persistence. Uses `pg` driver directly (already installed), creates its own tables via `setup()`. No Prisma involvement needed.
- **@langchain/openrouter ^0.2.3** (already installed) -- Purpose-built OpenRouter adapter. Handles provider-specific headers natively. Prefer over `@langchain/openai` with custom `baseURL`.
- **Zustand ^5.0.12** -- Client-side UI state. Lightweight (1KB), no provider wrapper. Holds threadId, phase, currentQuestion, isStreaming, results. Does NOT duplicate the LangGraph checkpoint.
- **@react-pdf/renderer ^4.5.1** -- Server-side PDF generation via `renderToBuffer()`. Programmatic React component tree for ATS-optimized resume PDFs.
- **docx ^9.6.1** -- DOCX generation with declarative API (`Document`, `Paragraph`, `TextRun`). Server-side only, no browser dependency.
- **framer-motion ^12.38.0** -- Animations for phase transitions, ATS score counter, input feedback. Required for numeric interpolation and layout animations beyond CSS.

**Do NOT use:** Vercel AI SDK (cannot express stateful graphs), LangGraph Platform/Cloud (overkill for single-agent in-process), Prisma for checkpoint tables (fights checkpointer's internal schema), `EventSource` (POST-only API requires `fetch` + `ReadableStream`).

### Expected Features

**Must have (table stakes) -- users expect these from any AI resume tool:**
- JD analysis with keyword extraction -- every competitor does this
- ATS compatibility scoring with keyword hit/miss -- market standard across Jobscan, ResumeWorded, Rezi
- Resume and cover letter generation from user inputs -- core value prop
- PDF and DOCX export -- non-negotiable output formats
- Real-time progress feedback -- users abandon silent tools
- Clear input prompts with guidance -- vague UI causes drop-off

**Should have (competitive differentiators):**
- Spy-themed Handler persona -- zero-cost brand differentiation, no competitor does narrative-driven UX
- Closed-loop Q&A with quality gates and rejection feedback -- no competitor iterates on user inputs
- Dynamic question types (LONG_TEXT, MULTIPLE_CHOICE, SCENARIO) -- prevents form fatigue
- Character-by-character streaming -- typewriter immersion effect
- ATS verdict narrative (CLEARED / CONDITIONALLY_CLEARED / COMPROMISED) -- memorable scoring
- Reforge on COMPROMISED verdict -- agent-driven iteration, not fire-and-forget

**Defer (v2+):**
- Template galleries, drag-and-drop editor -- massive scope creep, incompatible with agent-driven paradigm
- LinkedIn profile import -- OAuth + API volatility, paste-resume is sufficient for V1
- Mobile layout -- terminal UI requires tablet+ width
- Mission history -- requires DB schema changes, checkpoint is for active sessions only
- Edit-before-export inline editing -- add after core loop is validated

### Architecture Approach

The architecture follows a strict separation: **server owns execution state** (PostgresSaver checkpoint), **client owns UI state** (Zustand), bridged by SSE streaming with typed custom events.

**Major components:**
1. **lib/agent/graph.ts** -- StateGraph definition with compiled singleton. Nodes: analyzeJD, askQuestion, evaluateAnswer, qualityGate, forgeDocuments, runATSSimulation. Compiled with PostgresSaver checkpointer.
2. **lib/agent/nodes/\*** -- Pure functions, each receives state + config, returns partial state update or `Command({ goto })`. No shared mutable state. Testable independently.
3. **app/api/agent/route.ts** -- Single endpoint handling all mission actions. Auth guard, graph.stream() with `streamMode: "custom"`, SSE pipe via ReadableStream. Client sends `{ action, payload, threadId }`, never full state.
4. **lib/store/useMissionStore.ts** -- Zustand store consuming SSE events. Maps `{ type: "log"|"phase"|"question"|"feedback"|"state"|"done"|"error" }` to store actions.
5. **MissionController.tsx** -- Phase router reading `phase` from Zustand, rendering appropriate phase component. No React Router for phases.
6. **PostgresSaver (lib/agent/checkpointer.ts)** -- Singleton. Owns checkpoint tables (`checkpoints`, `checkpoint_writes`, `checkpoint_blobs`). Separate from Prisma's tables.

**Critical architecture correction:** The PRD states the server is stateless and the client owns all state. This is wrong for LangGraph's interrupt model. The `interrupt()`/`Command({ resume })` contract requires PostgresSaver as the canonical state store. The client sends only `{ threadId, action, payload: { answer } }` and the server resumes from the checkpoint.

### Critical Pitfalls

1. **Side effects before `interrupt()` re-execute on resume** -- LangGraph re-executes the entire node from scratch on resume. LLM calls placed before `interrupt()` run twice, wasting tokens and potentially changing the question. Fix: generate question in a separate node, or guard with `if (!state.currentQuestion)` state check. Validate in Phase 1.

2. **`GraphInterrupt` swallowed by try/catch** -- `interrupt()` works by throwing a special error. Catch-all blocks in nodes catch it silently, preventing the graph from pausing. Fix: always re-throw `GraphInterrupt` in catch blocks. Establish as a lint rule or code review checkpoint.

3. **LLM structured output parsing failures cascade through the graph** -- A single `withStructuredOutput()` failure kills the entire mission, potentially after 5+ questions answered. Fix: wrap all structured output calls in retry loop (3 attempts, exponential backoff) with fallback to manual JSON extraction. Validate critical fields before returning from nodes.

4. **Quality gate rejection loop creates unrecoverable UX dead ends** -- Consistent rejection with unhelpful feedback causes user abandonment. The "force-accept after 3 rejections with confidence: low" taints downstream document quality. Fix: progressive assistance (hints on rejection 2, simplified question on 3), positive framing on auto-accept, skip option from the start, and lower threshold after global rejection count exceeds 5.

5. **SSE streaming breaks silently on errors** -- Errors mid-stream leave the UI in perpetual loading state. Fix: wrap streaming in try/catch/finally that always sends error event and closes stream. Add 30s client-side timeout with retry UI.

## Implications for Roadmap

Based on the combined research, the project should be built in 6 phases that follow the dependency graph from ARCHITECTURE.md. The critical path runs through Phase 1-3 (agent core with interrupt/resume), which must be validated end-to-end before investing in document generation and the full client UI.

### Phase 1: Agent Foundation
**Rationale:** All other work depends on the graph running correctly. The interrupt/resume cycle is the hardest technical challenge and the highest-risk component. Validating it early prevents architecture mistakes from propagating.
**Delivers:** Working graph that can analyze a JD, pause for user input, resume with an answer, and persist state across server restarts.
**Addresses:** JD analysis, state schema, LLM integration, PostgresSaver setup
**Avoids:** Pitfalls 1 (interrupt re-execution), 2 (invoke vs stream), 3 (GraphInterrupt swallowed), 5 (structured output failures)
**Key tasks:** Install dependencies, state schema, LLM singleton, checkpointer singleton, prompt templates, analyzeJD node, basic graph wiring, SSE streaming endpoint, validate interrupt/resume with curl

### Phase 2: Interrogation Loop
**Rationale:** The quality gate loop is the primary differentiator and the highest-risk UX element. It must be built and tuned before document generation because document quality depends on collected interrogation data.
**Delivers:** Full Q&A loop with question generation, answer evaluation, quality gate with rejection/acceptance, and progressive feedback.
**Addresses:** Interrogation Q&A, dynamic question types, quality gates, Handler persona streaming
**Avoids:** Pitfall 6 (quality gate UX dead ends)
**Key tasks:** askQuestion node, evaluateAnswer node, qualityGate node with Command routing, retry wrapper for structured output, question progress counter, rejection feedback tuning

### Phase 3: Document Generation
**Rationale:** Once the interrogation loop reliably collects high-quality data, documents can be generated from that data. PDF/DOCX export is a parallel concern with known libraries but has SSR edge cases that need testing.
**Delivers:** Resume and cover letter generation from operative profile, ATS simulation with keyword scoring and verdict, PDF and DOCX export endpoints.
**Addresses:** Resume generation, cover letter generation, ATS simulation, PDF export, DOCX export, reforge on failure
**Avoids:** Integration gotchas with @react-pdf/renderer SSR, docx Markdown-to-docx conversion
**Key tasks:** forgeDocuments node, runATSSimulation node, generatePDF utility, generateDOCX utility, export API route, reforge logic

### Phase 4: Mission Client
**Rationale:** With the server-side agent fully functional, the client layer can be built against a real working backend. Building UI before the agent works leads to mock-driven development and integration pain.
**Delivers:** Full mission UI with all phases, terminal styling, SSE consumption, phase routing, document previews.
**Addresses:** All UI phases (Briefing, Intel Acquisition, Operative Profile, Interrogation, Forgery, Stress Test, Extraction), Handler persona, streaming UX, framer-motion animations
**Avoids:** Anti-patterns around React Router for phases, client-side state duplication
**Key tasks:** Zustand store with SSE consumer, MissionController, phase components, terminal UI components (TerminalPanel, HandlerMessage, TerminalInput), document preview components, framer-motion animations

### Phase 5: Integration and Dashboard
**Rationale:** Wires the mission flow into the existing app shell. Auth guards, navigation from dashboard, mission cleanup.
**Delivers:** NewMissionCard on dashboard, /mission route with full-screen layout, auth protection, end-to-end flow from dashboard to document download.
**Addresses:** Dashboard integration, navigation, auth guards, mission reset cleanup
**Avoids:** Security mistakes (thread ID spoofing, missing auth on endpoints)
**Key tasks:** Dashboard CTA, mission layout, auth guard on /api/agent and /mission, mission reset logic, end-to-end testing

### Phase 6: Polish and Hardening
**Rationale:** Production readiness. Error recovery, edge cases, performance optimization, UX refinement based on testing.
**Delivers:** Error recovery UI, client-side timeout with retry, progress saving for active missions, Handler persona consistency in error states, ATS score determinism verification.
**Addresses:** Pitfall 7 (SSE error handling), security hardening, performance optimization, UX refinements from PITFALLS.md "Looks Done But Isn't" checklist
**Key tasks:** Error boundary components, retry UI, prompt tuning, quality gate calibration, security audit, "Looks Done But Isn't" checklist verification

### Phase Ordering Rationale

- Phase 1 must come first because the graph topology (node structure, edge routing, interrupt placement) is the foundation everything else builds on. Getting interrupt/resume wrong means rewriting the entire graph.
- Phase 2 follows immediately because the interrogation loop validates the interrupt pattern under real usage (multiple pause/resume cycles). This is where Pitfall 1 and 6 are most likely to surface.
- Phase 3 depends on Phase 2's interrogation data being reliable. Generating documents from low-quality answers wastes development time on a feature that does not work well.
- Phase 4 can partially parallelize with Phase 3 (client components and document generation are independent), but full integration requires Phase 3's export endpoints.
- Phase 5 is thin integration work that depends on Phase 4 having a functional UI.
- Phase 6 is polish that depends on the entire flow working end-to-end.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** The interrupt/resume pattern with PostgresSaver is well-documented but has subtle behaviors (node re-execution, checkpoint granularity). Needs a focused spike to validate the askQuestion -> evaluateAnswer -> qualityGate loop end-to-end before building remaining nodes.
- **Phase 3:** @react-pdf/renderer has known SSR issues in Next.js and Markdown-to-PDF conversion edge cases (tables, nested lists). The docx library needs a custom Markdown-to-docx converter. Both need hands-on validation.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Quality gate logic is application-level, no external API research needed. LLM prompt tuning is iterative, not research-dependent.
- **Phase 4:** Zustand + framer-motion + shadcn/ui are well-documented with standard patterns. Terminal UI is CSS work.
- **Phase 5:** Integration with existing better-auth and dashboard is a repeat of established patterns in the codebase.
- **Phase 6:** Error handling, security, and polish are standard engineering practices.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified compatible via npm registry and Context7 docs. Existing packages (langchain, openrouter, core) already installed. Version matrix confirmed. |
| Features | MEDIUM | Competitor analysis done via direct site reads (WebSearch API was non-functional). Feature priorities are sound but competitor capabilities may have changed since research date. |
| Architecture | HIGH | LangGraph.js patterns (interrupt, Command, PostgresSaver, streaming) verified against official docs via Context7. Architecture correction (server-owns-state) is based on documented LangGraph behavior, not inference. |
| Pitfalls | HIGH | All 7 critical pitfalls sourced from LangGraph official "Common Pitfalls" section and verified via Context7. Integration gotchas from documented library behaviors. Recovery strategies are concrete and testable. |

**Overall confidence:** HIGH

### Gaps to Address

- **@react-pdf/renderer SSR compatibility with Next.js 16:** Verified compatible with React 19, but specific SSR behavior in App Router route handlers needs hands-on validation. Plan a spike in Phase 3 that generates a real PDF with complex Markdown (lists, bold, headers) before committing to the export architecture.
- **OpenRouter structured output reliability:** `withStructuredOutput()` through OpenRouter may behave differently than native OpenAI depending on the underlying model provider. Validate in Phase 1 with the actual target model (e.g., anthropic/claude-sonnet-4-5) before building node logic. Have a manual JSON parsing fallback ready.
- **Quality gate threshold calibration:** The score threshold of 60 is a guess from the PRD. The actual distribution of LLM-generated scores is unknown and may need tuning based on real answer evaluation results. Plan iterative tuning in Phase 2.
- **Supabase connection pooling vs PostgresSaver:** PostgresSaver may need direct connections (port 5432) rather than Supabase's pooler URL (port 6543) for transactional checkpoint writes. Test both in Phase 1.
- **ATS simulation determinism:** Keyword matching should be deterministic, but the exact scoring algorithm and how it handles partial matches, synonyms, and stemming needs definition. This is application logic, not a research gap, but should be specified before Phase 3 implementation.

## Sources

### Primary (HIGH confidence)
- Context7: `/websites/langchain_oss_javascript_langgraph` -- interrupts, human-in-the-loop, PostgresSaver, streaming (custom, updates), StateSchema, Command routing, Common Pitfalls
- Context7: `/websites/langchain_oss_javascript` -- @langchain/openrouter integration, structured output, error handling
- Context7: `/vercel/next.js` -- App Router streaming, Web Streams API, route handlers
- Context7: `/diegomura/react-pdf` -- server-side PDF generation, Document/Page/Text API
- Context7: `/dolanmiu/docx` -- DOCX generation, Document/Paragraph/TextRun/Packer API
- npm registry -- verified current versions of all packages (2026-05-02)

### Secondary (MEDIUM confidence)
- Competitor sites (kickresume.com, jobscan.co, resumeworded.com, enhancv.com, rezi.ai) -- feature comparison via direct site reads
- LangGraph.js integration patterns for PostgresSaver with Supabase -- community patterns, not explicitly documented

### Tertiary (LOW confidence)
- ATS simulation accuracy -- real ATS systems use proprietary algorithms; keyword matching is an approximation. No way to validate against actual ATS systems.
- Zod v4 compatibility with LangGraph's `withStructuredOutput()` -- project uses Zod v4, LangChain structured output was built against Zod v3 API. Needs runtime validation.

---
*Research completed: 2026-05-02*
*Ready for roadmap: yes*
