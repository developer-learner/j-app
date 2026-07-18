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
PM writes `tasks/`, `docs/`, `BLUEPRINT.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`, and `.opencode/prompts/`. Architect writes `docs/ARCHITECTURE.md` and `docs/DECISIONS.md`. Build writes `public/` and root config files. Test writes `tests/`. No cross-boundary writes.

### H-06: Build Report, not Status
Build agent appends completion summary to `tasks/CURRENT.md` under "Build Report". Build agent never modifies the Status field — that is PM's responsibility.

### H-07: Tests derive from PRD, not implementation
When tests exist, they must be written from the acceptance criteria in `tasks/CURRENT.md`, not from reading the source code.

### H-08: Model must NOT be a thinking model (Rule 1 from blueprint)
Thinking models emit output into `reasoning_content` and leave `content` empty, which breaks agent parsing (empty/invalid response → silent failure or JSON error). The active model in OpenCode MUST NOT route output through `reasoning_content`. This failure mode is specific to OpenAI-compatible local servers; the Anthropic cloud provider (current config, D-72) returns `content` normally.

### H-09: Escalation tripwire — two strikes, then escalate (Rule 2 from blueprint)
Do not retry the same failing fix more than twice. Two strikes → escalate to a frontier model or halt and leave a note. Same failure twice → re-plan; plan fails twice → escalate to PM; PM stuck → human decides.

### H-10: Stack adaptation — docs must match actual stack (Rule 3 from blueprint)
This project uses Firebase compat SDK v10, vanilla JavaScript, no build step, no backend server. The sw-dev-blueprint template's Python/FastAPI defaults do not apply. All documentation must reflect the actual stack. If a template document has placeholder stack information, it must be adapted before the first commit.

## Agent Roles

### PM
- Translates human intent into structured EARS PRD in `tasks/CURRENT.md`
- Owns product direction and priorities
- Reviews build output and verifies against PRD
- Sets Status field (Draft → Approved → Complete)
- Writes: `tasks/`, `docs/`, `BLUEPRINT.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `.opencode/prompts/`

### Architect
- Produces engineering plan from approved PRD
- Writes architecture documentation and decision log
- Never writes `public/` or `tests/`
- Writes: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`

### Build
- Implements code per PRD + architecture plan
- Source of truth is PRD acceptance criteria + ARCHITECTURE.md + DECISIONS.md
- After completion, appends summary to `tasks/CURRENT.md` "Build Report" section
- Does NOT modify the Status field — that belongs to PM
- Writes: `public/`, root config files (CLAUDE.md, opencode.json, etc.)

### Test
- Writes tests from PRD acceptance criteria
- Must NOT read source code to decide correctness
- Writes: `tests/` (future)

## Bootstrap Sequence
1. ~~Phase 1: Adopt blueprint documentation~~ (current task)
2. Phase 2: Migrate to Supabase (deferred)
3. Phase 3+: Todo-manager feature buildout

## Phase-Gate Note
INV-2 enforcement is implemented via two scripts:

1. **`scripts/phase-gate.sh`** — the gate itself. Checks that the given role only touched its allowed paths (INV-2) and that all D-IDs are cross-referenced (INV-3). Run standalone with `bash scripts/phase-gate.sh <role>`.

2. **`scripts/agent.sh`** — the recommended invocation wrapper. Runs `opencode run --agent <role>` then immediately runs `scripts/phase-gate.sh <role>`. This makes the gate fire per-phase, before any files are committed. Usage: `bash scripts/agent.sh <role> "instruction"`.

OpenCode agent permissions remain non-transitive (a restricted agent can bypass limits via the Task tool), so the gate is not a mechanical barrier — but the wrapper makes it a preventive speed bump that fires every time, not a detective check after the fact.

## Component Inventory

The full set of tools and objects this project runs on:

