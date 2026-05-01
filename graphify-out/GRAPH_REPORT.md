# Graph Report - .  (2026-05-01)

## Corpus Check
- Corpus is ~28,544 words - fits in a single context window. You may not need a graph.

## Summary
- 62 nodes · 39 edges · 13 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth Database Schema|Auth Database Schema]]
- [[_COMMUNITY_Full-Stack Auth Layer|Full-Stack Auth Layer]]
- [[_COMMUNITY_Account Model|Account Model]]
- [[_COMMUNITY_App Shell|App Shell]]
- [[_COMMUNITY_Next.js Branding|Next.js Branding]]
- [[_COMMUNITY_UI Icons|UI Icons]]
- [[_COMMUNITY_Next.js Config Object|Next.js Config Object]]
- [[_COMMUNITY_Prisma Config Builder|Prisma Config Builder]]
- [[_COMMUNITY_Tailwind Plugin|Tailwind Plugin]]
- [[_COMMUNITY_ESLint Rules|ESLint Rules]]
- [[_COMMUNITY_pnpm Workspace|pnpm Workspace]]
- [[_COMMUNITY_CN Utility|CN Utility]]
- [[_COMMUNITY_Globe Icon|Globe Icon]]

## God Nodes (most connected - your core abstractions)
1. `User Database Model` - 10 edges
2. `Session Database Model` - 7 edges
3. `Account Database Model` - 7 edges
4. `Auth Server Instance` - 5 edges
5. `PrismaClient` - 4 edges
6. `Prisma Browser Entry Point` - 4 edges
7. `Verification Database Model` - 3 edges
8. `PrismaPg Adapter Instance` - 3 edges
9. `betterAuth Server Instance` - 3 edges
10. `RootLayout` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Account User Foreign Key` --references--> `User Database Model`  [EXTRACTED]
  src/generated/prisma/models/Account.ts → src/generated/prisma/models/User.ts
- `Account Cascade Delete` --references--> `User Database Model`  [EXTRACTED]
  src/generated/prisma/models/Account.ts → src/generated/prisma/models/User.ts
- `Auth Server Instance` --shares_data_with--> `Account Database Model`  [INFERRED]
  src/app/api/auth/[...all]/route.ts → src/generated/prisma/models/Account.ts
- `File Document Icon` --semantically_similar_to--> `Window Browser Icon`  [INFERRED] [semantically similar]
  public/file.svg → public/window.svg
- `Vercel Triangle Logo` --semantically_similar_to--> `Next.js Wordmark Logo`  [INFERRED] [semantically similar]
  public/vercel.svg → public/next.svg

## Hyperedges (group relationships)
- **Better-Auth Database Schema** — prisma_schema_user_model, prisma_schema_session_model, prisma_schema_account_model, prisma_schema_verification_model [INFERRED 0.90]
- **User-Owned Entities with Cascade Delete** — prisma_schema_user_model, prisma_schema_session_model, prisma_schema_account_model, prisma_schema_cascade_delete_session, prisma_schema_cascade_delete_account [EXTRACTED 1.00]
- **Prisma Client Entry Points** — src_generated_prisma_client_prismaclient, src_generated_prisma_browser, prisma_schema_user_model, prisma_schema_session_model, prisma_schema_account_model, prisma_schema_verification_model [EXTRACTED 1.00]
- **Full-Stack Auth Layer** — auth_auth, authclient_authclient, prisma_default_export [INFERRED 0.85]
- **Dev Hot-Reload Prisma Singleton Pattern** — prisma_default_export, prisma_adapter, prisma_globalforprisma [EXTRACTED 1.00]

## Communities

### Community 0 - "Auth Database Schema"
Cohesion: 0.31
Nodes (11): Session Cascade Delete, Session Database Model, Session Token Unique Constraint, Session User Foreign Key, User Email Unique Constraint, User Database Model, Verification Database Model, Auth API Route Handler (+3 more)

### Community 1 - "Full-Stack Auth Layer"
Cohesion: 0.5
Nodes (5): betterAuth Server Instance, Auth Client, PrismaPg Adapter Instance, Prisma Singleton, Global Prisma Cache

### Community 2 - "Account Model"
Cohesion: 0.5
Nodes (4): Account Database Model, Account Password Field, Account User Foreign Key, Account Cascade Delete

### Community 4 - "App Shell"
Cohesion: 0.67
Nodes (3): RootLayout, Home Page, cn() Utility

### Community 7 - "Next.js Branding"
Cohesion: 1.0
Nodes (2): Next.js Wordmark Logo, Vercel Triangle Logo

### Community 8 - "UI Icons"
Cohesion: 1.0
Nodes (2): File Document Icon, Window Browser Icon

### Community 30 - "Next.js Config Object"
Cohesion: 1.0
Nodes (1): Next.js Configuration

### Community 31 - "Prisma Config Builder"
Cohesion: 1.0
Nodes (1): Prisma Configuration

### Community 32 - "Tailwind Plugin"
Cohesion: 1.0
Nodes (1): Tailwind CSS PostCSS Plugin

### Community 33 - "ESLint Rules"
Cohesion: 1.0
Nodes (1): ESLint Configuration

### Community 34 - "pnpm Workspace"
Cohesion: 1.0
Nodes (1): pnpm Workspace Config

### Community 35 - "CN Utility"
Cohesion: 1.0
Nodes (1): cn() Utility Function

### Community 36 - "Globe Icon"
Cohesion: 1.0
Nodes (1): Globe Icon

## Knowledge Gaps
- **19 isolated node(s):** `Next.js Configuration`, `Home Page`, `Auth API Route Handler`, `Prisma Configuration`, `cn() Utility` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Next.js Branding`** (2 nodes): `Next.js Wordmark Logo`, `Vercel Triangle Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Icons`** (2 nodes): `File Document Icon`, `Window Browser Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config Object`** (1 nodes): `Next.js Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Config Builder`** (1 nodes): `Prisma Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Plugin`** (1 nodes): `Tailwind CSS PostCSS Plugin`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Rules`** (1 nodes): `ESLint Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `pnpm Workspace`** (1 nodes): `pnpm Workspace Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CN Utility`** (1 nodes): `cn() Utility Function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Globe Icon`** (1 nodes): `Globe Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User Database Model` connect `Auth Database Schema` to `Account Model`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `Account Database Model` connect `Account Model` to `Auth Database Schema`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Account Database Model` (e.g. with `Auth Server Instance` and `Account Password Field`) actually correct?**
  _`Account Database Model` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Auth Server Instance` (e.g. with `User Database Model` and `Session Database Model`) actually correct?**
  _`Auth Server Instance` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Next.js Configuration`, `Home Page`, `Auth API Route Handler` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._