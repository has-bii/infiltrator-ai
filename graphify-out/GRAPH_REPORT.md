# Graph Report - .  (2026-05-01)

## Corpus Check
- Corpus is ~1,010 words - fits in a single context window. You may not need a graph.

## Summary
- 34 nodes · 12 edges · 12 communities detected
- Extraction: 50% EXTRACTED · 50% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Database|Auth & Database]]
- [[_COMMUNITY_Page Layout|Page Layout]]
- [[_COMMUNITY_Auth API Handler|Auth API Handler]]
- [[_COMMUNITY_Brand Logos|Brand Logos]]
- [[_COMMUNITY_UI Icons|UI Icons]]
- [[_COMMUNITY_Tailwind CSS|Tailwind CSS]]
- [[_COMMUNITY_Prisma Setup|Prisma Setup]]
- [[_COMMUNITY_Linting Config|Linting Config]]
- [[_COMMUNITY_Next.js Setup|Next.js Setup]]
- [[_COMMUNITY_CN Utility|CN Utility]]
- [[_COMMUNITY_Workspace Config|Workspace Config]]
- [[_COMMUNITY_Globe Icon|Globe Icon]]

## God Nodes (most connected - your core abstractions)
1. `PrismaPg Adapter Instance` - 3 edges
2. `betterAuth Server Instance` - 3 edges
3. `RootLayout` - 2 edges
4. `Prisma Singleton` - 2 edges
5. `cn() Utility` - 1 edges
6. `Home Page` - 1 edges
7. `Auth API Route Handler` - 1 edges
8. `Auth Server Instance` - 1 edges
9. `Global Prisma Cache` - 1 edges
10. `Auth Client` - 1 edges

## Surprising Connections (you probably didn't know these)
- `File Document Icon` --semantically_similar_to--> `Window Browser Icon`  [INFERRED] [semantically similar]
  public/file.svg → public/window.svg
- `Vercel Triangle Logo` --semantically_similar_to--> `Next.js Wordmark Logo`  [INFERRED] [semantically similar]
  public/vercel.svg → public/next.svg
- `RootLayout` --references--> `Home Page`  [INFERRED]
  src/app/layout.tsx → src/app/page.tsx
- `betterAuth Server Instance` --references--> `PrismaPg Adapter Instance`  [INFERRED]
  src/lib/auth.ts → src/lib/prisma.ts
- `Auth Client` --conceptually_related_to--> `betterAuth Server Instance`  [INFERRED]
  src/lib/auth-client.ts → src/lib/auth.ts

## Hyperedges (group relationships)
- **Dev Hot-Reload Prisma Singleton Pattern** — prisma_default_export, prisma_adapter, prisma_globalforprisma [EXTRACTED 1.00]
- **Full-Stack Auth Layer** — auth_auth, authclient_authclient, prisma_default_export [INFERRED 0.85]

## Communities

### Community 0 - "Auth & Database"
Cohesion: 0.5
Nodes (5): betterAuth Server Instance, Auth Client, PrismaPg Adapter Instance, Prisma Singleton, Global Prisma Cache

### Community 1 - "Page Layout"
Cohesion: 0.67
Nodes (3): RootLayout, Home Page, cn() Utility

### Community 4 - "Auth API Handler"
Cohesion: 1.0
Nodes (2): Auth API Route Handler, Auth Server Instance

### Community 5 - "Brand Logos"
Cohesion: 1.0
Nodes (2): Next.js Wordmark Logo, Vercel Triangle Logo

### Community 6 - "UI Icons"
Cohesion: 1.0
Nodes (2): File Document Icon, Window Browser Icon

### Community 16 - "Tailwind CSS"
Cohesion: 1.0
Nodes (1): Tailwind CSS PostCSS Plugin

### Community 17 - "Prisma Setup"
Cohesion: 1.0
Nodes (1): Prisma Configuration

### Community 18 - "Linting Config"
Cohesion: 1.0
Nodes (1): ESLint Configuration

### Community 19 - "Next.js Setup"
Cohesion: 1.0
Nodes (1): Next.js Configuration

### Community 20 - "CN Utility"
Cohesion: 1.0
Nodes (1): cn() Utility Function

### Community 21 - "Workspace Config"
Cohesion: 1.0
Nodes (1): pnpm Workspace Config

### Community 22 - "Globe Icon"
Cohesion: 1.0
Nodes (1): Globe Icon

## Knowledge Gaps
- **17 isolated node(s):** `Tailwind CSS PostCSS Plugin`, `Prisma Configuration`, `ESLint Configuration`, `Next.js Configuration`, `cn() Utility` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Auth API Handler`** (2 nodes): `Auth API Route Handler`, `Auth Server Instance`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Brand Logos`** (2 nodes): `Next.js Wordmark Logo`, `Vercel Triangle Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Icons`** (2 nodes): `File Document Icon`, `Window Browser Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind CSS`** (1 nodes): `Tailwind CSS PostCSS Plugin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Setup`** (1 nodes): `Prisma Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Linting Config`** (1 nodes): `ESLint Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Setup`** (1 nodes): `Next.js Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CN Utility`** (1 nodes): `cn() Utility Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Workspace Config`** (1 nodes): `pnpm Workspace Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Globe Icon`** (1 nodes): `Globe Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `PrismaPg Adapter Instance` (e.g. with `Global Prisma Cache` and `betterAuth Server Instance`) actually correct?**
  _`PrismaPg Adapter Instance` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `betterAuth Server Instance` (e.g. with `PrismaPg Adapter Instance` and `Auth Client`) actually correct?**
  _`betterAuth Server Instance` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Tailwind CSS PostCSS Plugin`, `Prisma Configuration`, `ESLint Configuration` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._