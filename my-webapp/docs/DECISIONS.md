# Architectural Decisions

## D-01: authHandled before if(user) (2026-06-26)
**Context**: During refactoring, `authHandled` was moved inside the `if(user)` block. This caused null re-fires on auth token refresh to redirect to login, since `authHandled` was only set when user was truthy.
**Decision**: `authHandled` must be set BEFORE the `if(user)` check.
**Alternatives considered**: Using `initialized` flag instead of `authHandled`; removing the guard entirely.
**Do not suggest**: Moving the flag inside the conditional.

## D-02: Flat collections over path-scoped (2026-06-26)
**Context**: Firestore rules required `resource.data.userId == request.auth.uid` for reads. Path-scoped collections (`userEntries/{uid}/entries/{id}`) would avoid field checks entirely.
**Decision**: Keep flat collections (`journalEntries`, `{name}JournalEntries`) with a `userId` field. Avoids full collection restructuring.
**Trade-off**: Requires `.where('userId', ...)` on every query. Rules are slightly less clean. But no migration to new path structure.
**Do not suggest**: Restructuring to subcollections unless adding a feature that fundamentally requires it.

## D-03: Backfill before field-check rule (2026-06-26)
**Context**: Deploying the `userId` field check rule without backfilling existing documents caused all old entries to become inaccessible.
**Decision**: Any new rule that checks a document field must be preceded by a backfill of that field on every existing document.
**Do not suggest**: Deploying field-check rules without verified backfill.

## D-04: Explicit .where('userId') on all queries (2026-06-26)
**Context**: Firestore rules that check a document field require the query to also filter on that field. Without `.where('userId', ...)`, Firestore denies the query because it can't prove all results satisfy the rule.
**Decision**: Every entry collection query includes `.where('userId', '==', currentUserUid)`.
**Do not suggest**: Relying on the fact that "all documents happen to have the right userId" — Firestore doesn't trust that at query time.

## D-05: Client-side sort over Firestore orderBy (2026-06-26)
**Context**: Using `.where('userId', ...)` + `.orderBy('timestamp', 'desc')` requires a composite index. Custom journal collections make pre-defining indexes impractical.
**Decision**: Remove `.orderBy()` from all queries. Sort results in JavaScript. The app already sorts for pinned entries — extends the same pattern.
**Trade-off**: Slightly more bandwidth (all documents fetched, filtered and sorted in JS). Fine for sub-10K document scale.
**Do not suggest**: Adding `.orderBy()` back without a mechanism to create composite indexes for custom collections.

## D-06: Single model for all agents (2026-06-26)
**Context**: Blueprint recommends local 35B model for build/test agents to enforce role separation via capability difference.
**Decision**: All 4 agents use the same frontier model. LM Studio is not set up. Role separation enforced by `opencode.json` path restrictions and handoff protocol.
**Trade-off**: A capable build agent might "helpfully" write tests. Path restrictions mitigate but do not eliminate this risk.
**Do not suggest**: Requiring LM Studio setup as a prerequisite for development.

## D-07: Backward-compatible rules pattern (2026-06-26)
**Context**: Two separate deployments of stricter rules broke access to existing data.
**Decision**: Use `!resource.data.keys().hasAny(['userId']) || resource.data.userId == request.auth.uid` to allow access for docs without the field while enforcing ownership for docs that have it.
**Trade-off**: Slightly more complex rule. But eliminates the class of breakage where a new rule kills access to old data.
**Do not suggest**: Removing the backward-compatible fallback until all existing docs are verified to have the field.

## D-08: Adopt template LLM Correction Log in CLAUDE.md (2026-06-26)
**Documentation-only:**
**Context**: Template includes a correction log section described as "the most valuable section." j-app CLAUDE.md lacks it, meaning repeat mistakes are likely across sessions.
**Decision**: Adopt the section with j-app-appropriate seed entries. The template's placeholder rows are replaced with j-app's actual guardrails (G-01 through G-04). The table format and preamble are kept.
**Do not suggest**: Omitting the correction log — this is a zero-cost high-value addition that prevents repeat LLM mistakes.

## D-09: Adopt template's 7 Operating Rules, replacing the current 5 (2026-06-26)
**Documentation-only:**
**Context**: Template has 7 operating rules derived from real failures. Current j-app CLAUDE.md has 5 rules that overlap partially but miss key rules: "one commit one concern," "conditionals are checkpoints," "'detected' ≠ 'enforced'," and "decide trivial calls."
**Decision**: Adopt the full 7 rules. The current 5 rules are a subset; replacing them wholesale ensures no gap. Adapt language to j-app context (no phase-gate.sh, no pytest — reference PM manual verification instead).
**Do not suggest**: Keeping the current 5 and appending — the template's 7 are more complete and better-phrased.

