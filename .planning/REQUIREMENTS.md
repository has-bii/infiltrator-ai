# Requirements: The Infiltrator — Application War Room

**Defined:** 2026-05-02
**Core Value:** Users get a targeted, ATS-optimized resume and cover letter through an interactive AI-guided process that dynamically adapts questions based on their actual experience gaps.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Dashboard & Routes

- [ ] **DASH-01**: User can launch a new mission from the existing dashboard via a NewMissionCard component
- [ ] **DASH-02**: User is redirected to /mission route with full-screen terminal layout (no sidebar)
- [ ] **DASH-03**: /mission route requires authentication — unauthenticated users are redirected to login
- [ ] **DASH-04**: User can return to dashboard from mission after extraction or by aborting

### Agent Infrastructure

- [ ] **AGNT-01**: LangGraph StateGraph is defined with 6 nodes: analyzeJD, planInterrogation, evaluateAnswer, qualityGate, forgeDocuments, runATSSimulation
- [ ] **AGNT-02**: MissionState schema captures job description, operative profile, intel gaps, question history, generated documents, ATS result, agent log, and current phase
- [ ] **AGNT-03**: PostgresSaver checkpointer persists agent state to PostgreSQL (Supabase) via threadId
- [ ] **AGNT-04**: interrupt() is used at planInterrogation and qualityGate nodes for human-in-the-loop
- [ ] **AGNT-05**: Command({ resume }) pattern is used to resume the graph after user input
- [ ] **AGNT-06**: LLM model is configurable via OPENROUTER_MODEL env var (default: anthropic/claude-sonnet-4-5)
- [ ] **AGNT-07**: All LLM calls go through @langchain/openrouter with The Handler system prompt
- [ ] **AGNT-08**: Nodes use withStructuredOutput() for type-safe LLM responses matching defined schemas
- [ ] **AGNT-09**: Node code before interrupt() is guarded against re-execution side effects

### JD Analysis

- [ ] **JDA-01**: User can paste a job description (minimum 100 characters) into the Intel Acquisition phase
- [ ] **JDA-02**: analyzeJD node extracts primaryTargets (required skills/keywords), secondaryTargets (preferred skills), and intelGaps (missing qualifications) as structured data
- [ ] **JDA-03**: System log displays analysis progress in real-time during JD processing

### Interrogation Engine

- [ ] **INTG-01**: planInterrogation node selects the next unfilled intel gap and generates an appropriate question
- [ ] **INTG-02**: Questions have three types: LONG_TEXT (open-ended), MULTIPLE_CHOICE (proficiency), SCENARIO (behavioral/STAR)
- [ ] **INTG-03**: UI dynamically switches input component based on question type (Textarea, RadioGroup, STAR guide)
- [ ] **INTG-04**: evaluateAnswer node scores answers on specificity (real tech/companies), metrics (numbers), and relevance (addresses the gap)
- [ ] **INTG-05**: Quality gate rejects answers scoring below 60 with specific, actionable feedback citing the exact deficiency
- [ ] **INTG-06**: Rejection counter tracks per-question rejection count; after 3 rejections, answer is force-accepted with low confidence
- [ ] **INTG-07**: On rejection, input shows red ring animation, value clears, feedback streams in via HandlerMessage
- [ ] **INTG-08**: On acceptance, input shows green border flash, gap marked filled, log entry appended
- [ ] **INTG-09**: Interrogation loops until all intel gaps are filled or force-accepted

### Document Generation

- [ ] **DOCG-01**: forgeDocuments node generates an ATS-optimized resume in Markdown (~1 page) from operative profile + job targets
- [ ] **DOCG-02**: forgeDocuments node generates a cover letter in Markdown (3-paragraph format) from operative profile + job description
- [ ] **DOCG-03**: Resume uses action verbs, leads with impact metrics, incorporates keywords naturally
- [ ] **DOCG-04**: Both documents are previewed in side-by-side Card components during the Forgery phase
- [ ] **DOCG-05**: forgeDocuments node is idempotent — callable multiple times for reforge without side effects

### ATS Simulation

- [ ] **ATS-01**: runATSSimulation node scores the generated resume against primaryTargets from JD
- [ ] **ATS-02**: Score displays as animated Progress bar (0 to final score over 2.5s)
- [ ] **ATS-03**: Each keyword displays as Badge — green FOUND or red MISSING
- [ ] **ATS-04**: Verdict displayed as large Badge: CLEARED (≥75), CONDITIONALLY_CLEARED (50-74), COMPROMISED (<50)
- [ ] **ATS-05**: On COMPROMISED verdict, user can trigger REFORGE DOCUMENT to re-run forgeDocuments + runATSSimulation

### Streaming & Real-time

- [ ] **STRM-01**: POST /api/agent endpoint streams agent execution via Server-Sent Events
- [ ] **STRM-02**: SSE events are typed: log, phase, question, feedback, state, done, error
- [ ] **STRM-03**: graph.stream() with streamMode "custom" is used (not invoke) — invoke does not surface interrupt information
- [ ] **STRM-04**: Nodes emit typed events via config.writer() for clean client-side dispatch
- [ ] **STRM-05**: HandlerMessage component renders text character-by-character at 15-20ms intervals with blinking cursor

