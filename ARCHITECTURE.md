# Architecture Note

## Overview

Single-server architecture: one Express process serves both the REST API and the compiled React frontend as static files. This keeps deployment simple — one service, one URL, no CORS configuration in production.

## Key Decisions

### SQLite over Postgres
SQLite requires zero setup, runs in-process, and persists to a single file. For a demo-scale app with no concurrent write pressure, it's the right call. Switching to Postgres later is a one-line change in the db module.

### TipTap for the editor
TipTap is built on ProseMirror and gives production-grade rich text out of the box (bold, italic, underline, headings, lists, undo/redo). Writing a custom editor would have consumed most of the time budget for no meaningful gain.

### Auto-save over manual save
Content saves 800ms after the user stops typing. This matches the behavior users expect from modern document tools and removes the cognitive overhead of a save button. The save status indicator ("Saving…" / "Saved") keeps the user informed without being intrusive.

### Seeded users instead of auth
Real authentication (JWT, sessions, OAuth) would have consumed 2+ hours. The user selector dropdown lets reviewers test the full sharing flow in seconds. The database schema treats users as first-class entities, so adding real auth is additive, not structural.

### File upload to document import
Uploaded `.txt` and `.md` files get parsed server-side and written into the document store as a new document. The client never receives a raw file — it receives a title and HTML-ready content string.

## What I'd Add With More Time

1. Real auth (Clerk or Supabase Auth) — drop-in, fast
2. Real-time sync via WebSockets or Liveblocks
3. Document version history stored as JSON snapshots
4. Export to Markdown or PDF
5. Role-based sharing (viewer vs editor)

## File Structure

```
ajaia-docs/
├── server/
│   ├── index.js          # Express entry point
│   ├── db.js             # SQLite setup + seeding
│   ├── routes/
│   │   ├── documents.js  # CRUD + sharing endpoints
│   │   ├── users.js      # User list endpoint
│   │   └── upload.js     # File upload + parsing
│   └── tests/
│       └── documents.test.js
├── client/
│   ├── src/
│   │   ├── App.jsx               # State management + data fetching
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Doc list + user switcher
│   │   │   ├── Editor.jsx        # TipTap editor + toolbar
│   │   │   ├── ShareModal.jsx    # Share + revoke UI
│   │   │   └── UploadModal.jsx   # File import UI
│   │   └── index.css
│   └── vite.config.js            # Dev proxy to Express
├── README.md
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
└── SUBMISSION.md
```

## Database Schema

```sql
users (id, name, email)
documents (id, title, content, owner_id, created_at, updated_at)
document_shares (id, document_id, shared_with_id, shared_by_id, created_at)
```

Cascade deletes on `document_shares` when a document is removed keep the database consistent without manual cleanup.
