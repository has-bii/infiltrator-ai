# Feature Research

**Domain:** AI-powered job application assistant (agentic, narrative-driven)
**Researched:** 2026-05-02
**Confidence:** MEDIUM (competitor data from direct site reads; WebSearch API was non-functional during research)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| JD analysis / keyword extraction | Every AI resume tool parses job descriptions to identify required skills, keywords, and qualifications | MEDIUM | LLM-powered structured extraction (primaryTargets, secondaryTargets, intelGaps). Already specified in PRD node `analyzeJD`. |
| ATS compatibility scoring | Users expect a score showing how well their resume matches a target job. Market standard across Jobscan, ResumeWorded, Rezi, Enhancv, Kickresume | MEDIUM | Keyword hit/miss analysis with verdict (CLEARED/CONDITIONALLY_CLEARED/COMPROMISED). PRD node `runATSSimulation`. |
| Resume generation from inputs | Core value prop. All 5 competitors (Kickresume, Jobscan, ResumeWorded, Enhancv, Rezi) generate resumes from user data + JD | MEDIUM | Markdown output from operative profile + job targets. PRD node `forgeDocuments`. |
| Cover letter generation | Users expect paired resume + cover letter. Kickresume, Enhancv, Rezi, ResumeWorded all include it | MEDIUM | 3-paragraph Markdown format. Part of `forgeDocuments` node. |
| PDF export | Standard output format. Every competitor offers it. | MEDIUM | `@react-pdf/renderer` — known for SSR issues in Next.js. Needs careful setup. |
| DOCX export | Recruiters expect editable formats. Kickresume, Enhancv offer it natively | LOW | `docx` library is straightforward. |
| Real-time progress feedback | Users abandon tools that go silent during generation. Skeleton loaders + progress bars are table stakes | LOW | `Skeleton` + `Progress` from shadcn. SSE streaming from `/api/agent`. |
| Clear input prompts | Vague or confusing UI causes drop-off. Every competitor guides users through each step | LOW | Terminal-style inputs with minimum character counts. Phase-specific prompts. |
| Edit-before-export | Users want to review and tweak generated content before downloading. Standard across all competitors | MEDIUM | Markdown previews in Forgery phase. Re-forge option on COMPROMISED verdict. Full text editing not specified in PRD V1 — potential gap. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Spy-themed Handler persona | Creates memorable, engaging experience. No competitor does narrative-driven UX. Stands out in a crowded market of generic "AI resume builder" tools | LOW (tone only) | Prompt engineering + consistent vocabulary. Zero additional infrastructure cost. High brand differentiation. |
| Agentic closed-loop Q&A with quality gates | Dynamic interrogation that adapts based on gaps — not static form fields. Rejects weak answers with specific feedback. No competitor does iterative quality enforcement | HIGH | LangGraph interrupts + Command pattern for pause/resume. `qualityGate` node with rejection loop (score < 60, max 3 rejections). Most complex feature. |
| Dynamic question types (LONG_TEXT, MULTIPLE_CHOICE, SCENARIO) | Questions adapt to the gap being filled — behavioral scenarios for leadership gaps, MCQs for proficiency levels. Prevents form fatigue | MEDIUM | `planInterrogation` node selects question type per gap. UI switches input component. |
| Character-by-character streaming | Typewriter effect creates tension and immersion. Feels like receiving a transmission, not reading a chatbot response | LOW | `requestAnimationFrame` or `setInterval` at 15-20ms. `HandlerMessage.tsx` component. |
| Narrative-driven workflow (mission metaphor) | Each phase has spy vocabulary — "Intel Acquisition", "The Interrogation", "The Forgery", "Stress Test". Turns a boring process into an engaging experience | LOW | Phase naming + terminal UI styling. Zero technical cost. |
| ATS simulation with verdict narrative | Not just a score — a "CLEARED / CONDITIONALLY_CLEARED / COMPROMISED" verdict that fits the spy theme. Makes ATS scoring memorable | LOW | Output formatting in `runATSSimulation` node. |
| Reforge on failure | If ATS score < 75, user can regenerate. Shows the system iterates toward quality, not fire-and-forget | LOW | Button triggers `store.setPhase('forgery')`. Re-runs `forgeDocuments` + `runATSSimulation`. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Template galleries with visual previews | Users expect to pick from 20+ resume templates | Massive design investment. Distracts from agent-driven experience. Template maintenance is ongoing cost. Incompatible with Markdown-first generation pipeline | Single well-designed PDF template. Focus on ATS-optimized formatting, not visual variety |
| Drag-and-drop resume editor | Users want to rearrange sections visually | Turns into a full WYSIWYG editor project. Conflicts with "AI generates, user reviews" paradigm. Huge scope creep | Markdown preview with re-forge. Future: inline text editing in preview |
| LinkedIn profile import | Users want to skip manual entry | LinkedIn API restrictions change frequently. OAuth integration is non-trivial. Scraping violates ToS | Paste existing resume text (Phase 2: Operative Profile). Lower friction, no API dependency |
| Multiple resume versions per mission | Users want A/B versions of their resume | PRD V1 scope constraint. Requires version diffing UI, storage schema changes. Adds decision fatigue to extraction phase | Single forge per mission. "Reforge" option serves the same need iteratively |
| Real ATS system integration | "Test against actual Workday/Greenhouse ATS" | ATS vendors don't expose parsing APIs. Would require building a mock ATS parser. Simulation with keyword matching is the honest approach | Keyword hit/miss scoring against JD targets. Clear verdict narrative |
| Mobile layout | "I want to use this on my phone" | Terminal UI is unusable at mobile widths. Would require separate mobile UX. Spy theme loses impact on small screens | Tablet+ only (≥768px). PRD explicit constraint |
| Internationalization | Non-English users want support | LLM prompts are English-optimized. Handler persona doesn't translate well. Adds complexity to every feature | English only. V1 constraint |
| Chat history / mission history | "Save my past applications" | Requires DB schema changes (mission tables). Postgres checkpointer is for active sessions only per PRD. Adds storage, cleanup, UX overhead | Ephemeral missions. Checkpoint table for active sessions only. V2+ consideration |

