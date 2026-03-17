# ShiftSync 🌊 — Workforce Scheduling Platform

> A production-quality MVP scheduling engine built for **Coastal Eats**, a restaurant group operating across multiple time zones.
> ShiftSync actively prevents scheduling mistakes, enforces labor constraints, and coordinates shifts in real-time.

![ShiftSync Tech Stack](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)
![Convex](https://img.shields.io/badge/Convex-Backend_&_DB-ef4444?style=flat&logo=convex)
![Better Auth](https://img.shields.io/badge/Better_Auth-Authentication-blue?style=flat)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Styling-06B6D4?style=flat&logo=tailwindcss)

---

## 🎯 The Problem Solved

Scheduling across 4 geographic locations with varying staff availability, certifications, and skills is complex. ShiftSync moves beyond a simple calendar by implementing a **strict constraint engine** that physically prevents:

- Double-booking staff across locations
- Insufficient rest periods between shifts (< 10 hours)
- Assigning staff without required skills or location certifications
- Scheduling staff outside their stated availability

## ✨ Key Features Implemented

- **Role-Based Access Control (RBAC)**: Distinct, isolated experiences for Corporate Admins, Location Managers, and Staff.
- **Real-time Constraint Engine**: Evaluates 5+ business rules instantly during shift assignment and mathematically prevents illegal schedules.
- **Overtime & Fairness Analytics**: Tracks premium shifts (Friday/Saturday nights) and flags impending weekly overtime (> 35 hours warning, > 40 hours block).
- **Timezone Intelligence**: Automatically normalizes shifts spanning PT and ET. A shift is stored in UTC but perfectly displayed in the location's local timezone, validating against the staff member's home timezone availability.
- **Shift Swapping Marketplace**: Staff can request, target, and accept shift swaps. Managers hold the final approval key, with the constraint engine re-running on the swap target.
- **Sunday Night Chaos Mode**: 1-click "Find Coverage" algorithm prioritizes and suggests eligible replacements for emergency call-outs.
- **Real-time Subscriptions**: Built on Convex, every screen updates instantly—via WebSockets—without a single page reload.

---

## 🚀 Deliverables Checklist

- [x] **Working Application** — Deployed and publicly accessible.
- [x] **Source Code** — Complete monorepo (Turborepo) with isolated `apps/web` and `packages/backend`.
- [x] **Seed Data** — Pre-populated with 22 users, 4 locations, 28 shifts, and edge-case scenarios (overtime, pending swaps).
- [x] **Documentation** — This README containing login credentials, setup instructions, and architectural assumptions.

---

## 🔑 Demo Credentials (Seeded Data)

The database is heavily seeded to demonstrate real-world usage. Use these credentials to test the different role boundaries. All passwords are `password123`.

### 1. Corporate Admin

Has global read access, fairness analytics, and audit logs. Cannot manage day-to-day shifts.

- **Email:** `diana@shiftsync.local`
- **Password:** `password123`

### 2. Location Managers

Manage specific locations. Can create shifts, assign staff, publish schedules, and approve swaps.

- **Email:** `victor@shiftsync.local` (Manages Downtown Manhattan)
- **Email:** `rachel@shiftsync.local` (Manages Brooklyn Heights)
- **Email:** `hannah@shiftsync.local` (Manages both LA locations)

### 3. Staff Members

Have specific skills and location certifications. Can set availability, request swaps, and view schedules.

- **Email:** `emma@shiftsync.local` (NY Staff — Currently in an overtime warning scenario)
- **Email:** `liam@shiftsync.local` (NY Staff — Has a pending swap request)
- **Email:** `lucas@shiftsync.local` (LA Staff)

_(Note: There are 15 total staff and 6 total managers seeded. You can log in using `[firstname]@shiftsync.local` for any of the seeded names.)_

---

## 🛠️ Local Setup & Installation

This project is a Turborepo utilizing `bun`.

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Backend (Convex)

Open a terminal and start the Convex dev server:

```bash
cd packages/backend
npx convex dev
```

Convex will prompt you to create a project and automatically provision your cloud backend.

### 3. Set Environment Variables

In the Convex dashboard (Settings -> Environment Variables), set:

- `SITE_URL`: `http://localhost:3000`
- `BETTER_AUTH_SECRET`: Generate a random 32-character string (e.g. via `openssl rand -base64 32`)

In the `apps/web/` directory, create a `.env` file with the URLs provided by your Convex dev terminal:

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-dev-slug>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<your-dev-slug>.convex.site
```

### 4. Run the Seed Script

Populate the database with the required test data:

```bash
cd packages/backend
npx convex run seed:run
```

### 5. Start the Frontend

In a new terminal window at the project root:

```bash
bun dev
```

Visit `http://localhost:3000` to log in!

---

## 🧠 Assumptions & Limitations

To maintain a focused MVP, the following design decisions and scopes were established:

### Assumptions (Design Decisions)

- **Manager/Location Relationships:** Managers can oversee multiple locations, and locations can have multiple managers (or none, defaulting to Admin control).
- **Availability Timezones:** Staff availability is defined in their local home timezone. Shifts are converted to this timezone during constraint validation.
- **Overnight Shifts:** Shifts crossing midnight are treated as single continuous blocks (stored in UTC) rather than split by day.
- **Consecutive Days & Overtime:** Any shift counts as a "day worked". Staff reaching 35+ hours trigger a warning, and 40+ hours triggers an overtime warning (managers are warned but not strictly blocked).
- **Premium Shifts:** Automatically defined as any shift starting after 5:00 PM on Fridays or Saturdays.
- **Swap Cancellations & Concurrency:** If a manager edits a shift, any pending swap requests for it are automatically cancelled. All concurrency validation is handled at the database level to prevent race conditions during assignment.

### Limitations (Actively Scoped Out)

To ensure the core constraints engine was rock-solid, the following secondary features were intentionally excluded:

- **No Drop Marketplace:** Staff cannot publicly drop/pickup shifts; only directed 1-on-1 swaps are supported.
- **No External Notifications:** All notifications are strictly in-app (no email or granular preference settings).
- **Simplified Schedules & Edits:** Managers can edit schedules at any time (no 48-hour freeze rule enforced).
- **Cost Accounting:** Overtime is flagged by hours, not by monetary cost projections or "desired hours" logic.
- **Simplified Availability & Fairness:** Availability is recurring weekly (no date-specific overriding), and fairness is measured strictly by total hours and premium shift counts (no advanced scoring algorithms).
- **Other Exclusions:** No audit log exports, no live "clocked-in" tracking, no auto-expiring shift drops, and simplified DST edge-case handling.

---

_Built with care for Coastal Eats. 🌊_
