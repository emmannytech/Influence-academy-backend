# Frontend Backend API Requirements

Last updated: 2026-03-01  
Repository: `/Users/emmanuel/Downloads/app`

## 1. Scope

This document maps:

1. Current frontend behavior (mock-data driven UI in `src/`)
2. Required backend APIs to replace those mocks
3. User-story coverage (Epics 1, 2, 3, 4, 5, 6, 7, 8, and 10)

The goal is to define a backend contract that lets the existing UI switch from in-memory/local state to real APIs without major UI rewrites.

## 2. API Conventions

- Base URL: `/api/v1`
- Auth: JWT bearer access token + refresh token
- Role claims: `creator | client | admin`
- Standard error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {
      "field": "email",
      "reason": "invalid_format"
    }
  }
}
```

- Pagination (list endpoints):
  - Query: `page`, `pageSize`, `sortBy`, `sortOrder`
  - Response: `items`, `page`, `pageSize`, `total`, `totalPages`
- Dates: ISO 8601 UTC
- File uploads: multipart or presigned URL flow
- Realtime updates: SSE or WebSocket for status/notification updates

## 3. Core Domain Enums (from frontend types)

- `UserRole`: `creator | client | admin`
- `CreatorStatus`: `draft | submitted | under_review | approved | rejected`
- `CampaignStatus`: `draft | submitted | in_review | awaiting_responses | active | completed | rejected`
- `InvitationStatus`: `pending | accepted | declined`
- `ClientType`: `brand | agency`
- `NotificationType`: `info | success | warning | error`

## 4. Workflow Rules Required by Frontend + Stories

### 4.1 Campaign status transitions

- `draft -> submitted`
- `submitted -> draft | in_review | rejected`
- `in_review -> awaiting_responses | rejected`
- `awaiting_responses -> in_review | active | rejected`
- `active -> awaiting_responses | completed | rejected`
- `completed -> (none)`
- `rejected -> draft | submitted`

### 4.2 Creator profile review flow

- Draft -> Submitted/Under Review -> Approved or Rejected
- Rejected creator can edit and resubmit
- Submitted/under_review creator profile is locked in UI

## 5. API Endpoints (P0: Required for Current UI + User Stories)

## 5.1 Authentication and Session

### `POST /auth/login`
- Roles: all
- Purpose: secure login for creator/client/admin
- Request:
```json
{ "email": "user@company.com", "password": "string" }
```
- Response:
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "expiresIn": 1800,
  "user": { "id": "u1", "email": "user@company.com", "role": "client", "isVerified": true }
}
```

### `POST /auth/logout`
- Roles: all
- Purpose: invalidate session/refresh token

### `POST /auth/refresh`
- Roles: all
- Purpose: rotate access token

### `GET /auth/me`
- Roles: all
- Purpose: bootstrap current user and role context
- Response includes role-specific profile reference:
```json
{
  "user": { "id": "u1", "role": "creator", "isVerified": true },
  "creatorId": "cr_1",
  "clientId": null
}
```

### `POST /auth/password/forgot`
- Roles: public
- Purpose: send password reset link

### `POST /auth/password/reset`
- Roles: public (token-based)
- Purpose: reset password by token

### `POST /auth/password/change`
- Roles: authenticated
- Purpose: account settings password update

## 5.2 Email Verification

### `POST /auth/register/creator`
- Roles: public
- Purpose: creator sign-up (US-1.1)
- Request:
```json
{
  "email": "creator@example.com",
  "password": "string",
  "confirmPassword": "string"
}
```
- Behavior:
  - validates email format
  - creates user with `role=creator`, `isVerified=false`
  - creates empty creator profile in `draft`
  - sends verification email

### `POST /auth/register/client`
- Roles: public
- Purpose: client sign-up (US-2.1)
- Request:
```json
{
  "email": "jane@brand.com",
  "password": "string",
  "confirmPassword": "string",
  "companyType": "brand",
  "companyWebsite": "https://brand.com"
}
```
- Behavior:
  - rejects consumer domains
  - validates email domain vs website
  - creates user with `role=client`, `isVerified=false`
  - sends verification email