## Feature Dependencies

```
[JD Analysis]
    ├──requires──> [Job Description Input (Phase 1)]
    └──requires──> [LLM connection via OpenRouter]

[Operative Profile Assembly]
    ├──requires──> [Existing Resume Input (Phase 2)] ──optional──>
    └──requires──> [Interrogation Q&A Loop (Phase 3)]

[Intel Gap Identification]
    ├──requires──> [JD Analysis (analyzeJD node)]
    └──enhances──> [Interrogation Q&A Loop]

[Interrogation Q&A Loop]
    ├──requires──> [Intel Gap Identification]
    ├──requires──> [Quality Gate Logic]
    └──requires──> [Dynamic Question Types (UI switching)]

[Quality Gate / Rejection Loop]
    ├──requires──> [Answer Evaluation (evaluateAnswer node)]
    └──enhances──> [Operative Profile Quality]

[Document Forgery (Resume + Cover Letter)]
    ├──requires──> [Complete Operative Profile]
    ├──requires──> [Intel Gap closure (all gaps filled)]
    └──enhances──> [ATS Simulation Score]

[ATS Simulation]
    ├──requires──> [Generated Resume]
    ├──requires──> [Primary Targets from JD]
    └──enhances──> [Reforge Decision]

[PDF Export]
    ├──requires──> [Generated Resume Markdown]
    └──requires──> [@react-pdf/renderer setup]

[DOCX Export]
    ├──requires──> [Generated Cover Letter Markdown]
    └──requires──> [docx library]

[Handler Persona / Streaming UX]
    ├──enhances──> [Every phase]
    └──requires──> [HandlerMessage component]

[SSE Streaming]
    ├──requires──> [/api/agent route]
    └──enhances──> [All agent-driven phases (1-5)]

[Reforge on Failure]
    ├──requires──> [ATS Simulation with verdict]
    └──requires──> [Document Forgery pipeline (re-runnable)]
```

