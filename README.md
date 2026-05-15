# Ajaia Docs

A lightweight collaborative document editor with rich text editing, file import, and document sharing.

## Live Demo

[Deployed on Render — link added after deployment]

**Test accounts (pre-seeded):**
| Name | Email |
|---|---|
| Alice Chen | alice@ajaia.ai |
| Bob Martinez | bob@ajaia.ai |
| Charlie Park | charlie@ajaia.ai |

Use the user selector in the top-left to switch between accounts and test sharing.

---

## Local Setup

### Requirements
- Node.js 18+
- npm 9+

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd ajaia-docs

# 2. Install server dependencies
npm install

# 3. Install and build the client
npm run build

# 4. Start the server
npm start
```

Open http://localhost:3001 in your browser.

### Local Development (with hot reload)

Run two terminals:

**Terminal 1 — Server:**
```bash
npm start
```

**Terminal 2 — Client:**
```bash
cd client
npm install
npm run dev
```

Client runs on http://localhost:5173 (proxied to server on 3001).

---

## Running Tests

```bash
npm test
```

Tests run using Node's built-in test runner. No external test framework required.

---

## Features

- **Document creation and editing** — Create, rename, and edit documents with auto-save
- **Rich text formatting** — Bold, italic, underline, H1/H2/H3, bullet lists, numbered lists
- **File import** — Upload `.txt` or `.md` files to create a new document
- **Sharing** — Share documents with other users; revoke access at any time
- **Persistence** — SQLite database; documents survive server restarts
- **User switching** — Three pre-seeded users to demonstrate sharing flows

## What's Not Included

- Real authentication (users are selected via dropdown for demo purposes)
- Real-time collaborative editing (changes sync on next open)
- Export to PDF or Markdown
- Document version history

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TipTap |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| File upload | Multer |
| Deployment | Render |