### `POST /auth/email-verification/resend`
- Roles: public/authenticated
- Purpose: resend verification link

### `POST /auth/email-verification/verify`
- Roles: public
- Purpose: verify token from email link
- Request:
```json
{ "token": "uuid-or-jwt" }
```
- Response:
```json
{ "success": true, "isVerified": true }
```
- Errors:
  - `invalid_token`
  - `expired_token`

## 5.3 Creator Profile and Dashboard

### `GET /creator/profile`
- Roles: creator
- Purpose: load creator profile for dashboard/profile/setup

### `PUT /creator/profile`
- Roles: creator
- Purpose: save draft profile edits (US-1.3)
- Required fields on submit validation (not draft):
  - `fullName`, `dateOfBirth`, `country`, `city`, `location`, `contactNumber`, `email`
  - `socialHandles.instagram`, `socialHandles.tiktok`, `socialHandles.x`, `socialHandles.youtube`, `socialHandles.other`

### `POST /creator/profile/submit`
- Roles: creator
- Purpose: submit profile for review (US-1.4)
- Behavior:
  - validates required fields
  - sets status to `submitted`
  - sets `submittedAt`
  - returns locked state

### `POST /creator/profile/reopen-draft`
- Roles: creator/admin (policy-based)
- Purpose: move rejected profile back to editable draft

### `GET /creator/dashboard`
- Roles: creator
- Purpose: summary including profile status, invitation counts, campaign counts

### `GET /creator/campaigns`
- Roles: creator
- Purpose: list campaigns related to invitation/acceptance

### `GET /creator/campaigns/{campaignId}`
- Roles: creator
- Purpose: campaign detail + invitation state + lifecycle logs

## 5.4 Client Company Profile and Dashboard

### `GET /client/company-profile`
- Roles: client
- Purpose: load company profile (US-2.2)

### `PUT /client/company-profile`
- Roles: client
- Purpose: complete/update company profile
- Required:
  - `companyName`, `companyType`, `industry`, `contactPersonName`, `contactEmail`, `contactPhone`, `country`, `officeAddress`
- Validation:
  - `contactEmail` must be work email
  - domain should match company website

### `GET /client/dashboard`
- Roles: client
- Purpose: campaign summaries, pending review counts, awaiting responses

## 5.5 Campaign CRUD and Submission

### `GET /client/campaigns`
- Roles: client
- Query:
  - `status`, `search`, `page`, `pageSize`, `sortBy`
- Purpose: campaign management list (US-3.2)

### `POST /client/campaigns`
- Roles: client
- Purpose: create draft campaign (US-3.1)
- Request includes:
  - campaign basics, description, platforms
  - creator requirements (country/city/platform/followers/rate/engagement/views/niche)
  - number of creators
  - timeline
  - budget
  - assets references

### `GET /client/campaigns/{campaignId}`
- Roles: client (owner), admin
- Purpose: campaign details

### `PUT /client/campaigns/{campaignId}`
- Roles: client (owner)
- Purpose: edit draft/rejected campaigns
- Server rejects updates if campaign is locked by status

### `POST /client/campaigns/{campaignId}/submit`
- Roles: client (owner)
- Purpose: submit campaign for review (US-3.3)
- Behavior:
  - validates required fields
  - transitions `draft -> submitted`
  - triggers admin notification

### `GET /campaigns/{campaignId}/status-logs`
- Roles: creator/client(admin for any)
- Purpose: lifecycle audit log

## 5.6 Campaign Lifecycle and Admin Status Control

### `PATCH /admin/campaigns/{campaignId}/status`
- Roles: admin
- Request:
```json
{ "toStatus": "in_review", "note": "Approved for creator selection" }
```
- Behavior:
  - validates allowed transitions (or explicit override policy)
  - records status log
  - notifies relevant parties (client + affected creators)

### `POST /admin/campaigns/status/bulk`
- Roles: admin
- Purpose: bulk approve/reject transitions from management table

## 5.7 Creator Discovery (Marketplace)

### `GET /marketplace/creators`
- Roles: public/client/admin
- Query:
  - `status=approved` (public/client default)
  - `country`, `city`, `platform`, `niche`, `search`
  - pagination/sort
