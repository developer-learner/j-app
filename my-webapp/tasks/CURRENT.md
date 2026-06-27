# Task 002: Restore Architect & Build Agents (Blueprint-Aligned)

**Status**: Approved
**Author**: PM
**Date**: 2026-06-26

## What

Restore the `architect` and `build` agents that were incorrectly removed, and align the agent configuration with the sw-dev-blueprint template's permission model (broad-allow + specific-deny). Also adopt relevant template rules (stack adaptation, escalation tripwire, thinking-model guard) into BLUEPRINT.md.

## Why

- **Architect and build were removed by mistake.** The 4-agent pipeline (PM → Architect → Build → Test) is the intended workflow.
- **Current permission model is wrong.** The `"*": "deny"` + carve-out-every-path pattern means agents can't write anything unless every possible path is explicitly allowed — and you'll miss some. The template's broad-allow + specific-deny pattern is simpler and doesn't waste time on permission-error debugging.
- **Template rules fill known gaps.** Stack adaptation (Rule 3) ensures docs match the real project. Escalation tripwire (Rule 2) prevents looping on the same fix. Thinking-model guard (Rule 1) prevents silent parsing failures.

## Flagged Assumptions

- No LM Studio / local model setup needed for this task. Rule 1 (thinking model) is documented in BLUEPRINT.md but not enforced by infrastructure.
- The orchestrator (`scripts/orchestrate.sh`) is skipped — j-app is manually driven. Phase-gate is noted as a future addition.

## Out of Scope

- `public/`, `firestore.rules`, `firebase.json` — these were modified in error during the removal; they should be restored to their committed state but are handled separately
- Feature work, code changes, LM Studio setup, orchestrator setup
- Converting agent names to bare names (e.g. `1-pm` → `pm`) — now completed as part of blueprint gap-fix task

## Files Involved

| # | File | Change |
|---|---|---|
| 1 | `my-webapp/opencode.json` | Add `architect` + `build`; switch to broad-allow + specific-deny permissions |
| 2 | `opencode.json` (root) | Same, with `my-webapp/`-prefixed paths (later deleted — duplicate) |
| 3 | `my-webapp/.opencode/prompts/architect.md` | Restore from git (was deleted) |
| 4 | `my-webapp/.opencode/prompts/build.md` | Restore from git (was deleted) |
| 5 | `my-webapp/CLAUDE.md` | Add Architect + Build rows to Agent Roles table |
| 6 | `my-webapp/AGENTS.md` | Same (content-equivalent to CLAUDE.md) |
| 7 | `my-webapp/BLUEPRINT.md` | Restore Architect/Build sections; add Rules 1, 2, 3 from template; restore write-boundary + Build Report + Tests-from-PRD rules; note phase-gate as future |
| 8 | `my-webapp/README.md` | Restore `@architect` + `@build` references |
| 9 | `my-webapp/docs/PM-ROLE.md` | Restore architect/build in Drive section |
| 10 | `my-webapp/docs/DECISIONS.md` | Revert D-06 to 4-agent model |
| 11 | `my-webapp/tasks/CURRENT.md` | This PRD |

---

## Acceptance Criteria

### R-01 (Required) — opencode.json: 4 agents with broad-allow + specific-deny permissions

`my-webapp/opencode.json` defines 4 agents using the template's permission pattern.

**PM agent** (`pm`):
```json
"pm": {
  "description": "PM agent — translates human intent into PRD, verifies results",
  "mode": "primary",
  "prompt": "{file:.opencode/prompts/pm.md}",
  "permission": {
    "edit": { "public/**": "deny", "tests/**": "deny" }
  }
}
```
No explicit read restriction — can read everything. Edit denies only `public/` and `tests/`.

**Architect agent** (`architect`):
```json
"architect": {
  "description": "Architect agent — produces engineering plans from approved PRD",
  "mode": "primary",
  "prompt": "{file:.opencode/prompts/architect.md}",
  "permission": {
    "edit": { "public/**": "deny", "tests/**": "deny" }
  }
}
```

