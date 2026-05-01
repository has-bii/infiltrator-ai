# Graph Report - infiltrator-ai  (2026-05-01)

## Corpus Check
- 46 files · ~7,407 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 96 nodes · 56 edges · 4 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]

## God Nodes (most connected - your core abstractions)
1. `useSidebar()` - 4 edges
2. `LoginForm()` - 2 edges
3. `RegisterForm()` - 2 edges
4. `useRegisterForm()` - 2 edges
5. `useLoginForm()` - 2 edges
6. `getUserQueryOptions()` - 2 edges
7. `TeamSwitcher()` - 2 edges
8. `NavUser()` - 2 edges
9. `NavSessions()` - 2 edges
10. `SidebarMenuButton()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `LoginForm()` --calls--> `useLoginForm()`  [INFERRED]
  src/features/auth/components/LoginForm.tsx → src/features/auth/hooks/useLoginForm.ts
- `RegisterForm()` --calls--> `useRegisterForm()`  [INFERRED]
  src/features/auth/components/RegisterForm.tsx → src/features/auth/hooks/useRegisterForm.ts
- `NavUser()` --calls--> `getUserQueryOptions()`  [INFERRED]
  src/components/nav-user.tsx → src/features/auth/query/getUserQueryOptions.ts
- `TeamSwitcher()` --calls--> `useSidebar()`  [INFERRED]
  src/components/team-switcher.tsx → src/components/ui/sidebar.tsx
- `NavSessions()` --calls--> `useSidebar()`  [INFERRED]
  src/components/nav-sessions.tsx → src/components/ui/sidebar.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.2
Nodes (4): NavSessions(), TeamSwitcher(), SidebarMenuButton(), useSidebar()

### Community 3 - "Community 3"
Cohesion: 0.5
Nodes (2): LoginForm(), useLoginForm()

### Community 4 - "Community 4"
Cohesion: 0.5
Nodes (2): RegisterForm(), useRegisterForm()

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (2): NavUser(), getUserQueryOptions()

## Knowledge Gaps
- **Thin community `Community 3`** (4 nodes): `LoginForm()`, `useLoginForm()`, `LoginForm.tsx`, `useLoginForm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 4`** (4 nodes): `RegisterForm()`, `useRegisterForm()`, `RegisterForm.tsx`, `useRegisterForm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (4 nodes): `NavUser()`, `getUserQueryOptions()`, `nav-user.tsx`, `getUserQueryOptions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `useSidebar()` (e.g. with `TeamSwitcher()` and `NavSessions()`) actually correct?**
  _`useSidebar()` has 2 INFERRED edges - model-reasoned connections that need verification._