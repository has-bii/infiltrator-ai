# Roadmap: The Infiltrator — Application War Room

## Overview

Build the agentic job application assistant from graph infrastructure through to a complete terminal UI. The critical path runs through the LangGraph agent core (phases 1-3) — the interrupt/resume cycle is the highest-risk technical element and must be validated before investing in documents and UI. Server-side work (phases 1-5) precedes client-side work (phase 6) so the UI is built against a real, tested backend.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Agent Foundation** - Graph, state, checkpointer, and LLM wiring
- [ ] **Phase 2: JD Analysis & Streaming** - Job description parsing with real-time SSE streaming
- [ ] **Phase 3: Interrogation Engine** - Dynamic Q&A loop with quality gates and rejection handling
- [ ] **Phase 4: Document Generation & ATS** - Resume, cover letter, and ATS simulation
- [ ] **Phase 5: Export** - PDF and DOCX file download
- [ ] **Phase 6: Mission Client & Dashboard** - Terminal UI, Zustand store, and dashboard integration

## Phase Details

### Phase 1: Agent Foundation
**Goal**: LangGraph StateGraph is defined, compiled with PostgresSaver, and all 6 nodes are wired and executable via the API endpoint
**Depends on**: Nothing (first phase)
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, AGNT-06, AGNT-07, AGNT-08, AGNT-09
**Success Criteria** (what must be TRUE):
  1. POST /api/agent with a start action creates a checkpoint in the PostgresSaver database
  2. Graph correctly pauses at interrupt() and a resume action continues execution from the saved checkpoint
  3. All 6 nodes (analyzeJD, planInterrogation, evaluateAnswer, qualityGate, forgeDocuments, runATSSimulation) are defined with correct edge routing
  4. LLM calls via @langchain/openrouter return structured output matching Zod schemas, using the model from OPENROUTER_MODEL env var
  5. Node code before interrupt() is guarded so re-execution on resume does not duplicate LLM calls or side effects
**Plans**: TBD

### Phase 2: JD Analysis & Streaming
**Goal**: Agent analyzes pasted job descriptions and streams structured results to the client via typed SSE events
**Depends on**: Phase 1
**Requirements**: JDA-01, JDA-02, JDA-03, STRM-01, STRM-02, STRM-03, STRM-04
**Success Criteria** (what must be TRUE):
  1. POST /api/agent with a job description (100+ chars) returns extracted primaryTargets, secondaryTargets, and intelGaps as structured data
  2. SSE stream delivers typed events (log, phase, question, feedback, state, done, error) that can be consumed by a ReadableStream client
  3. System log events display real-time analysis progress as the agent processes the job description
  4. graph.stream() with streamMode "custom" correctly surfaces interrupt information to the stream consumer (invoke does not)
**Plans**: TBD

### Phase 3: Interrogation Engine
**Goal**: Agent dynamically interrogates the user to fill every intel gap, rejecting weak answers with specific actionable feedback
**Depends on**: Phase 2
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04, INTG-05, INTG-06, INTG-07, INTG-08, INTG-09, STRM-05
**Success Criteria** (what must be TRUE):
  1. Agent generates a question for each unfilled intel gap with the appropriate type (LONG_TEXT, MULTIPLE_CHOICE, or SCENARIO)
  2. Answers scoring below 60 are rejected with specific feedback citing the exact deficiency; after 3 rejections the answer is force-accepted with low confidence
  3. Handler messages stream character-by-character at 15-20ms intervals during the interrogation phase
  4. Interrogation loop completes when all intel gaps are filled or force-accepted, and the agent transitions to document generation
**Plans**: TBD
**UI hint**: yes

### Phase 4: Document Generation & ATS
**Goal**: Agent forges an ATS-optimized resume and cover letter from collected interrogation data, then simulates ATS scoring
**Depends on**: Phase 3
**Requirements**: DOCG-01, DOCG-02, DOCG-03, DOCG-04, DOCG-05, ATS-01, ATS-02, ATS-03, ATS-04, ATS-05
**Success Criteria** (what must be TRUE):
  1. Resume is generated as Markdown using action verbs, impact metrics, and job-relevant keywords naturally incorporated
  2. Cover letter is generated as Markdown in 3-paragraph format tailored to the job description and operative profile
  3. Both documents are previewable via SSE as structured data during the Forgery phase
  4. ATS simulation produces a keyword hit/miss list and a verdict (CLEARED at 75+, CONDITIONALLY_CLEARED at 50-74, COMPROMISED below 50)
  5. COMPROMISED verdict triggers a reforge option that re-runs document generation and ATS simulation to improve the score
**Plans**: TBD
**UI hint**: yes

### Phase 5: Export
**Goal**: User can download the generated resume as PDF and cover letter as DOCX
**Depends on**: Phase 4
**Requirements**: EXPR-01, EXPR-02, EXPR-03, EXPR-04
**Success Criteria** (what must be TRUE):
  1. Resume downloads as a properly formatted PDF file via POST /api/export
  2. Cover letter downloads as a properly formatted DOCX file via POST /api/export
  3. Downloaded files are served with correct Content-Disposition attachment headers and proper MIME types
  4. PDF content matches the generated Markdown resume (headings, bullets, keywords preserved)
**Plans**: TBD

### Phase 6: Mission Client & Dashboard
**Goal**: Complete terminal-style UI with dashboard integration enabling the full mission workflow from launch to document download
**Depends on**: Phase 5
**Requirements**: TERM-01, TERM-02, TERM-03, TERM-04, TERM-05, TERM-06, TERM-07, TERM-08, DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. User can launch a new mission from the dashboard via a NewMissionCard and is redirected to the /mission route
  2. /mission route displays a full-screen terminal layout with a system log panel (left, ~35%) and interaction panel (right, ~65%), with no sidebar or top nav
  3. Each mission phase (briefing, intel acquisition, interrogation, forgery, stress test, extraction) renders with appropriate UI components and a phase indicator bar
  4. Briefing screen streams Handler intro text character-by-character with a blinking cursor, followed by an ACCEPT MISSION button
  5. Extraction phase shows two download cards (Resume .pdf and Cover Letter .docx) that trigger file downloads
  6. Unauthenticated users visiting /mission are redirected to login; user can return to dashboard after extraction or by aborting
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Agent Foundation | 0/? | Not started | - |
| 2. JD Analysis & Streaming | 0/? | Not started | - |
| 3. Interrogation Engine | 0/? | Not started | - |
| 4. Document Generation & ATS | 0/? | Not started | - |
| 5. Export | 0/? | Not started | - |
| 6. Mission Client & Dashboard | 0/? | Not started | - |
