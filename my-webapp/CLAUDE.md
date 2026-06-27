# Journal App — Project Context

## Overview
A personal journal web app hosted on Firebase. Combines free-form journaling with structured task management (journal → todo-manager roadmap). Single-user, web-first, no backend server.

## Tech Stack
- **Runtime**: Vanilla JavaScript (ES5+), HTML5, CSS3
- **Firebase**: compat SDK v10.14.1 (`firebase-app-compat`, `firebase-firestore-compat`, `firebase-auth-compat`)
- **Database**: Firestore (native mode) — flat collections with `userId` field for ownership
- **Auth**: Firebase Auth (email/password)
- **Hosting**: Firebase Hosting (static site, deploy via `firebase deploy`)
- **No build step**: No bundler, no transpiler, no framework. Scripts loaded via `<script defer>`.
- **No backend server**: All logic runs in the browser.

## Project Structure
```
my-webapp/
├── public/
│   ├── index.html          — Main app (auth, CRUD, tabs, theme, markdown, export)
│   ├── login.html           — Auth UI (login, signup, password reset)
│   ├── styles/style.css     — All styles (~950 lines)
│   └── js/search_functionality.js — Search + date filter module
├── firestore.rules          — Firestore security rules
├── firebase.json            — Firebase project config
├── CLAUDE.md                — This file (LLM context, loaded every session)
├── AGENTS.md                — Content-equivalent to CLAUDE.md
├── BLUEPRINT.md             — Master seed doc (system overview, roles, hard rules)
├── CONVENTIONS.md           — Code style & patterns
├── opencode.json            — OpenCode agent configuration
├── .env.example             — Environment variable template
├── .gitignore               — Git ignore rules
├── README.md                — Human entry point
├── docs/                    — Architecture, decisions, product, testing
├── tasks/                   — Task tracking (CURRENT.md, BACKLOG.md)
└── .opencode/prompts/       — Agent role prompts
```

## Guardrails (Hard Rules)

### G-01: Auth guard pattern is inviolable
The `authHandled` flag must be set BEFORE the `if(user)` check in `onAuthStateChanged`. Do not move it inside the `if(user)` block — that causes null re-fires on token refresh to redirect to login.

### G-02: Every query on entry collections must filter by userId
Firestore rules enforce `resource.data.userId == request.auth.uid`. Any query reading `journalEntries`, `workJournalEntries`, or `{name}JournalEntries` must include `.where('userId', '==', currentUserUid)`. Queries without this filter will be denied by the rules layer.

### G-03: Never add a field-level rule check without backfill
Adding a rule like `resource.data.someField == request.auth.uid` when existing documents lack `someField` will silently deny access to those documents. Always backfill the field on all existing documents before deploying a rule that checks it.

### G-04: No `orderBy` in Firestore queries — sort client-side
Firestore composite indexes are required for `where` + `orderBy` queries. Custom journal collections make this impractical. Always fetch with `.where()` only and sort in JavaScript. The app already sorts for pinned entries — extend that pattern.

## Agent Roles
| Role | Responsibility | Writes |
|---|---|---|
| **PM** | Intake business intent → structured PRD in `tasks/CURRENT.md`. Verify results against PRD. | `tasks/`, `docs/PRODUCT.md` |
| **Architect** | Engineering plan from approved PRD. Write architecture + decisions. | `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` |
| **Build** | Implement code per PRD + architecture. | `public/`, root config files |
| **Test** | Write tests from PRD acceptance criteria. | `tests/` (future) |

## Reporting

When summarizing work since the last PM review (status reports, commit scoping, progress updates):

1. Read `docs/.pm-last-review` to get the last reviewed ref:
   ```
   LAST=$(cat docs/.pm-last-review 2>/dev/null || git rev-list --max-parents=0 HEAD)
   ```
2. Derive the commit list from the tree, not memory:
   ```
   git log "$LAST"..HEAD --oneline
   ```
3. State the scope explicitly in the report: "N new commits since reviewed ref `$LAST`".
4. Never write or advance `docs/.pm-last-review` — PM-owned.
5. If the file is missing (fresh checkout), the `git rev-list` fallback uses the initial commit — the scope becomes the entire history, which is correct for a first report.

## Operating Rules

> A rule that cannot be enforced mechanically is a suggestion, not a rule. Document the enforcement mechanism alongside every rule — and where there is none, say so explicitly.

Seven rules for agents working in this repo, derived from failures in prior sessions. Rules 2–7 are advisory — they rely on PM review for enforcement. Rule 1 has a mechanical backstop.

1. **Report against the tree, never memory.** Derive your commit list from `LAST=$(cat docs/.pm-last-review); git log "$LAST"..HEAD --oneline`. State the range. A report that disagrees with `git log` is a defect regardless of the underlying work. *(Mechanical backstop: `docs/.pm-last-review` + PM source-side reconciliation.)*

2. **One commit, one concern.** Any change to a gate, invariant, permission, or model choice gets its own isolated commit whose message names it as such. Never bundle a constraint change with unrelated edits.

3. **A change to what a rule does is stop-and-ask.** Improving how a gate detects — fix freely. Changing what happens on a violation, or relaxing any constraint — stop and ask the PM first, even mid-run, even if the rule is what's slowing you down. The rule slowing you down is usually it working.

4. **Conditionals are checkpoints.** "Only do X if Y fails" means: when you reach that point, report whether Y failed and what you chose. If Y didn't fail, say so — don't silently act.

5. **Read the artifact, not the summary.** Report from committed files, never from another agent's summary or your own memory of a run. When source and summary disagree, source wins.

6. **"Detected" ≠ "enforced"; "nothing went wrong" ≠ "safeguard works."** Keep standalone-test results and live-run results as separate claims. An untriggered safeguard is inconclusive, not green.

7. **Decide trivial calls; escalate only contested principles.** If the PM has stated the governing principle ("put it where process docs live"), execute — don't re-ask for confirmation or surface options for a low-stakes choice. Escalate only when the principle itself is unclear, or when correctness is genuinely at stake (then asking is correct, not a failure).

## LLM Correction Log

> When the LLM makes a mistake and you correct it, log it here.
> This is the most valuable section — it prevents repeat mistakes.
> A project 6 months in should have a rich log. That means the system is working.

| Date | Mistake | Guard Added |
|------|---------|-------------|
| 2026-06-26 | Auth guard moved inside `if(user)` block, causing redirect loop on token refresh | G-01: `authHandled` flag must be set BEFORE the `if(user)` check |
| 2026-06-26 | Queries without `.where('userId')` silently denied by Firestore rules — hard to debug | G-02: Every entry collection query must include `.where('userId', '==', currentUserUid)` |
| 2026-06-26 | Deployed `userId` field-check rule without backfill, locking out access to old documents | G-03: Backfill every document before deploying a field-check rule |
| 2026-06-26 | `.orderBy()` with `.where()` required composite indexes that don't exist for custom journals | G-04: No `.orderBy()` in queries — sort client-side |
