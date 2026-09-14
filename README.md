# Eliena AI

Eliena is a JavaScript personal AI assistant foundation. It is designed as an assistant product—not a chatbot clone—with a mobile-first interface, persistent conversations, and room for future personal-assistant capabilities.

## Current, verified scope

- A vanilla HTML/CSS/JavaScript frontend served by a Node.js/Express backend.
- SQLite-backed, persistent conversations and messages.
- Persistent long-term memories with controlled extraction, relevant retrieval, and user deletion.
- Streaming chat through either Gemini or a selected OpenAI-compatible `/chat/completions` provider.
- Eliena system identity enforced in the server-side provider layer. Eliena identifies herself as Eliena; the selected model/provider is not exposed in normal chat events.
- Responsive UI shell with Home, Chat, Tasks, Calendar, Memory, Files, and Settings surfaces.
- PWA application shell, manifest, service worker, desktop rail, mobile navigation, Eliena orb states, voice UI groundwork, and reduced-motion support.

The active, verified backend capabilities are conversation chat and memory. Other non-chat assistant surfaces are intentionally visual placeholders or mock data.

## Architecture

```text
client/              Vanilla frontend, PWA manifest, and service worker
server/              Express app, routes, services, database, configuration
server/services/ai/  Provider selection, streaming adapters, Eliena identity policy
shared/              Lightweight future-facing constants and contract descriptors
tests/               Node built-in test runner tests
data/                Local SQLite database (created at runtime; gitignored)
```

The application uses ESM JavaScript. It does not use React or TypeScript.

## Requirements and setup

Node.js 22.5 or newer is required because SQLite uses Node's built-in `node:sqlite` module.

```sh
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`. Use `npm start` for a non-watch server and `npm test` to run the test suite.

## Configuration

Copy `.env.example` to `.env`. `.env` is gitignored; never commit API keys.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port. Invalid values fall back to `3000`. |
| `NODE_ENV` | `development` | Enables production-safe 500 error messages when set to `production`. |
| `ELIENA_DB_PATH` | `data/eliena.db` | SQLite location, relative to the project root or absolute. |
| `AI_PROVIDER` | `gemini` | Selected provider: `gemini` or `openai`. This is selection, not automatic fallback. |
| `GEMINI_API_KEY` | empty | Required when `AI_PROVIDER=gemini`; remains server-side. |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model identifier. |
| `OPENAI_API_KEY` | empty | Required when `AI_PROVIDER=openai`; used with an OpenAI-compatible API. |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Base URL for the OpenAI-compatible chat-completions endpoint. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model identifier for the selected OpenAI-compatible API. |
| `AI_TIMEOUT_MS` | `90000` | Positive timeout in milliseconds for one streamed AI response. |

## API

| Method | Route | Behavior |
| --- | --- | --- |
| `GET` | `/api/health` | Returns service health. |
| `GET` | `/api/conversations` | Lists conversations for the current local default user. |
| `POST` | `/api/conversations` | Creates an empty conversation; accepts optional `title`. |
| `GET` | `/api/conversations/:id/messages` | Returns ordered persisted messages. |
| `POST` | `/api/chat` | Creates or resumes a conversation and returns `text/event-stream`. |
| `GET` | `/api/memories` | Lists active long-term memories for the current local user. |
| `POST` | `/api/memories` | Creates a memory or updates an exact duplicate. |
| `GET` | `/api/memories/:id` | Returns one active memory. |
| `PATCH` | `/api/memories/:id` | Updates memory content, category, importance, or confidence. |
| `DELETE` | `/api/memories/:id` | Soft-deletes a memory. |

`POST /api/chat` accepts `{ "message": "...", "conversationId": 123 }`; omit `conversationId` to create a conversation. It emits `conversation`, `assistant.thinking`, `assistant.responding`, and either `done` or `error` events. The provider/model name is not sent to the browser.

For this pre-authentication phase, routes use a single local default user. This is intentional foundation behavior, not multi-user authentication.

## Conversation and AI behavior

For every chat request the server:

1. Validates the message and creates or validates the conversation.
2. Persists the user message and retrieves the ordered conversation history.
3. Adds the server-owned Eliena system instruction at the AI-provider boundary.
4. Streams provider text over SSE.
5. Persists a completed assistant message and sends the final event.

If a provider fails after accepting a message, the user message remains persisted. The UI retains it as well, so the displayed and stored conversation do not silently diverge. A response is not fabricated or persisted on failure.

Gemini uses its streaming content API. The `openai` option uses a compatible streaming `/chat/completions` API; it is an alternative configuration, not a runtime fallback if Gemini fails.

## Memory behavior

After a successful assistant response, Eliena extracts only explicit, durable user facts and preferences from that user message, such as a name, location, occupation, favorite, or stated preference. Ordinary questions and messages containing temporary time references are not stored. Stable extraction keys update information such as a changed name instead of creating duplicates.

Before each provider request, Eliena selects up to five active memories with meaningful lexical overlap with the current message. They are supplied as separate contextual system content, never as instructions, and only when relevant. The Memory screen lists active memories and supports deletion; the API also supports creation and updates.

## Database

SQLite initialization enables foreign keys and WAL mode, then applies tracked migrations from `server/db/migrations`. The memory migration adds an active/deleted state, stable deduplication key, importance, confidence, and retrieval indexes. Forward-looking tables for tasks, reminders, files, and integrations do not mean those product features are implemented.

## Tests and verification

Run:

```sh
npm test
```

The suite uses isolated temporary SQLite databases and mocked provider HTTP streams. It verifies health, conversation creation/listing/history, chat validation, SSE streaming, successful message persistence, continuation history, provider failure persistence, provider selection, Gemini/OpenAI-compatible request construction, malformed provider chunks, Eliena system identity injection, escaped persisted chat rendering, memory CRUD/deletion, deduplication, controlled extraction, relevant retrieval, and provider-context injection.

Tests deliberately do not call a live external provider or use configured API keys. A live provider requires valid credentials and network access, so it remains an operational verification step rather than a deterministic automated test.

## Phase status

### Phase 1 — Research / architecture

The current code establishes the intended assistant architecture: frontend/backend separation, a provider boundary, SQLite persistence, streaming conversation flow, future-facing service contracts, and a mobile-first PWA direction. Future capabilities are represented as scope and schema scaffolding only.

### Phase 2 — Foundation

Implemented and tested: Node/Express ESM server, environment configuration, SQLite migration foundation, error handling, health API, static frontend serving, PWA base, scripts, and test infrastructure.

### Phase 3 — UI / UX shell

Implemented: the responsive Eliena visual shell, navigation, orb states, chat surface, voice modal groundwork, reduced-motion handling, and explicit mock-data boundaries. Tasks, calendar, files, settings, attachments, and voice are not live services; Memory became live in Phase 5.

### Phase 4 — AI / conversation integration

Implemented and mock-verified: provider selection/configuration, server-side Eliena identity policy, streaming SSE chat, conversation creation/resumption, ordered history retrieval, user/assistant persistence, and frontend chat integration. Live-provider behavior is not claimed as verified by this repository's test suite.

### Phase 5 — Memory system

Implemented and mock-verified: SQLite-backed memory CRUD, soft deletion, deterministic durable-fact extraction after successful conversations, stable-key updates, targeted lexical retrieval, provider context injection, and a live memory listing/deletion UI. It does not use embeddings, a vector database, or a second AI extraction call.

## Deferred beyond Phase 4

Tasks, reminders, scheduling, web search, files/uploading, tools/actions, notifications, integrations, authentication, broader personalization, and real voice interaction remain deliberately deferred. The UI must not be interpreted as implementing those capabilities.
