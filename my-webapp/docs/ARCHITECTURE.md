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
