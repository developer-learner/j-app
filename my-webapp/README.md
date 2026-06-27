# Journal App

A personal journal web app evolving into a journal + todo-manager. Hosted on Firebase — no backend server, vanilla JavaScript.

## Tech Stack
- **Frontend**: Vanilla JS, HTML5, CSS3
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **SDK**: Firebase compat v10.14.1
- **Deploy**: Firebase CLI (`firebase deploy`)

## Quick Start
```bash
firebase deploy
```

## Project Layout
```
my-webapp/
├── public/          — App code (index.html, login.html, styles/, js/)
├── docs/            — Architecture, decisions, product context
├── tasks/           — Active task + backlog
├── firestore.rules  — Security rules
├── CLAUDE.md        — LLM context (auto-loaded by OpenCode)
└── BLUEPRINT.md     — Master seed document
```

## Working with Agents
This project uses OpenCode with 4 agent roles:
- `@1-pm` — define tasks and verify output
- `@2-architect` — plan features
- `@3-build` — implement code
- `@4-test` — write tests

See `BLUEPRINT.md` for details.
