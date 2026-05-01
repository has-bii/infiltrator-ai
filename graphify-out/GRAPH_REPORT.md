# Graph Report - infiltrator-ai  (2026-05-01)

## Corpus Check
- 27 files · ~3,008 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 43 nodes · 18 edges · 2 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]

## God Nodes (most connected - your core abstractions)
1. `LoginForm()` - 2 edges
2. `RegisterForm()` - 2 edges
3. `useRegisterForm()` - 2 edges
4. `useLoginForm()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `LoginForm()` --calls--> `useLoginForm()`  [INFERRED]
  src/features/auth/components/LoginForm.tsx → src/features/auth/hooks/useLoginForm.ts
- `RegisterForm()` --calls--> `useRegisterForm()`  [INFERRED]
  src/features/auth/components/RegisterForm.tsx → src/features/auth/hooks/useRegisterForm.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.5
Nodes (2): LoginForm(), useLoginForm()

### Community 1 - "Community 1"
Cohesion: 0.5
Nodes (2): RegisterForm(), useRegisterForm()

## Knowledge Gaps
- **Thin community `Community 0`** (4 nodes): `LoginForm()`, `useLoginForm()`, `LoginForm.tsx`, `useLoginForm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 1`** (4 nodes): `RegisterForm()`, `useRegisterForm()`, `RegisterForm.tsx`, `useRegisterForm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._