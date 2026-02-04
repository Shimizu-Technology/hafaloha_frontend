# Development Guide — Hafaloha Legacy Frontend

> **Project:** hafaloha_frontend (Concert ordering UI)
> **Stack:** React 18 · Vite · TypeScript · Tailwind CSS
> **API:** Expects legacy API at `localhost:3000`
> **Plane Board:** HL1 (Hafaloha Legacy V1)
> **Deadline:** March 2026 concert — will be archived after

---

## Quick Start

```bash
git clone git@github.com:Shimizu-Technology/hafaloha_frontend.git
cd hafaloha_frontend
npm install
npm run dev          # → http://localhost:5173
```

> Requires the legacy API running at `localhost:3000`. See [legacy-hafaloha-api](../legacy-hafaloha-api/DEVELOPMENT.md).

---

## Gate Script

**Every PR must pass the gate before submission.**

```bash
./scripts/gate.sh
```

This runs:
1. **TypeScript check** — type errors fail the gate
2. **Vite build** — production build must succeed
3. **Playwright E2E tests** — 16 tests across 5 suites

❌ If the gate fails, fix the issues before creating a PR. No exceptions.

---

## Development Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Start dev server | `npm run dev` |
| Build for prod | `npm run build` |
| Type check | `npx tsc --noEmit` |
| Run E2E tests | `npx playwright test` |
| Run gate | `./scripts/gate.sh` |

---

## Closed-Loop Development Workflow

We use a "close the loop" approach where agents verify their own work before human review:

### Three Gates

1. **Sub-Agent Gate (automated)** — `./scripts/gate.sh` must pass (tsc + build + Playwright)
2. **Jerry Visual QA (real browser)** — Navigate pages, take screenshots, verify flows work
3. **Leon Final Review (human)** — Review PR + screenshots, approve/reject

Leon shifts from "test everything" to "approve verified work." The gate script is the first line of defense — no PR without a green gate.

### Branch Strategy

- All feature work branches from `staging`
- All PRs target `staging` (never `main` directly)
- `main` only gets updated when Leon approves merging staging
- Feature branches: `feature/<TICKET-ID>-description`

```bash
git checkout staging && git pull
git checkout -b feature/HL1-15-redesign-menu-page
```

### PR Process

- **Title:** `HL1-15: Redesign menu page layout`
- **Body includes:** what changed, gate results, screenshots
- After creating PR:
  1. Move Plane ticket (HL1 board) to **QA / Testing**
  2. Add PR link to the ticket

### Ticket Tracking

All work is tracked on the **HL1** board in [Plane](https://plane.shimizu-technology.com).

---

## Architecture Notes

- **Port:** Dev server runs on 5173, proxies API requests to localhost:3000
- **This project has a finite lifespan** — it serves the March 2026 concert and will be archived after
- Paired with [legacy-hafaloha-api](../legacy-hafaloha-api/DEVELOPMENT.md)