**Build agent** (`build`):
```json
"build": {
  "description": "Build agent — implements code per PRD + architecture",
  "mode": "primary",
  "prompt": "{file:.opencode/prompts/build.md}",
  "permission": {
    "edit": { "tests/**": "deny", "**": "allow" }
  }
}
```
Broad-allow: can write everything except `tests/`.

**Test agent** (`test`):
```json
"test": {
  "description": "Test agent — writes tests from PRD acceptance criteria",
  "mode": "primary",
  "prompt": "{file:.opencode/prompts/test.md}",
  "permission": {
    "edit": { "public/**": "deny", "tests/**": "allow" }
  }
}
```
Deny `public/` (analogous to template's `src/`), allow `tests/`.

**Note on the permission model**: These are speed bumps, not guarantees. OpenCode agent permissions are non-transitive (a restricted agent can bypass limits via the Task tool). The real enforcement is a combination of agent prompts and (future) a `phase-gate.sh` script. But broad-allow + specific-deny means agents can do legitimate work without hitting permission errors for every new path.

### R-02 (Required) — Root opencode.json mirrors my-webapp config

`/Users/arc.elixir/dev/j-app/opencode.json` defines the same 4 agents with `my-webapp/`-prefixed paths. Same permission patterns.
(Later deleted in blueprint gap-fix — root config removed to eliminate duplicate-config landmine, single source of truth in `my-webapp/opencode.json`.)

### R-03 (Required) — Prompt files restored

`my-webapp/.opencode/prompts/architect.md` restored from git with content:
- Role: produce engineering plans from approved PRD
- Writes: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- Never writes `public/` or `tests/`
- Never runs deployment commands

`my-webapp/.opencode/prompts/build.md` restored from git with content:
- Role: implement code per PRD + architecture plan
- Writes: `public/`, root config files, `firestore.rules`, `firebase.json`
- Appends Build Report to `tasks/CURRENT.md` after completion
- Does NOT modify the Status field (PM's responsibility)
- Does NOT write tests or architecture documents

### R-04 (Required) — CLAUDE.md / AGENTS.md list all 4 agents

Agent Roles table in both files:

| Role | Responsibility | Writes |
|---|---|---|
| **PM** | Intake business intent → structured PRD in `tasks/CURRENT.md`. Verify results against PRD. | `tasks/`, `docs/PRODUCT.md` |
| **Architect** | Engineering plan from approved PRD. Write architecture + decisions. | `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` |
| **Build** | Implement code per PRD + architecture. | `public/`, root config files |
| **Test** | Write tests from PRD acceptance criteria. | `tests/` (future) |

### R-05 (Required) — BLUEPRINT.md aligned with template

Contains the following sections restored from the committed version PLUS new rules from the template:

**Hard Rules:**
- **H-01**: No backend server (existing — keep)
- **H-02**: Auth guard before condition (existing — keep)
- **H-03**: Queries must filter by userId (existing — keep)
- **H-04**: Backfill before field-check rule (existing — keep)
- **H-05**: Roles are write-boundaried — PM writes `tasks/` + `docs/PRODUCT.md`; Architect writes `docs/ARCHITECTURE.md` + `docs/DECISIONS.md`; Build writes `public/` + root config; Test writes `tests/`. No cross-boundary writes.
- **H-06**: Build Report, not Status — build agent appends summary to CURRENT.md under "Build Report", never modifies Status field
- **H-07**: Tests derive from PRD, not implementation — test agent's source of truth is PRD acceptance criteria, not source code

**New rules from template:**
- **H-08 (Rule 1)**: The model must NOT be a thinking model — thinking models emit output into `reasoning_content` and leave `content` empty, breaking agent parsing. If using LM Studio, verify a non-thinking model is loaded before work.
- **H-09 (Rule 2)**: Escalation tripwire — same failure twice → escalate. Do not retry the same fix more than twice. Two strikes → escalate to a frontier model or halt and leave a note.
- **H-10 (Rule 3)**: Stack adaptation — this project uses Firebase (Firestore, Auth, Hosting), vanilla JS, no build step. The sw-dev-blueprint template's Python/FastAPI defaults are NOT applicable. All documentation must reflect the actual stack.

**Agent Roles sections:**
- Architect: description, responsibilities, write paths
- Build: description, responsibilities, write paths, Build Report rule

**Phase-gate note:**
Add a note under "Future" or "Anti-Patterns": *"INV-2 enforcement (phase-gate.sh) is not yet implemented. Role boundaries are enforced by agent prompts and opencode.json permissions only — these are non-transitive and bypassable. Adding `scripts/phase-gate.sh` as a standalone post-phase check is recommended."*

### R-06 (Required) — README.md references all 4 agents

```
- `@pm` — define tasks and verify output
- `@architect` — plan features
- `@build` — implement code
- `@test` — write tests
```

### R-07 (Required) — PM-ROLE.md references architect and build

The "Drive" section in `docs/PM-ROLE.md` references `@architect`, `@build`, and `@test` as the agents to brief.

### R-08 (Required) — DECISIONS.md D-06 reverted to 4-agent model

D-06 states: *"All 4 agents use the same frontier model. Role separation enforced by opencode.json path restrictions and handoff protocol."* Revert the 2-agent override.

### R-09 (Required) — CLAUDE.md stack matches project reality

CLAUDE.md (and AGENTS.md) accurately describes:
- **Runtime**: Vanilla JavaScript (ES5+), HTML5, CSS3
- **Firebase**: compat SDK v10.14.1 (`firebase-app-compat`, `firebase-firestore-compat`, `firebase-auth-compat`)
- **Database**: Firestore (native mode) — flat collections with `userId` field for ownership
- **Auth**: Firebase Auth (email/password)
- **Hosting**: Firebase Hosting (static site, deploy via `firebase deploy`)
- **No build step**: No bundler, no transpiler, no framework. Scripts loaded via `<script defer>`.
- **No backend server**: All logic runs in the browser.

(Already correct — verify no regression from the removal edits.)

### E-01 (Expected) — opencode.json passes JSON validation

Both `opencode.json` files are valid JSON.

### E-02 (Expected) — No files outside the 11 listed are modified

Only the files in the "Files Involved" table are changed. The `public/` directory, `firestore.rules`, and `firebase.json` are NOT modified.

### S-01 (State-driven) — Working tree on `main` branch

All changes are applied to the working tree on `main` branch. No new branch unless requested.

---

## Verification

1. **Read** each modified file and confirm content matches acceptance criteria
2. **Validate** `my-webapp/opencode.json` with `python3 -m json.tool` or equivalent
3. **Diff check** — `git diff --stat` should show only the 11 listed files
4. **Agent roles** — Confirm prompt files exist: `ls my-webapp/.opencode/prompts/` shows `architect.md`, `build.md`, `pm.md`, `test.md`
5. **Stack accuracy** — Read CLAUDE.md and verify tech stack matches j-app's actual stack (Firebase compat v10, vanilla JS, no build)

---

## Build Report

**Executed by**: Build agent
**Date**: 2026-06-26

**Summary**: Restored `architect` and `build` agents across 11 files. Switched permission model from `"*": "deny"` + carve-out-every-path to template's broad-allow + specific-deny pattern. Added H-08 (no thinking model), H-09 (escalation tripwire), H-10 (stack adaptation) to BLUEPRINT.md. Added phase-gate note. Restored prompt files for architect and build from git.

**Files changed** (11 total):
1. `my-webapp/opencode.json` — 4 agents with broad-allow + specific-deny permissions
2. `opencode.json` (root) — same, with `my-webapp/`-prefixed paths
3. `my-webapp/.opencode/prompts/architect.md` — restored from git
4. `my-webapp/.opencode/prompts/build.md` — restored from git
5. `my-webapp/CLAUDE.md` — added Architect + Build to Agent Roles table
6. `my-webapp/AGENTS.md` — same
7. `my-webapp/BLUEPRINT.md` — restored H-05/06/07, added H-08/09/10, Architect/Build sections, phase-gate note
8. `my-webapp/README.md` — restored `@architect` + `@build`
9. `my-webapp/docs/PM-ROLE.md` — restored architect/build references
10. `my-webapp/docs/DECISIONS.md` — reverted D-06 to 4-agent model
11. `my-webapp/tasks/CURRENT.md` — PRD set to Approved, Build Report appended

**Deviations from PRD**: None.
