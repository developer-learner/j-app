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