### Export

- [ ] **EXPR-01**: User can download resume as PDF via @react-pdf/renderer (renderToBuffer)
- [ ] **EXPR-02**: User can download cover letter as DOCX via docx library (Packer.toBuffer)
- [ ] **EXPR-03**: POST /api/export endpoint returns binary file with Content-Disposition attachment header
- [ ] **EXPR-04**: Extraction phase shows two download cards: Resume (.pdf) and Cover Letter (.docx)

### UI & Terminal

- [ ] **TERM-01**: Mission route uses full-screen layout with no app sidebar or top nav
- [ ] **TERM-02**: Two-panel layout: system log panel (~35% width, left) and main interaction panel (~65%, right)
- [ ] **TERM-03**: Phase indicator (top bar) shows current phase name and progress (Phase X/6)
- [ ] **TERM-04**: Briefing screen streams Handler intro text character-by-character with ACCEPT MISSION CTA
- [ ] **TERM-05**: System log panel auto-scrolls, styles entries by level: system (muted), handler (accent), alert (destructive)
- [ ] **TERM-06**: Skeleton loading states display during LLM calls
- [ ] **TERM-07**: Handler persona is maintained throughout — spy vocabulary, no filler phrases, tactical tone
- [ ] **TERM-08**: RUN NEW MISSION button resets store and returns to Phase 0

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Session Persistence

- **SESS-01**: User can resume an incomplete mission after page refresh (via PostgresSaver checkpoint retrieval)
- **SESS-02**: Dashboard shows active missions list with resume capability

### Content Editing

- **EDIT-01**: User can edit generated resume text inline before export (contenteditable or markdown editor)
- **EDIT-02**: User can edit generated cover letter text inline before export

### Mission History

- **HIST-01**: User can view completed mission history on dashboard
- **HIST-02**: User can re-download documents from past missions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Template gallery with visual previews | Massive design investment, conflicts with agent-driven approach. Single ATS-optimized template sufficient. |
| Drag-and-drop resume editor | Full WYSIWYG editor project. Conflicts with "AI generates, user reviews" paradigm. |
| LinkedIn profile import | LinkedIn API restrictions change frequently. Scraping violates ToS. Paste-resume workflow is lower friction. |
| Multiple resume versions per mission | PRD V1 scope constraint. Reforge option serves the same need iteratively. |
| Real ATS system integration | ATS vendors don't expose parsing APIs. Keyword simulation is the honest approach. |
| Mobile layout | Terminal UI is unusable at mobile widths. Would require separate mobile UX. Tablet+ only (≥768px). |
| Internationalization | Handler persona is English-optimized. Translation would require persona redesign. |
| Mission history persistence to DB | PRD V1 constraint — PostgresSaver checkpoint table only for active sessions. |
| Grammar/spell checking | Post-forgery validation. Not core to agent loop. V1.x consideration. |
| OAuth/social login | Existing email+password auth sufficient. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DASH-01 | — | Pending |
| DASH-02 | — | Pending |
| DASH-03 | — | Pending |
| DASH-04 | — | Pending |
| AGNT-01 | — | Pending |
| AGNT-02 | — | Pending |
| AGNT-03 | — | Pending |
| AGNT-04 | — | Pending |
| AGNT-05 | — | Pending |
| AGNT-06 | — | Pending |
| AGNT-07 | — | Pending |
| AGNT-08 | — | Pending |
| AGNT-09 | — | Pending |
| JDA-01 | — | Pending |
| JDA-02 | — | Pending |
| JDA-03 | — | Pending |
| INTG-01 | — | Pending |
| INTG-02 | — | Pending |
| INTG-03 | — | Pending |
| INTG-04 | — | Pending |
| INTG-05 | — | Pending |
| INTG-06 | — | Pending |
| INTG-07 | — | Pending |
| INTG-08 | — | Pending |
| INTG-09 | — | Pending |
| DOCG-01 | — | Pending |
| DOCG-02 | — | Pending |
| DOCG-03 | — | Pending |
| DOCG-04 | — | Pending |
| DOCG-05 | — | Pending |
| ATS-01 | — | Pending |
| ATS-02 | — | Pending |
| ATS-03 | — | Pending |
| ATS-04 | — | Pending |
| ATS-05 | — | Pending |
| STRM-01 | — | Pending |
| STRM-02 | — | Pending |
| STRM-03 | — | Pending |
| STRM-04 | — | Pending |
| STRM-05 | — | Pending |
| EXPR-01 | — | Pending |
| EXPR-02 | — | Pending |
| EXPR-03 | — | Pending |
| EXPR-04 | — | Pending |
| TERM-01 | — | Pending |
| TERM-02 | — | Pending |
| TERM-03 | — | Pending |
| TERM-04 | — | Pending |
| TERM-05 | — | Pending |
| TERM-06 | — | Pending |
| TERM-07 | — | Pending |
| TERM-08 | — | Pending |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 0
- Unmapped: 52 (pending roadmap creation)

---
*Requirements defined: 2026-05-02*
*Last updated: 2026-05-02 after initial definition*
