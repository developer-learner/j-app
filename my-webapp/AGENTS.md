See CLAUDE.md — this file is a content-equivalent entry point for OpenCode.

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
│   ├── index.html              — Main app (auth, CRUD, tabs, theme, markdown, export)
│   ├── login.html               — Auth UI (login, signup, password reset)
│   ├── styles/style.css         — All styles (~950 lines)
│   └── js/search_functionality.js — Search + date filter module
├── firestore.rules              — Firestore security rules
├── firebase.json                — Firebase project config
├── CLAUDE.md                    — This file (LLM context, loaded every session)
├── AGENTS.md                    — Content-equivalent to CLAUDE.md
├── BLUEPRINT.md                 — Master seed doc (system overview, roles, hard rules)
├── CONVENTIONS.md               — Code style & patterns
├── opencode.json                — OpenCode agent configuration
├── .env.example                 — Environment variable template
├── .gitignore                   — Git ignore rules
├── README.md                    — Human entry point
├── docs/                        — Architecture, decisions, product, testing
├── tasks/                       — Task tracking (CURRENT.md, BACKLOG.md)
└── .opencode/prompts/           — Agent role prompts
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

## Operating Rules
1. Read the current state from files, not from your own memory.
2. Before writing, verify the file exists and read it.
3. Report status via "Build Report" in `tasks/CURRENT.md` — never modify the Status field.
4. No agent writes outside its allowed paths.
5. When in doubt, ask the PM.
