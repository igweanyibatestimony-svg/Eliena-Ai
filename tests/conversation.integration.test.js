import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { createApp } from '../server/app.js';
import { closeDatabase, initializeDatabase } from '../server/db/database.js';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eliena-tests-'));
const databasePath = path.join(testDirectory, 'eliena.db');

before(() => initializeDatabase({ filePath: databasePath }));
after(() => {
  closeDatabase();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

async function withServer(aiService, run) {
  const server = createApp({ aiService }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function eventsFrom(body) {
  return body
    .trim()
    .split(/\r?\n\r?\n/)
    .map((event) => JSON.parse(event.replace(/^data:\s*/, '')));
}

test('conversation APIs create, list, and retrieve empty history', { concurrency: false }, async () => {
  await withServer(undefined, async (origin) => {
    const created = await fetch(`${origin}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Planning' })
    });
    assert.equal(created.status, 201);
    const conversation = (await created.json()).conversation;
    assert.equal(conversation.title, 'Planning');

    const listed = await fetch(`${origin}/api/conversations`);
    assert.equal(listed.status, 200);
    assert.ok((await listed.json()).conversations.some((item) => item.id === conversation.id));

    const history = await fetch(`${origin}/api/conversations/${conversation.id}/messages`);
    assert.deepEqual(await history.json(), { messages: [] });

    const invalid = await fetch(`${origin}/api/conversations/${conversation.id}invalid/messages`);
    assert.equal(invalid.status, 400);
  });
});

test('chat streams, persists, and resumes a conversation', { concurrency: false }, async () => {
  const receivedHistories = [];
  const aiService = {
    async *streamCompletion(history) {
      receivedHistories.push(history);
      yield 'Hello';
      yield ' from Eliena.';
    }
  };

  await withServer(aiService, async (origin) => {
    const first = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is your name?' })
    });
    assert.equal(first.status, 200);
    const firstEvents = eventsFrom(await first.text());
    assert.deepEqual(firstEvents.map((event) => event.type), [
      'conversation', 'assistant.thinking', 'assistant.responding', 'assistant.responding', 'done'
    ]);
    assert.equal(Object.hasOwn(firstEvents[1], 'provider'), false);
    const conversationId = firstEvents[0].conversationId;
    assert.equal(firstEvents.at(-1).message.content, 'Hello from Eliena.');
    assert.deepEqual(receivedHistories[0], [{ role: 'user', content: 'What is your name?' }]);

    const firstHistory = await fetch(`${origin}/api/conversations/${conversationId}/messages`);
    assert.deepEqual((await firstHistory.json()).messages.map(({ role, content }) => ({ role, content })), [
      { role: 'user', content: 'What is your name?' },
      { role: 'assistant', content: 'Hello from Eliena.' }
    ]);

    const second = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message: 'Please continue.' })
    });
    const secondEvents = eventsFrom(await second.text());
    assert.equal(secondEvents.at(-1).type, 'done');
    assert.deepEqual(receivedHistories[1], [
      { role: 'user', content: 'What is your name?' },
      { role: 'assistant', content: 'Hello from Eliena.' },
      { role: 'user', content: 'Please continue.' }
    ]);
  });
});

test('chat rejects invalid input and preserves the user message after a provider failure', { concurrency: false }, async () => {
  const failingAiService = {
    async *streamCompletion() {
      throw Object.assign(new Error('Provider unavailable.'), { status: 503, code: 'AI_PROVIDER_UNAVAILABLE' });
    }
  };

  await withServer(failingAiService, async (origin) => {
    const invalid = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' })
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'INVALID_MESSAGE');

    const failed = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Keep this message' })
    });
    const failedEvents = eventsFrom(await failed.text());
    assert.equal(failedEvents.at(-1).type, 'error');
    assert.equal(failedEvents.at(-1).code, 'AI_PROVIDER_UNAVAILABLE');

    const conversationId = failedEvents[0].conversationId;
    const history = await fetch(`${origin}/api/conversations/${conversationId}/messages`);
    assert.deepEqual((await history.json()).messages.map(({ role, content }) => ({ role, content })), [
      { role: 'user', content: 'Keep this message' }
    ]);
  });
});