### Dependency Notes

- **Interrogation Q&A Loop requires Quality Gate Logic:** Without scoring + rejection, the loop has no purpose. Quality gate is what makes this agentic, not just a chatbot.
- **JD Analysis requires LLM connection:** Structured extraction (targets, gaps) needs LLM. No fallback for offline.
- **Document Forgery requires complete Operative Profile:** Cannot generate until all intel gaps are filled (or force-accepted after 3 rejections).
- **SSE Streaming enhances all agent phases:** Not technically required — could do request/response — but silence during LLM calls = user abandonment. Table stakes for experience quality.
- **Handler Persona enhances every phase:** Cost is near-zero (prompt engineering + CSS). Benefit is brand identity. Implement early.
- **Reforge on Failure requires re-runnable forgery pipeline:** The `forgeDocuments` + `runATSSimulation` chain must be idempotent — callable multiple times without side effects.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [x] **JD Analysis** — Core value. Without it, nothing downstream works. Extracts targets + gaps from pasted job description.
- [x] **Interrogation Q&A Loop with Quality Gates** — Primary differentiator. Dynamic questions + rejection feedback is what makes this an agent, not a form.
- [x] **Resume + Cover Letter Generation** — Core deliverable. Users download documents. Without this, no product.
- [x] **ATS Simulation with Keyword Scoring** — Validates output quality. Score + verdict gives users confidence.
- [x] **PDF + DOCX Export** — Users need files to submit. Non-negotiable output format.
- [x] **Handler Persona + Streaming UX** — Brand identity. Cheap to implement, massive differentiation.
- [x] **Briefing Screen (Phase 0)** — Sets expectations. Narratively grounds the experience.

### Add After Validation (v1.x)

Features to add once core agent loop works end-to-end.