## D-10: Adopt template Reporting section in CLAUDE.md (2026-06-26)
**Documentation-only:**
**Context**: Template includes a git-log-based reporting protocol to ground status reports in the commit tree. Current j-app CLAUDE.md has no reporting section.
**Decision**: Adopt verbatim from template, adapted for j-app (no orchestrate.sh, no pytest — reporting is PM-side). The `docs/.pm-last-review` tracking pattern is retained.
**Do not suggest**: Omitting this — without it, agents report from memory, which the template explicitly warns against.

## D-11: Adopt template BLUEPRINT.md sections with j-app adaptation (2026-06-26)
**Documentation-only:**
**Context**: Template BLUEPRINT.md has 5 sections absent from j-app's BLUEPRINT.md: Component Inventory, System Diagram, Cost Model, Maintenance Contract, Files Never to Touch. These provide operational reference for LLM sessions.
**Decision**: Adopt all 5, each adapted for j-app's actual stack:
- Component Inventory: replace Python/venv/LM Studio references with Firebase, Firebase CLI, vanilla JS
- System Diagram: remove phase-gate.sh/orchestrate.sh — j-app's pipeline is PM-driven, not automated
- Cost Model: reflect D-06 (single model for all agents) not the template's local+frontier split
- Maintenance Contract: retain template structure verbatim (it's stack-agnostic)
- Files Never to Touch: add `docs/.pm-last-review` to the template's existing list
**Do not suggest**: Skipping any of these — they are low-effort, high-value memory layer additions.

## D-12: Create docs/.pm-last-review for verification tracking (2026-06-26)
**Documentation-only:**
**Context**: Template requires a `docs/.pm-last-review` file as the source-of-truth review marker. PM-ROLE.md already references it but the file doesn't exist.
**Decision**: Create `docs/.pm-last-review` with the current HEAD commit SHA. PM owns advancing it; no agent writes to it.
**Do not suggest**: Using an alternative tracking mechanism — the template's pattern is simple and proven.

## D-14: agent.sh wrapper for preventive INV-2 enforcement (2026-06-26)

**Context**: `scripts/phase-gate.sh` existed with full INV-2 + INV-3 checks for all four roles. But the gate was purely manual — it only fired when someone remembered to run it before committing. This meant agents could cross role boundaries during a session, and the gate would only catch the violation after the fact (detective, not preventive). A pre-commit hook would also be detective — it fires at commit time, after the violation is already in the tree.

**Decision**: Create `scripts/agent.sh` — a 23-line shell wrapper that runs `opencode run --agent <role>` then immediately runs `bash scripts/phase-gate.sh <role>`. This makes the gate fire per-phase, before git ever sees the files. If the architect edits `public/`, the gate catches it immediately and exits non-zero, blocking the handoff.

**Alternatives considered**:
- **Pre-commit hook**: Detective only — catches violations at commit time, after the code is already staged. No earlier than the wrapper, and harder to bypass (hooks run automatically), but the wrapper is simpler and fires at the same logical point (before handoff, not before commit).
- **Bare `opencode run`**: No enforcement at all — relies entirely on agent prompts and permissions, which are non-transitive and bypassable.
- **Full orchestrator** (`scripts/orchestrate.sh`): Would provide automated pipeline execution with sandboxing, but requires infrastructure j-app doesn't have (pytest, podman, headless server). Over-engineering for a journal app.

**Trade-off**: Still requires manual invocation (the human types `bash scripts/agent.sh architect "..."` instead of `opencode run --agent architect "..."`). But the gate fires every time, making it preventive rather than detective. The cost is one extra level of indirection and a 23-line script to maintain.

**Do not suggest**: Removing the wrapper in favor of bare `opencode run` — that eliminates the only preventive INV-2 check j-app has.

## D-13: Defer .github/workflows/ and scripts/ (2026-06-26, updated 2026-06-26)

**Documentation-only:**
**Context**: Template includes CI workflows and automation scripts. j-app currently has none.
**Decision**: Defer `.github/workflows/`. `scripts/` is partially un-deferred — `scripts/phase-gate.sh` exists for manual INV-2 + INV-3 checks (`bash scripts/phase-gate.sh <role>`). No orchestrator or automation around it. INV-2 enforcement was added after architect was observed editing `public/` files during a build phase — the gap D-13 originally recorded.
**Do not suggest**: Creating CI workflow placeholders — defer means defer.
