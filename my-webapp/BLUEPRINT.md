# Journal App — Blueprint

## Overview
This is the master seed document for the Journal App project. Any LLM joining this project should read this file first to understand the system, its roles, and its rules.

This project is a personal journal web app evolving into a journal + todo-manager. Hosted on Firebase, no backend server, vanilla JavaScript.

## Document Map (Reading Order)
1. `BLUEPRINT.md` (this file) — system overview, roles, hard rules
2. `CLAUDE.md` — project context, guardrails, agent roles (auto-loaded by OpenCode)
3. `CONVENTIONS.md` — code style and patterns
4. `docs/ARCHITECTURE.md` — living system design
5. `docs/DECISIONS.md` — architectural decision log
6. `docs/PRODUCT.md` — product context and roadmap
7. `docs/TESTING.md` — testing strategy
8. `tasks/CURRENT.md` — active task
9. `tasks/BACKLOG.md` — prioritized backlog

## Hard Rules (Non-Negotiable)

### H-01: No backend server
All logic runs in the browser. Firebase is the only backend dependency. Do not introduce a server, container, or server-side runtime.

### H-02: Auth guard before condition
The `authHandled` flag must be set before the `if(user)` check in `onAuthStateChanged`. This prevents null re-fires from redirecting to login.

### H-03: Queries must filter by userId
Every Firestore query on entry collections must include `.where('userId', '==', currentUserUid)`. The rules enforce this — queries without it will be denied.

### H-04: Backfill before field-check rule
Any new rule that checks a document field must be preceded by a backfill of that field on every existing document.

### H-05: Roles are write-boundaried
PM writes `tasks/` and `docs/PRODUCT.md`. Architect writes `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`. Build writes `public/` and root config. Test writes `tests/`. No cross-boundary writes.

### H-06: Build Report, not Status
Build agent appends completion summary to `tasks/CURRENT.md` under "Build Report". Build agent never modifies the Status field — that is PM's responsibility.

### H-07: Tests derive from PRD, not implementation
When tests exist, they must be written from the acceptance criteria in `tasks/CURRENT.md`, not from reading the source code.

## Agent Roles

### PM
- Translates human intent into structured EARS PRD in `tasks/CURRENT.md`
- Owns product direction and priorities
- Reviews build output and verifies against PRD
- Sets Status field (Draft → Approved → Complete)
- Writes: `tasks/CURRENT.md`, `tasks/BACKLOG.md`, `docs/PRODUCT.md`, `docs/PM-ROLE.md`

### Architect
- Produces engineering plan from approved PRD
- Writes architecture documentation and decision log
- Never writes `public/` or `tests/`
- Writes: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`

### Build
- Implements code per PRD + architecture plan
- Source of truth is PRD acceptance criteria + ARCHITECTURE.md + DECISIONS.md
- After completion, appends summary to `tasks/CURRENT.md` "Build Report" section
- Writes: `public/`, root config files (CLAUDE.md, opencode.json, etc.)

### Test
- Writes tests from PRD acceptance criteria
- Must NOT read source code to decide correctness
- Writes: `tests/` (future)

## Bootstrap Sequence
1. ~~Phase 1: Adopt blueprint documentation~~ (current task)
2. Phase 2: Migrate to Supabase (deferred)
3. Phase 3+: Todo-manager feature buildout

## Anti-Patterns (Do Not Do)
- Do not add `.orderBy()` to Firestore queries — always sort client-side
- Do not use `prompt()`, `alert()`, or `confirm()` — use Toast and custom modal
- Do not rely on `var()` inside `hsl()` — iOS Safari doesn't support it
- Do not move `authHandled` inside `if(user)` — causes redirect loop on token refresh
- Do not deploy a rule change that references a field without verifying every document has that field
