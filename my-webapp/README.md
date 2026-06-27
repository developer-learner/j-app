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
- `@pm` — define tasks and verify output
- `@architect` — plan features
- `@build` — implement code
- `@test` — write tests

Invoke agents via the wrapper script to automatically run role-boundary checks:
```bash
bash scripts/agent.sh pm "Write a PRD for..."
bash scripts/agent.sh architect "Design the data model..."
bash scripts/agent.sh build "Implement the feature..."
bash scripts/agent.sh test "Write tests..."
```

The wrapper runs `opencode run --agent <role>` then immediately runs the INV-2 + INV-3 gate, preventing role-boundary violations before any files are committed.

See `BLUEPRINT.md` for details.
