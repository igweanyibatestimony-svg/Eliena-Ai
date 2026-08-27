# Eliena AI

Eliena is a personal AI assistant (PA) foundation. It is being built for future conversations, memory, tasks, reminders, scheduling, files, notifications, voice, and approved external integrations. It is not a ChatGPT clone.

## Current architecture

- Vanilla HTML, CSS, and JavaScript client
- Node.js and Express backend
- SQLite persistence via Node's built-in `node:sqlite` module
- Progressive Web App application shell
- Shared JavaScript contracts for future client/server boundaries

## Run locally

1. Install Node.js 22.5 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and adjust values if needed.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

The health endpoint is available at `GET /api/health`.

## Scripts

- `npm run dev` — start the server in watch mode.
- `npm start` — start the server.
- `npm test` — run the foundation tests.

## Environment

`PORT` controls the server port. `ELIENA_DB_PATH` is a project-relative or absolute path for the SQLite database. The default is `data/eliena.db`.

## Phase 2 scope

This phase provides the server, database migration foundation, PWA shell, health check, basic client/server connection test, shared contracts, and central error handling.

Intentionally not implemented yet: authentication, AI providers/chat, voice, memory behavior, tasks/reminders, search, notifications, external integrations, tools/actions, and the final Eliena interface.