- Purpose:
  - US-4.1 browse approved creators only
  - US-4.2 combined filters + reset

### `GET /marketplace/creators/{creatorId}`
- Roles: public/client/admin
- Purpose: creator profile card/details view

### `GET /marketplace/campaigns`
- Roles: public/client/admin
- Purpose: campaign tab on marketplace hub (current UI supports this)

## 5.8 Campaign Shortlist and External Review

### `GET /client/campaigns/{campaignId}/shortlist`
- Roles: client (owner), admin
- Purpose: shortlist members and count

### `PUT /client/campaigns/{campaignId}/shortlist`
- Roles: client (owner), admin
- Request:
```json
{ "creatorIds": ["cr_1", "cr_2"] }
```
- Purpose:
  - add/remove creators (US-4.3)
  - keep shortlist tied to specific campaign

### `POST /client/campaigns/{campaignId}/shortlist/share-links`
- Roles: client (owner)
- Purpose: generate shareable guest link (US-4.4)
- Response:
```json
{ "token": "uuid", "url": "https://app/shortlist/review/{token}", "expiresAt": "..." }
```

### `GET /client/campaigns/{campaignId}/shortlist/share-links/latest`
- Roles: client (owner)
- Purpose: retrieve latest link + decision summary

### `GET /public/shortlist/review/{token}`
- Roles: guest/public
- Purpose: load shortlist by token if valid/not expired

### `POST /public/shortlist/review/{token}/decisions`
- Roles: guest/public
- Request:
```json
{ "creatorId": "cr_1", "decision": "approved" }
```
- Purpose: approve/deny creator as external reviewer
- Side effect: notify client in-app/email

## 5.9 Invitations and Creator Responses

### `POST /client/campaigns/{campaignId}/invitations/send`
- Roles: client (owner), admin
- Purpose:
  - send campaign to shortlisted creators (US-4.5, US-5.1)
  - set status to `awaiting_responses`
  - create invitation records
  - trigger in-app/email/SMS notifications

### `GET /creator/invitations`
- Roles: creator
- Purpose: list pending/accepted/declined invitations

### `PATCH /creator/invitations/{invitationId}`
- Roles: creator
- Request:
```json
{ "action": "accept" }
```
- Behavior:
  - update invitation status
  - notify client
  - if all invited creators accept: campaign -> `active` (US-5.3)
  - if decline: remove creator from shortlist/invited/accepted as policy requires

### `GET /client/campaigns/{campaignId}/invitations`
- Roles: client(admin for all)
- Purpose: show invitation state counts (pending/accepted/declined)

## 5.10 Notifications (In-App, Email, SMS Event Triggers)

### `GET /notifications`
- Roles: authenticated
- Query:
  - `isRead`, `type`, `page`, `pageSize`

### `PATCH /notifications/{notificationId}/read`
- Roles: authenticated owner

### `POST /notifications/read-all`
- Roles: authenticated owner

### `DELETE /notifications/{notificationId}`
- Roles: authenticated owner

### `POST /notifications/events`
- Roles: internal/service-to-service
- Purpose: ingestion endpoint from workflow events; fanout to in-app/email/SMS providers

## 5.11 Admin Creator Management

### `GET /admin/creators`
- Roles: admin
- Query:
  - `search`, `status`, `country`, `niche`, pagination/sort
- Purpose: US-6.1 list/filter/search

### `GET /admin/creators/{creatorId}`
- Roles: admin
- Purpose: full creator application data

### `PATCH /admin/creators/{creatorId}/status`
- Roles: admin
- Request:
```json
{
  "status": "rejected",
  "reason": "Social media handles could not be verified"
}
```
- Purpose: approve/reject/manual status (US-6.2)
- Rule: reason required when rejected
- Side effect: notify creator by email + in-app

### `PATCH /admin/creators/{creatorId}/internal-notes`
- Roles: admin
- Purpose: save internal-only notes

### `GET /admin/creators/export.csv`
- Roles: admin
- Query mirrors active filters
- Purpose: US-6.3 export filtered creator data

## 5.12 Admin Campaign Management

