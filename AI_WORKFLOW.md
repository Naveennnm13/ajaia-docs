# AI Workflow Note

## Tools Used

- **Claude (Anthropic)** — primary coding assistant for architecture design, component scaffolding, and backend logic
- **Claude** — used to generate first drafts of documentation (README, ARCHITECTURE.md, this note)

---

## Where AI Materially Sped Up the Work

**1. Scaffolding the full-stack structure**
Rather than manually setting up Express, Vite, and SQLite from scratch, I prompted Claude to generate the full project skeleton — routes, database schema, and React component structure — in one pass. This saved roughly 45-60 minutes of boilerplate work.

**2. TipTap integration**
TipTap's documentation is thorough but dense. I prompted Claude to generate a working editor component with the specific extensions I needed (StarterKit + Underline) and a functional toolbar. I then reviewed the output, tested it, and adjusted the save behavior to use debounced auto-save instead of the initial manual-save approach.

**3. SQLite schema and route logic**
Claude generated the database schema and Express route handlers. I reviewed each route for correctness — particularly the access control logic (owner vs shared user) and the cascade delete behavior — and caught one issue where the DELETE route was checking `req.query` instead of `req.body` for the userId.

**4. CSS layout**
I described the two-panel layout (dark sidebar + white editor), and Claude generated the CSS framework. I adjusted spacing, font choices, and the toolbar active state styling.

---

## What I Changed or Rejected

- **Auto-save timing**: Claude's initial output used a 2-second debounce. I changed it to 800ms to feel more responsive.
- **Auth approach**: Claude suggested implementing JWT-based auth. I rejected this — the time cost wasn't worth it for a demo environment and would have reduced time on core features.
- **Error handling in the upload route**: The initial multer error handler wasn't catching file type rejections correctly. I rewrote the error middleware to handle both MulterError instances and custom message errors.
- **Editor content sync**: The first version of the Editor component re-set content on every `doc` prop change, which caused the cursor to jump while typing. I scoped the `useEffect` to only fire on `doc.id` changes.

---

## How I Verified Correctness

- Ran the server locally and tested every API endpoint manually (create, update, share, revoke, delete)
- Switched between all three seeded users to verify that sharing and access control worked as expected
- Uploaded both a `.txt` and a `.md` file to confirm import behavior
- Reviewed the automated test output to confirm all five test cases passed
- Refreshed the browser mid-edit to verify documents survived a full page reload

---

## What AI Did Not Do

- Debug the cursor-jump bug in the editor (identified and fixed manually)
- Make the final call on scope cuts (real auth, real-time sync, export)
- Write the test cases (written by hand to ensure meaningful coverage)
- Choose the color palette or font (deliberately chosen to match a professional productivity tool aesthetic)

---

The overall workflow was: describe the component or problem, review the AI output critically, test it in the running app, and fix what broke. AI handled the scaffolding; I handled the judgment.
