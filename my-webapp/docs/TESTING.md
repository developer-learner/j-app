# Testing

## Current State
No automated tests. All verification is manual via browser.

## Manual Verification Checklist
Run these steps on every deploy:

1. **Login**: Visit the app. Redirected to `login.html`. Log in with email/password.
2. **Console check**: Open DevTools console. No Firestore permission errors. No auth errors.
3. **Load entries**: Primary tab loads all entries. Scroll through. Verify date banners display correctly.
4. **Save entry**: Type text, click save. Entry appears at top. Character counter resets.
5. **Edit entry**: Click pencil icon on a recent entry (< 60 min old). Edit text, save. Verify update.
6. **Delete entry**: Click trash icon. Confirm modal. Entry disappears.
7. **Pin/unpin**: Click pin button. Entry moves to top or restores to chronological position.
8. **Search**: Type search term. Results filter. Clear search. All entries return.
9. **Date filter**: Select a date. Only entries for that date show. Clear date. All entries return.
10. **Switch tabs**: Click Work tab. Work entries load. Click another custom tab. Its entries load.
11. **Create journal**: Click +, enter name, click Create. New tab appears. Switch to it. Entries list is empty.
12. **Delete journal**: Click trash on custom journal. Confirm. Tab is removed. Switch to Primary.
13. **Toggle theme**: Switch dark/light mode. Theme persists on reload.
14. **Export**: Click export. Plain text file downloads with entries in order.
15. **Drag reorder**: Drag journal tab. Position persists on reload.
16. **Logout**: Click logout. Redirected to login.html.

## Future State (Phase 3+)
- **Playwright**: Automated browser tests running against Firebase Emulator
- **CI**: GitHub Actions runs Playwright on every push
- **Coverage target**: All CRUD paths covered (login, save, load, edit, delete, search, export)

## Running Tests (Future)
```bash
firebase emulators:exec "npx playwright test"
```

## What We Don't Test
- Visual layout / CSS (covered by manual check)
- Third-party libraries (Firebase SDK)
- Extreme scale (app is single-user, <10K entries expected)