### `GET /admin/campaigns`
- Roles: admin
- Query:
  - `search`, `status`, `clientId`, `platform`, pagination/sort
- Purpose: US-7.1 list/filter

### `GET /admin/campaigns/{campaignId}`
- Roles: admin
- Purpose: full review view (brief, uploads, requirements, budget, timeline)

### `PATCH /admin/campaigns/{campaignId}/status`
- Roles: admin
- Purpose: approve/reject/manual lifecycle updates (US-7.2, US-7.4)

### `PATCH /admin/campaigns/{campaignId}/internal-notes`
- Roles: admin
- Purpose: admin notes

### `PUT /admin/campaigns/{campaignId}/shortlist`
- Roles: admin
- Purpose: assign/remove creators for campaign (US-7.3)

### `POST /admin/campaigns/{campaignId}/creators/{creatorId}`
- Roles: admin
- Purpose: add creator to active campaign, auto-create invitation (US-7.5)

### `DELETE /admin/campaigns/{campaignId}/creators/{creatorId}`
- Roles: admin
- Purpose: remove creator from active campaign (US-7.5)

### `GET /admin/campaigns/export.csv`
- Roles: admin
- Query mirrors active filters
- Purpose: US-7.6 export campaign + assigned creators + statuses

## 5.13 Admin Dashboard

### `GET /admin/dashboard/summary`
- Roles: admin
- Response includes:
  - total creators
  - pending creator reviews
  - total clients
  - active campaigns
  - campaigns pending review

### `GET /admin/dashboard/activity`
- Roles: admin
- Purpose: recent activity feed (status changes, submissions, registrations)

### `GET /admin/users`
- Roles: admin
- Purpose: combined creators + clients listing from dashboard

## 5.14 Access Control and Security

### `GET /rbac/me`
- Roles: authenticated
- Purpose: resolved permissions for current user (route and action guards)

### `GET /sessions`
- Roles: authenticated
- Purpose: session metadata

### `DELETE /sessions/{sessionId}`
- Roles: authenticated
- Purpose: revoke session

## 6. P1 Endpoints (Current UI has Mock Pages, Not Integrated Yet)

These pages exist and will need APIs when connected:

## 6.1 Messaging

- `GET /messages/conversations`
- `GET /messages/conversations/{conversationId}/messages`
- `POST /messages/conversations/{conversationId}/messages`
- `PATCH /messages/messages/{messageId}/read`
- WebSocket channel for real-time chat

## 6.2 Analytics and Reports

- `GET /client/reports/overview`
- `GET /client/reports/campaigns`
- `GET /client/reports/creators`
- `GET /client/reports/export`
- `GET /admin/reports/overview`
- `GET /admin/reports/recent`
- `GET /admin/reports/export`

## 6.3 Payments

- `GET /admin/payments/summary`
- `GET /admin/payments/transactions`
- `GET /admin/payments/payouts/pending`
- `POST /admin/payments/payouts/{payoutId}/approve`
- `POST /admin/payments/payouts/{payoutId}/reject`
- `GET /admin/payments/export`

## 6.4 User/Platform Settings

- `GET /creator/settings`
- `PUT /creator/settings`
- `GET /client/settings`
- `PUT /client/settings`
- `GET /admin/settings`
- `PUT /admin/settings`
- `PUT /settings/notification-preferences`
- `PUT /settings/privacy`

## 7. User Story -> Endpoint Coverage Matrix

## Epic 1 (Creator Onboarding & Profile)
- US-1.1: `POST /auth/register/creator`, `POST /auth/login`, `GET /auth/me`
- US-1.2: `POST /auth/email-verification/resend`, `POST /auth/email-verification/verify`
- US-1.3: `GET /creator/profile`, `PUT /creator/profile`
- US-1.4: `POST /creator/profile/submit`, `GET /creator/dashboard`
- US-1.5: `GET /creator/dashboard`, `GET /creator/profile`
- US-1.6: `PATCH /admin/creators/{id}/status`, `GET /creator/dashboard`, `GET /notifications`
- US-1.7: `PATCH /admin/creators/{id}/status`, `GET /creator/profile`, `PUT /creator/profile`, `POST /creator/profile/submit`

