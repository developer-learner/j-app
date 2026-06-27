# Architecture

## System Overview
Single-page web app served as static files from Firebase Hosting. Firebase Auth handles login/session. Firestore stores all data. All logic runs client-side in the browser.

```
Browser (index.html) ──► Firebase Auth (login, session)
                    ──► Firestore (CRUD, rules enforcement)
                    ──► Firebase Hosting (static files)
```

## Data Model — Firestore Collections

### `journalEntries`
| Field | Type | Notes |
|---|---|---|
| `text` | string | Entry content |
| `timestamp` | Timestamp | JS Date stored as Firestore Timestamp |
| `userId` | string | Owner's auth UID (backfilled) |
| `pinned` | boolean | Optional — pinned to top |

Primary journal. Each document is one entry.

### `workJournalEntries`
Same schema as `journalEntries`. Built-in "Work" journal.

### `{name}JournalEntries`
Same schema. One collection per custom journal. Collection naming: `getCollectionName(name)` maps `"primary"` → `"journalEntries"`, anything else → `"{name}JournalEntries"`.

### `userJournals`
| Field | Type | Notes |
|---|---|---|
| `name` | string | Journal display name |
| `userId` | string | Owner's auth UID |

One document per custom journal. Document ID is `{uid}_{name}` (new) or `{name}` (legacy). Used to discover journal tabs.

### `userPreferences`
| Field | Type | Notes |
|---|---|---|
| `theme` | string | `"light-theme"` or `"dark-theme"` |
| `tabOrder` | array[string] | Ordered list of journal tab names |

One document per user. Document ID matches auth UID.

## Security Rules

Three match blocks:

1. **`/userPreferences/{userId}`**: Owner-only read/write (`request.auth.uid == userId`)
2. **`/userJournals/{document}`**: Create requires `userId` match. Read/update/delete requires auth only.
3. **`/journalEntries/{entryId}`**: Create requires `userId` match. Read/update/delete requires matching `userId`.
4. **`/{collection}/{document}`**: Matches custom journals via `collection.matches('.*JournalEntries')`. Same field checks as journalEntries.

**Key constraint**: Every query on entry collections must include `.where('userId', '==', currentUserUid)` or Firestore denies it.

## Auth Flow

1. `onAuthStateChanged` fires on page load
2. `authHandled` flag is set BEFORE `if(user)` check (prevents null re-fires from redirecting)
3. On login: load user journals → restore tab order → load theme → switch to Primary tab
4. On logout: redirect to `login.html`
5. `login.html`: sign in with email/password, sign up, password reset (all via Firebase Auth)

## Component Tree
```
container
├── header-row (title + toolbar with user-info + menu)
├── stats-bar (total entries, streak count)
├── tabs-container (journal tabs — draggable, reorderable)
├── new-journal-form (inline input)
├── search-row (search bar + date filter)
├── entry-container (textarea + save button)
├── char-counter
├── entries-section (entry list with date banners)
└── toast-container + modal-overlay (notifications)
```

## Key Flows

### Save Entry
1. User types text, clicks save button
2. Double-click guard prevents duplicate saves (`spinning` class check)
3. Entry written to `{collectionName}` with `{ text, timestamp, userId }`
4. On success: clear textarea, reload entries
5. On error: restore textarea value, show error toast

### Load Entries
1. Query `{collectionName}` with `.where('userId', '==', uid)`
2. Fetch all matching documents
3. Sort client-side by pinned status then timestamp descending
4. Render date banners + entry cards with edit/delete/pin buttons
5. Calculate streak from unique entry dates

### Search
1. Input triggers debounced (300ms) search query
2. Same Firestore query as loadEntries but filtered client-side by text + date
3. Results rendered with same format (including edit/delete/pin from global exports)

## Known Constraints
- No `orderBy` in queries — sorting is client-side
- Edit/delete buttons hidden after 60 minutes (`timeDifference <= 60`)
- No offline support beyond browser cache
- No pagination — all entries loaded at once (current: ~170 entries, fine at this scale)

---

## Documentation Improvement Plan

This section specifies the exact additions needed to close gaps found by the PM audit, referencing the corresponding content in the template at `sw-dev-blueprint`.

### Target: `CLAUDE.md` (owned by Build)

Add three sections after the existing "Operating Rules" block:

#### 1. LLM Correction Log (template: `sw-dev-blueprint/CLAUDE.md` lines 179–194)

Insert a heading `## LLM Correction Log` with a preamble paragraph: *"When the LLM makes a mistake and you correct it, log it here. This is the most valuable section — it prevents repeat mistakes. A project 6 months in should have a rich log."* Follow with a 3-column table (`| Date | Mistake | Guard Added |`) and the single seed row from the PM audit: the `authHandled` guard (D-01) and the `userId` query filter (G-02) as entries. Content adapted to j-app's actual stack — not a copy of the template's placeholder rows.

#### 2. Reporting section (template: `sw-dev-blueprint/CLAUDE.md` lines 130–145)

Insert a heading `## Reporting` with instructions:
- Read `docs/.pm-last-review` to get the last reviewed ref (`cat docs/.pm-last-review 2>/dev/null || git rev-list --max-parents=0 HEAD`)
- Derive commit list from `git log "$LAST"..HEAD --oneline`
- State scope explicitly: "N new commits since reviewed ref `$LAST`"
- Never write or advance `docs/.pm-last-review` (PM-owned)
- If file is missing, fallback to initial commit

#### 3. Replace the current 5 Operating Rules with the template's 7 Rules (template: `sw-dev-blueprint/CLAUDE.md` lines 148–166)

