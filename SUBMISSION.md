# Submission

## What's Included

| Item | Location | Status |
|---|---|---|
| Source code | `/server`, `/client` | Complete |
| README with setup instructions | `README.md` | Complete |
| Architecture note | `ARCHITECTURE.md` | Complete |
| AI workflow note | `AI_WORKFLOW.md` | Complete |
| Automated tests | `server/tests/documents.test.js` | Complete (5 tests) |
| Live deployment URL | See below | Complete |
| Walkthrough video | See below | Complete |

## Live URL

[[text](https://ajaia-docs-117i.onrender.com)]

## Test Credentials

Switch users using the dropdown in the top-left corner of the app.

| Name | Notes |
|---|---|
| Alice Chen | Owner — create docs and share them |
| Bob Martinez | Recipient — see docs shared with him |
| Charlie Park | Additional user for multi-share testing |

## Walkthrough Video

[https://www.loom.com/share/7c3879e92a2640babb5ace7dc8aa2d22]

---

## What Works

- Document creation, renaming, editing, and auto-save
- Rich text formatting: bold, italic, underline, H1/H2/H3, bullet lists, numbered lists, undo/redo
- File import: upload `.txt` or `.md` files to create a new document
- Sharing: grant access to another user; revoke access from the share modal
- Owned vs shared document distinction in the sidebar
- Persistence across page refreshes and server restarts

## What's Incomplete

- No real authentication (user selected via dropdown)
- No real-time collaborative editing (changes sync on next document open)
- No export functionality

## What I'd Build Next (2-4 More Hours)

1. Add Clerk or Supabase Auth for real login flows
2. Add WebSocket-based real-time sync so two users can edit simultaneously
3. Add document export to Markdown or PDF
4. Add version history: snapshot content on each save, allow rollback
