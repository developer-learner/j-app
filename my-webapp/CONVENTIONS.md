# Conventions

## General
- Vanilla JavaScript, no build step, no bundler
- All scripts loaded via `<script defer>` — order matters for Firebase SDK
- Globals shared between scripts via `window.*` exports

## Style
- Use `addEventListener` over `onclick` attribute
- Use `classList.toggle/replace/add/remove` for DOM class manipulation
- Use `innerHTML` for content rendering only with escaped/safe content (markdown output)
- Use `textContent` for user-supplied text to prevent XSS

## UI Patterns
- **Toast** over `alert()`: use `showToast(message, type)` — types: 'success', 'error', 'info'
- **Modal** over `confirm()`: use `showConfirmModal(message)` returns Promise<boolean>
- **Inline form** over `prompt()`: add a form element to the DOM, show/hide as needed

## Firebase
- compat SDK v10.14.1 — using `firebase.firestore()`, `firebase.auth()`
- `db.collection().add()/.doc().set()/.update()/.delete()/.get()` Firestore API
- Every query on entry collections includes `.where('userId', '==', currentUserUid)`
- No `.orderBy()` in Firestore queries — sort results client-side
- Timestamps stored as JavaScript `new Date()`, converted via `entry.timestamp.toDate()`

## Naming
- `getCollectionName(journalName)` — maps journal name to Firestore collection ID
  - `'primary'` → `'journalEntries'`
  - everything else → `'{name}JournalEntries'`
- `currentJournal` variable — tracks active journal tab
- `currentUserUid` — exported via `window.currentUserUid` for cross-module access
- Function naming: `loadEntries`, `refreshEntries`, `exportEntries`, `switchJournal`, `loadUserJournals`

## File Organization
- `public/index.html` — main app (inline `<script>` in DOMContentLoaded)
- `public/login.html` — auth flows (inline `<script>` in DOMContentLoaded)
- `public/js/search_functionality.js` — search + date filter (separate DOMContentLoaded)
- `public/styles/style.css` — all styles
- `docs/` — project documentation
- `tasks/` — task tracking
