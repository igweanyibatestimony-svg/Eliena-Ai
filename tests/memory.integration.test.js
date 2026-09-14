import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { createApp } from '../server/app.js';
import { closeDatabase, initializeDatabase } from '../server/db/database.js';
import {
  createOrUpdateMemory,
  extractMemoriesFromMessage,
  findRelevantMemories,
  listMemories
} from '../server/services/memories.js';
import { getDefaultUserId } from '../server/services/conversations.js';

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'eliena-memory-tests-'));
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
  return body.trim().split(/\r?\n\r?\n/).map((event) => JSON.parse(event.replace(/^data:\s*/, '')));
}

test('memory API creates, gets, updates, lists, deduplicates, and deletes memories', { concurrency: false }, async () => {
  await withServer(undefined, async (origin) => {
    const create = await fetch(`${origin}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'User prefers tea.', category: 'preference', importance: 0.7 })
    });
    assert.equal(create.status, 201);
    const first = (await create.json()).memory;
    assert.equal(first.status, 'active');

    const duplicate = await fetch(`${origin}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'User prefers tea.', category: 'preference', importance: 0.9 })
    });
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).memory.id, first.id);

    const get = await fetch(`${origin}/api/memories/${first.id}`);
    assert.equal((await get.json()).memory.content, 'User prefers tea.');

    const update = await fetch(`${origin}/api/memories/${first.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'User prefers mint tea.', importance: 0.8 })
    });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).memory.content, 'User prefers mint tea.');

    const listed = await fetch(`${origin}/api/memories`);
    assert.ok((await listed.json()).memories.some((memory) => memory.id === first.id));

    const deleted = await fetch(`${origin}/api/memories/${first.id}`, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
    assert.equal((await fetch(`${origin}/api/memories/${first.id}`)).status, 404);
  });
});

test('conversation extraction updates durable memories and ignores ordinary or temporary messages', { concurrency: false }, async () => {
  const calls = [];
  const aiService = {
    async *streamCompletion(history, signal, options) {
      calls.push({ history, options });
      yield 'Noted.';
    }
  };

  await withServer(aiService, async (origin) => {
    for (const message of ['My name is Ada.', 'My name is Grace.', 'What is the capital of France?', 'I like planning today.']) {
      const response = await fetch(`${origin}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      assert.equal(eventsFrom(await response.text()).at(-1).type, 'done');
    }

    const memories = (await (await fetch(`${origin}/api/memories`)).json()).memories;
    const names = memories.filter((memory) => memory.category === 'profile' && memory.content.includes('name'));
    assert.equal(names.length, 1);
    assert.equal(names[0].content, "User's name is Grace.");
    assert.equal(memories.some((memory) => memory.content.includes('capital of France')), false);
    assert.equal(memories.some((memory) => memory.content.includes('planning today')), false);

    const relevant = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is my name?' })
    });
    assert.equal(eventsFrom(await relevant.text()).at(-1).type, 'done');
    assert.deepEqual(calls.at(-1).options.memories.map((memory) => memory.content), ["User's name is Grace."]);

    const unrelated = await fetch(`${origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Tell me a joke.' })
    });
    assert.equal(eventsFrom(await unrelated.text()).at(-1).type, 'done');
    assert.deepEqual(calls.at(-1).options.memories, []);
  });
});

test('memory extraction and retrieval are deterministic service behavior', { concurrency: false }, () => {
  assert.deepEqual(extractMemoriesFromMessage('Can you explain SQLite?'), []);
  assert.deepEqual(extractMemoriesFromMessage('I live in Lagos.'), [{
    category: 'profile',
    content: 'User lives in Lagos.',
    memoryKey: 'profile:location',
    importance: 0.8,
    confidence: 0.9
  }]);

  const userId = getDefaultUserId();
  createOrUpdateMemory(userId, {
    content: 'User lives in Lagos.',
    category: 'profile',
    importance: 0.8
  }, { memoryKey: 'profile:location' });
  const relevant = findRelevantMemories(userId, 'Where does the user live?');
  assert.ok(relevant.some((memory) => memory.content === 'User lives in Lagos.'));
  assert.equal(listMemories(userId).every((memory) => memory.status === 'active'), true);
});