## Epic 2 (Client Onboarding)
- US-2.1: `POST /auth/register/client`, `POST /auth/email-verification/resend`
- US-2.2: `GET /client/company-profile`, `PUT /client/company-profile`, `GET /client/dashboard`

## Epic 3 (Campaign Creation)
- US-3.1: `POST /client/campaigns`, `PUT /client/campaigns/{id}`, upload endpoint(s)
- US-3.2: `GET /client/campaigns`, realtime status stream
- US-3.3: `POST /client/campaigns/{id}/submit`, `PATCH /admin/campaigns/{id}/status`

## Epic 4 (Discovery & Selection)
- US-4.1: `GET /marketplace/creators`, `GET /marketplace/creators/{id}`
- US-4.2: `GET /marketplace/creators` with combined filters
- US-4.3: `GET/PUT /client/campaigns/{id}/shortlist`
- US-4.4: `POST /client/campaigns/{id}/shortlist/share-links`, `GET /public/shortlist/review/{token}`, `POST /public/shortlist/review/{token}/decisions`
- US-4.5: `POST /client/campaigns/{id}/invitations/send`, `GET /client/campaigns/{id}/invitations`, notification fanout

## Epic 5 (Creator Campaign Response)
- US-5.1: `GET /creator/invitations`, notification fanout endpoints/events
- US-5.2: `PATCH /creator/invitations/{id}`, `GET /client/campaigns/{id}/invitations`
- US-5.3: `PATCH /creator/invitations/{id}` (server-side auto transition), `PATCH /admin/campaigns/{id}/status`

## Epic 6 (Admin Creator Management)
- US-6.1: `GET /admin/creators`
- US-6.2: `GET /admin/creators/{id}`, `PATCH /admin/creators/{id}/status`, `PATCH /admin/creators/{id}/internal-notes`
- US-6.3: `GET /admin/creators/export.csv`

## Epic 7 (Admin Campaign Management)
- US-7.1: `GET /admin/campaigns`
- US-7.2: `GET /admin/campaigns/{id}`, `PATCH /admin/campaigns/{id}/status`
- US-7.3: `PUT /admin/campaigns/{id}/shortlist`
- US-7.4: `PATCH /admin/campaigns/{id}/status`, `POST /admin/campaigns/status/bulk`
- US-7.5: `POST /admin/campaigns/{id}/creators/{creatorId}`, `DELETE /admin/campaigns/{id}/creators/{creatorId}`
- US-7.6: `GET /admin/campaigns/export.csv`

## Epic 8 (Admin Master Dashboard)
- US-8.1: `GET /admin/dashboard/summary`, `GET /admin/dashboard/activity`, `GET /admin/users`

## Epic 10 (Authentication & Security)
- US-10.1: `POST /auth/login`, password endpoints, session endpoints, RBAC endpoints
- US-10.2: `GET /auth/me`, `GET /rbac/me`, server-side role enforcement on all role-specific routes

## 8. Data Models Needed in Backend Responses

Backend payloads should align with frontend shape for minimal refactor:

- `User`
- `Creator` (+ `status`, `rejectionReason`, `adminNotes`, `submittedAt`)
- `Client`
- `Campaign` (+ shortlist/invited/accepted arrays + admin notes)
- `CampaignStatusLog`
- `CampaignInvitation`
- `Notification`
- `AdminSummaryStats`

## 9. Recommended Implementation Order

1. Auth + email verification + `/auth/me`
2. Creator/client profile endpoints
3. Campaign CRUD + submit + status logs
4. Admin review endpoints (creator + campaign)
5. Marketplace filters + shortlist APIs
6. Invitation send/respond + auto activation logic
7. Notifications + realtime updates
8. Export APIs
9. Settings/messages/reports/payments APIs

## 10. Notes for Backend Team

- Campaign and creator status transitions should be enforced server-side (not trusted from UI).
- Notification delivery should be event-driven (in-app persisted + email/SMS adapters).
- Share-link token endpoints must enforce expiry and guest-safe read scope.
- All export endpoints must honor active filters exactly.
- For smoother frontend migration, keep snake/camel consistency with current TS models or version DTOs explicitly.
