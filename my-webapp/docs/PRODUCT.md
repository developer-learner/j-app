# Product Context

## Problem Statement
A personal journal that grows into a structured task manager. The user wants to capture free-form thoughts and gradually layer on todo management, priority tracking, and eventual AI-assisted workflow routing.

## Target Users
| User | Context |
|---|---|
| You (primary) | Solo user, web-first, managing daily journaling + tasks |

## Core Value Proposition
One app for capturing thoughts and managing tasks. Start with free-form journaling, add structure as needed. No separate tools for notes vs todos.

## What We Are Not Building
- Multi-user / collaboration
- Mobile-native app (responsive web is sufficient)
- Real-time sync (Firestore updates on save)
- Third-party integrations (export to plain text exists)

## Future Data Requirements
Foundational schemas must support:
- **AI agent parsing**: Entries and tasks must be parseable by automated agents — structured fields (status, priority, due date, tags) and machine-readable timestamps
- **Memory inbox routing**: Future inbound entries may need automatic classification and routing (e.g., "this is a task, not a note") — schemas should store classification metadata
- **Vector search readiness**: Text fields should be sized and formatted for eventual embedding and similarity search

## Success Metrics
- Daily journal entries maintained
- Todo-manager features adopted (todos coexist with journal entries)
- Zero regressions on deploys

## Feature Flags / Rollout Notes
- Journal CRUD, tabs, search, markdown, pin, export, theme — all shipped
- Todo features — in backlog
- AI agent integration — future