- [ ] **Edit-before-export (inline text editing in preview)** — Trigger: users request ability to tweak generated text before downloading. Requires: contenteditable or markdown editor in preview components.
- [ ] **Save/Resume incomplete missions** — Trigger: users lose progress on refresh. Requires: Postgres checkpointer wiring for session persistence beyond active SSE connection.
- [ ] **Mission history** — Trigger: repeat users want to reference past missions. Requires: DB schema changes (mission tables), list UI on dashboard.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Multiple resume templates** — Defer: single ATS-optimized template is sufficient. Template variety is a retention feature, not acquisition.
- [ ] **LinkedIn profile import** — Defer: paste-resume workflow is lower friction for V1. OAuth + LinkedIn API changes are ongoing maintenance burden.
- [ ] **Real ATS parser integration** — Defer: keyword simulation is honest and sufficient. Real ATS parsers are proprietary and would require building/maintaining a mock.
- [ ] **Mobile layout** — Defer: terminal UI needs tablet+ width. Mobile would need fundamentally different UX.
- [ ] **Multi-language support** — Defer: Handler persona is English-optimized. Translation would require persona redesign per locale.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| JD Analysis (analyzeJD) | HIGH | MEDIUM | P1 |
| Interrogation Q&A with quality gates | HIGH | HIGH | P1 |
| Dynamic question types | MEDIUM | MEDIUM | P1 |
| Resume generation | HIGH | MEDIUM | P1 |
| Cover letter generation | HIGH | LOW | P1 |
| ATS simulation + verdict | HIGH | MEDIUM | P1 |
| PDF export | HIGH | MEDIUM | P1 |
| DOCX export | HIGH | LOW | P1 |
| Handler persona + streaming | HIGH | LOW | P1 |
| SSE streaming for real-time updates | MEDIUM | MEDIUM | P1 |
| Briefing screen (Phase 0) | MEDIUM | LOW | P1 |
| Reforge on failure | MEDIUM | LOW | P1 |
| Edit-before-export | MEDIUM | MEDIUM | P2 |
| Save/Resume missions | MEDIUM | HIGH | P2 |
| Mission history on dashboard | LOW | HIGH | P2 |
| Multiple resume templates | LOW | HIGH | P3 |
| LinkedIn import | MEDIUM | HIGH | P3 |
| Mobile layout | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Kickresume | Jobscan | ResumeWorded | Enhancv | Rezi | Our Approach |
|---------|-----------|---------|-------------|---------|------|-------------|
| JD keyword extraction | AI-powered scan | Keyword matching | AI analysis | AI skills extraction | AI keyword targeting | LLM structured extraction via `analyzeJD` node |
| Resume generation | Template-based, AI fill | Optimization suggestions | AI rewrite | Template + AI content | AI-first generation | Agent-driven from interrogation data. No templates. |
| Cover letter generation | Yes, template-based | Limited | Yes, AI-generated | Yes | Yes | 3-paragraph Markdown from operative profile |
| ATS scoring | Built-in checker | Core feature (core product) | Score + optimization | ATS check | ATS targeting score | Keyword hit/miss + CLEARED/COMPROMISED verdict |
| User input method | Form fields + templates | Paste resume + JD | Paste resume | Step-by-step wizard | Guided input + paste | Dynamic Q&A interrogation with quality gates |
| Quality enforcement | None (user self-edits) | Suggestions only | Score-based suggestions | Tips and checks | AI optimization | **Rejection loop** — agent rejects weak answers with specific feedback |
| Export formats | PDF, DOCX | PDF | PDF, TXT | PDF | PDF, DOCX, TXT | PDF (resume) + DOCX (cover letter) |
| AI persona / UX theme | Clean, professional | Utility-focused | Minimal | Modern, colorful | Minimal, AI-forward | **Spy-themed terminal UI**. Unique in market. |
| Iterative refinement | Manual editing | Rescan after edits | Re-score after edits | Edit + recheck | Re-optimize | **Automatic reforge** on COMPROMISED verdict. Agent-driven iteration. |
| Real-time feedback | None (static forms) | Score updates on change | Real-time scoring | Inline suggestions | Step-by-step guidance | SSE streaming + character-by-character Handler messages |

### Competitive Gap Analysis

**What competitors do that we don't (V1):**
- Template selection (all 5 competitors) — deliberate exclusion, not a gap
- Resume optimization suggestions without full regeneration (Jobscan, ResumeWorded) — V2 consideration
- LinkedIn import (Kickresume, Enhancv) — deferred per anti-features
- Grammar/spelling checking (ResumeWorded, Enhancv) — could add as post-forgery check in V1.x

**What we do that competitors don't:**
- Closed-loop Q&A with quality enforcement (rejection + feedback) — no competitor iterates on user inputs
- Narrative-driven experience — all competitors use generic SaaS UI
- Agent-driven gap analysis — competitors identify gaps passively; we actively interrogate to close them
- Dynamic question type switching — competitors use static form fields

## Sources

- **Competitor sites accessed directly via webReader (2026-05-02):**
  - kickresume.com — template-based AI resume builder with JD scanning
  - jobscan.co — keyword-matching ATS optimization tool (core product is JD vs resume comparison)
  - resumeworded.com — AI resume review and scoring, optimization suggestions
  - enhancv.com — step-by-step wizard with template gallery and AI content
  - rezi.ai — AI-first resume generation targeting ATS keywords
- **LangGraph.js documentation via ctx7:**
  - Human-in-the-loop patterns (interrupt/Command pattern for pause/resume)
  - StateGraph definition and node wiring
- **Project files:**
  - `.planning/PROJECT.md` — requirements, constraints, existing infrastructure
  - `PRD.md` (v2.0) — full product spec with state schema, agent nodes, UI phases

---
*Feature research for: AI-powered job application assistant (The Infiltrator)*
*Researched: 2026-05-02*