| Object | Role |
|--------|------|
| **git** | Version control + the LLM's undo button. Every edit is committable; any mistake is `git reset` away. Also: backup, attribution, collaboration. |
| **GitHub** | The remote. Off-machine backup, and host for the repository. |
| **Firebase** | Auth (email/password), Firestore (database), Hosting (static site) — the only backend dependency. |
| **Firebase CLI** | Deployment. Runs `firebase deploy` to push `public/` and deploy rules. |
| **OpenCode** | The coding agent. Reads CLAUDE.md/AGENTS.md + CONVENTIONS.md automatically, talks plain English, writes files to disk. |
| **The docs** | The memory layer for stateless LLMs (this file + CLAUDE.md + CONVENTIONS.md + docs/ + tasks/). |
| **AGENTS.md** | Content-equivalent to CLAUDE.md. OpenCode's preferred entry point; keeps content in sync with no symlink. |
| **Four agents** (PM/Architect/Build/Test) | Role pipeline: PM writes PRD, Architect plans, Build writes `public/`, Test writes `tests/`. Defined in `opencode.json`. |

---

## The System in One Diagram

```
Human casual instruction
      │
      ▼  (PM translates — lossy, the only human-checked step)
PRD + acceptance criteria  [tasks/CURRENT.md, committed]
      │  ← HUMAN APPROVAL GATE (Status: Approved). Criteria freeze here.
      ▼
Architect → eng plan (ARCHITECTURE.md / DECISIONS.md)
      │
      ▼
Build (public/ + root configs) ──► PM verification (read files, check criteria)
                                          │
                              pass → done   fail → route up to PM → human decides
```

Note: j-app does not use `scripts/orchestrate.sh`. Handoff between agents is manual (PM-driven). Use `bash scripts/agent.sh <role> "instruction"` to invoke an agent and automatically run the INV-2 + INV-3 gate (via `scripts/agent.sh` → `scripts/phase-gate.sh`). Standalone gate check: `bash scripts/phase-gate.sh <role>`. Role boundaries are also enforced by `opencode.json` permissions and agent prompts (non-transitive — see Phase-Gate Note above).

---

## Cost Model

| Role | Model tier | Why |
|------|-----------|-----|
| PM, Architect, Build, Test | Frontier (single model) | All 4 agents use the same frontier model per D-06. No LM Studio or local model setup. Role separation is enforced by `opencode.json` path restrictions and handoff protocol, not by capability difference. |

If a future setup introduces local + frontier tiers, document the split here.

---

## The Maintenance Contract

| Trigger | Action | File |
|---------|--------|------|
| Non-obvious decision made | Log it with reasoning | `DECISIONS.md` |
| LLM made a mistake you corrected | Add guard | `CLAUDE.md` correction log |
| Task completed | Move to completed table | `BACKLOG.md` |
| Schema changed | Update data models | `ARCHITECTURE.md` |

**The correction log rule** is the most important habit. It turns every LLM mistake into a permanent improvement. A project 6 months in should have a `CLAUDE.md` full of hard-won guards — that's a sign the system is working.

---

## Files the LLM Should Never Touch Without Explicit Instruction

- `DECISIONS.md` — human/Architect-authored record of deliberate choices; do not edit without explicit instruction
- `CLAUDE.md` correction log — human-maintained; rows added per the rule, not by the LLM
- `tasks/BACKLOG.md` completed section — historical record; entries move here from `CURRENT.md`, not edited
- `docs/.pm-last-review` — PM-owned review marker; no agent advances this file

---

## Anti-Patterns (Do Not Do)
- Do not add `.orderBy()` to Firestore queries — always sort client-side
- Do not use `prompt()`, `alert()`, or `confirm()` — use Toast and custom modal
- Do not rely on `var()` inside `hsl()` — iOS Safari doesn't support it
- Do not move `authHandled` inside `if(user)` — causes redirect loop on token refresh
- Do not deploy a rule change that references a field without verifying every document has that field
