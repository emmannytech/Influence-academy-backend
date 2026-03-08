# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Influence Academy Backend — a NestJS API (v11) for an influencer marketing platform connecting creators, clients (brands/agencies), and admins. Built with TypeScript, uses pnpm as package manager.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run build        # Compile (nest build)
pnpm run start:dev    # Dev server with watch mode (port 3000)
pnpm run lint         # ESLint with auto-fix
pnpm run format       # Prettier formatting
pnpm run test         # Unit tests (Jest)
pnpm run test -- --testPathPattern=<pattern>  # Run a single test file
pnpm run test:e2e     # E2E tests (config: test/jest-e2e.json)
```

## Architecture

This is a fresh NestJS scaffold. The planned architecture (per `backend-api-requirements.md`) covers:

- **Auth module**: JWT bearer tokens (access + refresh), role-based (`creator | client | admin`), email verification, password reset
- **Creator module**: profile CRUD, submit-for-review workflow, dashboard, campaign/invitation views
- **Client module**: company profile, campaign CRUD + submission, shortlist management, invitation sending
- **Admin module**: creator/campaign review and status management, dashboard summaries, bulk actions, CSV exports
- **Marketplace module**: public creator/campaign discovery with filtering
- **Notifications module**: event-driven in-app/email/SMS delivery
- **Campaigns module**: status machine with enforced transitions (`draft → submitted → in_review → awaiting_responses → active → completed`; `rejected` can return to `draft`)

### API Conventions

- All routes prefixed with `/api/v1`
- Standard error shape: `{ error: { code, message, details } }`
- Pagination: `page`, `pageSize`, `sortBy`, `sortOrder` → response includes `items`, `total`, `totalPages`
- Dates: ISO 8601 UTC

### Key Domain Enums

- `UserRole`: `creator | client | admin`
- `CreatorStatus`: `draft | submitted | under_review | approved | rejected`
- `CampaignStatus`: `draft | submitted | in_review | awaiting_responses | active | completed | rejected`
- `InvitationStatus`: `pending | accepted | declined`

## Code Style

- TypeScript with `strictNullChecks` enabled, `noImplicitAny` off
- Prettier: single quotes, trailing commas
- ESLint: `@typescript-eslint/no-explicit-any` off, `no-floating-promises` warn, `no-unsafe-argument` warn
- Module resolution: `nodenext`
- Unit tests: `*.spec.ts` files colocated in `src/`; E2E tests: `*.e2e-spec.ts` in `test/`

# Project Rules
Always use context7 when referencing NestJS, TypeORM,Prisma or any npm or pnpm library documentation.