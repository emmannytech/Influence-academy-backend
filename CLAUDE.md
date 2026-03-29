# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Influence Academy Backend — a NestJS API (v11) for an influencer marketing platform connecting creators, clients (brands/agencies), and admins. Built with TypeScript, uses pnpm as package manager.

## Tech Stack

- **Runtime**: Node.js 20, NestJS 11, TypeScript 5.7
- **Database**: Supabase PostgreSQL via Prisma 5 ORM
- **Auth**: Supabase Auth — JWT verification with `jose` (JWKS), roles in `app_metadata`
- **Email**: Resend API
- **Logging**: nestjs-pino (pretty dev, JSON prod)
- **Docs**: Swagger at `/docs` (dev only)
- **Security**: Helmet, CORS, @nestjs/throttler (10/1s short, 100/60s long)
- **Events**: @nestjs/event-emitter for notification dispatch
- **Validation**: class-validator + class-transformer (global ValidationPipe with whitelist + transform)
- **Container**: Multi-stage Dockerfile (node:20-alpine, dumb-init)

## Commands

```bash
pnpm install                              # Install dependencies
pnpm run build                            # Compile (nest build)
pnpm run start:dev                        # Dev server with watch mode (port 3001)
pnpm run lint                             # ESLint with auto-fix
pnpm run format                           # Prettier formatting
pnpm run test                             # Unit tests (Jest)
pnpm run test -- --testPathPattern=<pat>  # Run a single test file
pnpm run test:e2e                         # E2E tests (config: test/jest-e2e.json)
pnpm run db:migrate:dev                   # Prisma dev migrations
pnpm run db:seed                          # Seed admin user
```

## Architecture

### Implemented Modules

All modules are fully implemented:

- **Auth** (`src/auth/`): Registration (creator/client), user sync on first `/auth/me`, password change. Supabase handles login/signup/email-verify/password-reset externally.
- **Creators** (`src/creators/`): Profile CRUD (draft/rejected only), submit-for-review, reopen-draft, dashboard with invitation stats.
- **Clients** (`src/clients/`): Company profile CRUD, dashboard with campaign status counts. Blocks consumer email domains.
- **Campaigns** (`src/campaigns/`): Full CRUD for clients, submit for review, status log history. Status machine with enforced transitions.
- **Admin** (`src/admin/`): Creator/campaign review and status management, client listing, platform dashboard (summary/activity/users), CSV exports, bulk campaign status updates, internal notes.
- **Marketplace** (`src/marketplace/`): Public endpoints — browse approved creators (filter by country/city/niche/platform) and active campaigns.
- **Invitations** (`src/invitations/`): Send invitations from shortlist, creator accept/decline, invitation stats per campaign. Shortlist management with shareable review links (token-based public access with decisions).
- **Notifications** (`src/notifications/`): In-app CRUD (list/read/delete), event-driven creation via listeners for creator status changes, campaign status changes, campaign submissions, and invitation events. Email delivery via Resend.

### Supporting Modules

- **Database** (`src/database/`): Global PrismaService wrapping PrismaClient
- **Supabase** (`src/supabase/`): Global SupabaseService (admin client) + SupabaseAuthGuard (JWKS JWT verification)
- **Common** (`src/common/`): Guards (roles), filters (exceptions), decorators (@Public, @Roles, @CurrentUser), DTOs (pagination), enums, utils (campaign transitions), interceptors (logging)
- **Users** (`src/users/`): Internal service for user CRUD (findBySupabaseId, createCreator, createClient, markVerified)

### Global Guards (order matters)

1. `SupabaseAuthGuard` — JWT verification, skipped by `@Public()`
2. `RolesGuard` — RBAC via `@Roles()` decorator
3. `ThrottlerGuard` — Rate limiting

### Prisma Models

`User` ↔ `Creator` (1:1) | `User` ↔ `Client` (1:1) | `User` ↔ `Notification` (1:M)
`Client` → `Campaign` (1:M) → `CampaignStatusLog` (1:M) | `Campaign` ↔ `ShortlistCreator` ↔ `Creator` (M:M)
`Campaign` → `ShareLink` (1:M) | `Campaign` → `Invitation` (1:M) ← `Creator`

### API Conventions

- All routes prefixed with `/api/v1`
- Standard error shape: `{ error: { code, message, details } }`
- Pagination: `page`, `pageSize`, `sortBy`, `sortOrder` → response includes `items`, `total`, `totalPages`
- Dates: ISO 8601 UTC
- Health check: `GET /api/v1/health`

### Key Domain Enums

- `UserRole`: `creator | client | admin`
- `CreatorStatus`: `draft | submitted | under_review | approved | rejected`
- `CampaignStatus`: `draft | submitted | active | completed | rejected`
- `InvitationStatus`: `pending | accepted | declined`
- `ClientType`: `brand | agency`
- `NotificationType`: `info | success | warning | error`

### Route Map

**Public**: register (creator/client), marketplace (creators/campaigns), shortlist review by token, health check
**Creator** (`/creator/*`): profile CRUD, submit, reopen-draft, dashboard, invitations (list/respond)
**Client** (`/client/*`): company profile, dashboard, campaigns CRUD/submit, shortlist (manage/share), invitations (send/view)
**Admin** (`/admin/*`): creators (list/get/status/export/notes), campaigns (list/get/status/bulk/export/notes), clients (list/get), dashboard (summary/activity/users)
**Authenticated**: `/auth/me`, `/auth/password/change`, `/notifications/*`

### Event-Driven Notifications

Events emitted by services → caught by listeners → create in-app notifications + send emails:
- `CREATOR_STATUS_CHANGED` — notify creator of review outcome
- `CAMPAIGN_STATUS_CHANGED` — notify client of campaign status change
- `CAMPAIGN_SUBMITTED` — notify admins of new submission
- Invitation events — notify relevant parties

## Code Style

- TypeScript with `strictNullChecks` enabled, `noImplicitAny` off
- Prettier: single quotes, trailing commas
- ESLint: `@typescript-eslint/no-explicit-any` off, `no-floating-promises` warn, all `no-unsafe-*` rules off
- Module resolution: `nodenext`
- Unit tests: `*.spec.ts` files colocated in `src/`; E2E tests: `*.e2e-spec.ts` in `test/`

## Key File Locations

- Prisma schema: `prisma/schema.prisma`
- Auth guard: `src/supabase/supabase-auth.guard.ts`
- Role guard: `src/common/guards/roles.guard.ts`
- Exception filter: `src/common/filters/http-exception.filter.ts`
- Campaign status machine: `src/common/utils/campaign-transitions.ts`
- Enums: `src/common/enums/`
- Seed: `prisma/seed.ts` (creates admin user)

## Environment Variables

See `.env.example` — requires: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`, `CORS_ORIGIN`, `APP_BASE_URL`. Port defaults to 3001.

# Project Rules
Always use context7 when referencing NestJS, TypeORM, Prisma or any npm or pnpm library documentation.
