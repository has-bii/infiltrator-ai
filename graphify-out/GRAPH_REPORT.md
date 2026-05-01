# Graph Report - ./src  (2026-05-01)

## Corpus Check
- Corpus is ~2,410 words - fits in a single context window. You may not need a graph.

## Summary
- 39 nodes · 18 edges · 2 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Login Form|Login Form]]
- [[_COMMUNITY_Register Form|Register Form]]

## God Nodes (most connected - your core abstractions)
1. `LoginForm()` - 2 edges
2. `RegisterForm()` - 2 edges
3. `useRegisterForm()` - 2 edges
4. `useLoginForm()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `LoginForm()` --calls--> `useLoginForm()`  [INFERRED]
  features/auth/components/LoginForm.tsx → features/auth/hooks/useLoginForm.ts
- `RegisterForm()` --calls--> `useRegisterForm()`  [INFERRED]
  features/auth/components/RegisterForm.tsx → features/auth/hooks/useRegisterForm.ts

## Communities

### Community 0 - "Login Form"
Cohesion: 0.5
Nodes (2): LoginForm(), useLoginForm()

### Community 1 - "Register Form"
Cohesion: 0.5
Nodes (2): RegisterForm(), useRegisterForm()

## Knowledge Gaps
- **Thin community `Login Form`** (4 nodes): `LoginForm()`, `LoginForm.tsx`, `useLoginForm.ts`, `useLoginForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Register Form`** (4 nodes): `RegisterForm()`, `RegisterForm.tsx`, `useRegisterForm.ts`, `useRegisterForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._