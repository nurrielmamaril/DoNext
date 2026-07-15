# DoNext

A simple task, reminder, and notes app for managing multiple clients — built for you, not a generic template.

## What's built so far (Phase 1)

- Email/password login
- Custom categories (create, rename, reorder, delete, upload a logo/photo) — one per client
- Tasks: quick-add, edit (title, category, priority, status, due date/time, description), complete/reopen, delete (with undo), duplicate, move between categories, file attachments
- Notes per category: multiple collapsible, color-tagged notes with file attachments, autosave
- Dashboard: overdue, due today, upcoming, high-priority/urgent
- Views: Dashboard, Deadlines (Today + Upcoming), Completed, Categories

Not built yet (later phases): reminders/notifications, subtasks, comments, recurring tasks, search, export/import, dark mode.

## Running it on your computer

1. Open a terminal in the `productivity-hub` folder.
2. Install dependencies (only needed once, or after pulling new changes):
   ```
   npm install
   ```
3. Start the app:
   ```
   npm run dev
   ```
4. Open your browser to **http://localhost:3000**

The app will redirect you to a login page. Sign up with any email and password (at least 8 characters). Supabase will email you a confirmation link — click it, then log back in.

## Environment setup (already done for you)

The app connects to a Supabase project for its database. Your connection details live in `.env.local` in this folder — that file is intentionally excluded from version control since it contains your project's keys. If you ever set this up on a new computer, copy `.env.local.example` to `.env.local` and fill in your Supabase project's URL and anon key (Supabase dashboard → Project Settings → Data API).

## Database

The database schema lives in `supabase/migrations/0001_init.sql`. If you ever need to recreate the database from scratch, paste that file's contents into the Supabase SQL Editor and run it.

## Notes on this setup

- The dev server is configured to use Webpack instead of Next.js's newer Turbopack bundler (`--webpack` flag, already baked into `npm run dev`) — Turbopack currently has a bug with folder paths that contain spaces (like "Claude Code"), so this avoids that.