Current lines 61–65 have 5 rules. Replace them with the template's 7 (adapted for j-app context):
1. **Report against the tree, never memory** — derive commit list from `git log`
2. **One commit, one concern** — constraint changes get isolated commits
3. **A change to what a rule does is stop-and-ask** — improving *how* is fine, changing *what* is not
4. **Conditionals are checkpoints** — "only if Y fails" means report whether Y failed
5. **Read the artifact, not the summary** — source wins over agent reports
6. **"Detected" ≠ "enforced"** — separate standalone-test from live-run claims
7. **Decide trivial calls; escalate only contested principles** — don't re-ask for low-stakes choices

Add the preamble: *"A rule that cannot be enforced mechanically is a suggestion, not a rule. Document the enforcement mechanism alongside every rule — and where there is none, say so explicitly."*

### Target: `BLUEPRINT.md` (owned by Build)

Add five sections. Placement: after the "Phase-Gate Note" section and before "Anti-Patterns".

#### 1. Component Inventory (template: `sw-dev-blueprint/BLUEPRINT.md` lines 43–61)

Insert `## Component Inventory` with a table of every tool/object in the j-app system and its role:
| Object | Role |
|--------|------|
| **git** | Version control + undo button. Every edit is committable; any mistake is `git reset` away. |
| **GitHub** | Remote backup, collaboration. |
| **Firebase** | Auth, Firestore DB, Hosting — the only backend dependency. |
| **OpenCode** | Coding agent. Reads CLAUDE.md/AGENTS.md + CONVENTIONS.md. |
| **Firebase CLI** | Deployment. Runs `firebase deploy`. |
| **The docs** | Memory layer for stateless LLMs (BLUEPRINT.md + CLAUDE.md + CONVENTIONS.md + docs/ + tasks/). |
| **AGENTS.md** | Symlink to CLAUDE.md. OpenCode entry point. |
| **Four agents** (PM/Architect/Build/Test) | Role pipeline defined in opencode.json. |

Adapted from template — Firebase replaces LM Studio/venv/pytest etc.; the j-app stack has no build step, no Python, no local LLM.

#### 2. The System in One Diagram (template: `sw-dev-blueprint/BLUEPRINT.md` lines 223–240)

Insert `## The System in One Diagram` with a flow diagram adapted to j-app's non-autonomous pipeline (no orchestrate.sh, no phase-gate.sh):

```
Human casual instruction
      │
      ▼  (PM translates — lossy, the only human-checked step)
PRD + acceptance criteria  [tasks/CURRENT.md, committed]
      │  ← HUMAN APPROVAL GATE (Status: Approved)
      ▼
Architect → eng plan (ARCHITECTURE.md / DECISIONS.md)
      │
      ▼
Build (public/ + root configs) ──► Manual review / PM verification
                                          │
                              pass → done   fail → route up to PM → human
```

#### 3. Cost Model (template: `sw-dev-blueprint/BLUEPRINT.md` lines 359–367)

Insert `## Cost Model` with a table adapted to j-app's current setup:

| Role | Model tier | Why |
|------|-----------|-----|
| Build, Test | Frontier (current model) | j-app uses a single model for all agents per D-06. No LM Studio. |
| PM, Architect | Frontier (same model) | Same reason — single-model setup. |

Rule: if a future setup uses local + frontier, document the tier split here. For now, all agents share the same model.

#### 4. Maintenance Contract (template: `sw-dev-blueprint/BLUEPRINT.md` lines 378–391)

Insert `## The Maintenance Contract` with trigger/action table:

| Trigger | Action | File |
|---------|--------|------|
| Non-obvious decision made | Log it with reasoning | `DECISIONS.md` |
| LLM made a mistake you corrected | Add guard | `CLAUDE.md` correction log |
| Task completed | Move to completed table | `BACKLOG.md` |
| Schema changed | Update data models | `ARCHITECTURE.md` |

Adapt preamble: emphasize the correction log as the most important habit.

#### 5. Files the LLM Should Never Touch (template: `sw-dev-blueprint/BLUEPRINT.md` lines 439–444)

Insert `## Files the LLM Should Never Touch Without Explicit Instruction` with the adapted list:

- `DECISIONS.md` — human/Architect-authored record; do not edit without explicit instruction
- `CLAUDE.md` correction log — human-maintained; rows added per the rule, not by the LLM
- `tasks/BACKLOG.md` completed section — historical record; entries move here from CURRENT.md, not edited
- `docs/.pm-last-review` — PM-owned review marker; no agent writes this

### Target: `docs/PM-ROLE.md` (owned by PM)

#### Front-load richer role description (template: `sw-dev-blueprint/docs/PM-ROLE.md` lines 5–9, 37–41, 43–45)

Replace the current opening with:
- **"What you are"** section — adapted from template: "You are the single point of contact between the human and the agent pipeline. You translate, drive, and verify. You are not a coder and not the decision-maker on product strategy."
- **"Why this role exists"** section — adapted from template lines 37–41: explain that agents cannot be trusted to verify their own work, the PM source-side check is the actual enforcement layer.
- **"Note on the two PMs"** section — adapted from template lines 43–45: distinguish the CEO-facing oversight PM (this document) from the in-pipeline PM agent in `.opencode/prompts/pm.md`.
- Keep the existing "Three Duties" and "Operating Disciplines" sections but expand the disciplines using template lines 22–28 (verify at source, reports scoped to tree, own the review marker, flag misbehavior, bring clean decisions, honor Operating Rules).

### Target: `docs/.pm-last-review` (owned by PM)

Create this file with the initial commit hash that was current at the time of the audit. Content: a single line with the commit SHA, nothing else. This file is PM-write-only — no agent may advance it.

### Target: No action items from this plan

- `.github/workflows/` — deferred (do not create)
- `scripts/` — deferred (do not create)
