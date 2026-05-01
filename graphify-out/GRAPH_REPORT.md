# Graph Report - ./src  (2026-05-01)

## Corpus Check
- Corpus is ~2,410 words - fits in a single context window. You may not need a graph.

## Summary
- 60 nodes · 33 edges · 12 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Registration Flow|Registration Flow]]
- [[_COMMUNITY_Login Flow|Login Flow]]
- [[_COMMUNITY_Card UI Component|Card UI Component]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Auth Layout|Auth Layout]]
- [[_COMMUNITY_Register Page|Register Page]]
- [[_COMMUNITY_Login Page|Login Page]]
- [[_COMMUNITY_Field UI Component|Field UI Component]]
- [[_COMMUNITY_Label UI Component|Label UI Component]]
- [[_COMMUNITY_Separator UI Component|Separator UI Component]]
- [[_COMMUNITY_Button UI Component|Button UI Component]]
- [[_COMMUNITY_Input UI Component|Input UI Component]]

## God Nodes (most connected - your core abstractions)
1. `LoginForm()` - 3 edges
2. `RegisterForm()` - 3 edges
3. `useRegisterForm()` - 3 edges
4. `useLoginForm()` - 3 edges
5. `RootLayout()` - 2 edges
6. `Layout()` - 2 edges
7. `RegisterPage()` - 2 edges
8. `LoginPage()` - 2 edges
9. `cn()` - 2 edges
10. `CardAction()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `LoginForm()` --calls--> `useLoginForm()`  [INFERRED]
  features/auth/components/LoginForm.tsx → features/auth/hooks/useLoginForm.ts
- `RegisterForm()` --calls--> `useRegisterForm()`  [INFERRED]
  features/auth/components/RegisterForm.tsx → features/auth/hooks/useRegisterForm.ts

## Communities

### Community 0 - "Registration Flow"
Cohesion: 0.33
Nodes (2): RegisterForm(), useRegisterForm()

### Community 1 - "Login Flow"
Cohesion: 0.33
Nodes (2): LoginForm(), useLoginForm()

### Community 2 - "Card UI Component"
Cohesion: 0.67
Nodes (2): CardAction(), cn()

### Community 3 - "Root Layout"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 4 - "Auth Layout"
Cohesion: 0.67
Nodes (1): Layout()

### Community 5 - "Register Page"
Cohesion: 0.67
Nodes (1): RegisterPage()

### Community 6 - "Login Page"
Cohesion: 0.67
Nodes (1): LoginPage()

### Community 7 - "Field UI Component"
Cohesion: 0.67
Nodes (1): cn()

### Community 8 - "Label UI Component"
Cohesion: 0.67
Nodes (1): Label()

### Community 9 - "Separator UI Component"
Cohesion: 0.67
Nodes (1): Separator()

### Community 10 - "Button UI Component"
Cohesion: 0.67
Nodes (1): cn()

### Community 11 - "Input UI Component"
Cohesion: 0.67
Nodes (1): Input()

## Knowledge Gaps
- **Thin community `Registration Flow`** (6 nodes): `RegisterForm()`, `RegisterForm.tsx`, `useRegisterForm.ts`, `useRegisterForm()`, `RegisterForm.tsx`, `useRegisterForm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Flow`** (6 nodes): `LoginForm()`, `LoginForm.tsx`, `useLoginForm.ts`, `useLoginForm()`, `LoginForm.tsx`, `useLoginForm.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card UI Component`** (4 nodes): `card.tsx`, `card.tsx`, `CardAction()`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Layout`** (3 nodes): `RootLayout()`, `layout.tsx`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Layout`** (3 nodes): `layout.tsx`, `Layout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Register Page`** (3 nodes): `page.tsx`, `RegisterPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Page`** (3 nodes): `page.tsx`, `LoginPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Field UI Component`** (3 nodes): `field.tsx`, `field.tsx`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Label UI Component`** (3 nodes): `label.tsx`, `label.tsx`, `Label()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Separator UI Component`** (3 nodes): `separator.tsx`, `separator.tsx`, `Separator()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button UI Component`** (3 nodes): `button.tsx`, `button.tsx`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input UI Component`** (3 nodes): `input.tsx`, `input.tsx`, `Input()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._