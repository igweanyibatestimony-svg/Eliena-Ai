import { getDatabase } from '../db/database.js';

const MAX_MEMORY_LENGTH = 1_000;
const CATEGORIES = new Set(['profile', 'preference', 'fact', 'custom']);
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'for', 'from', 'i', 'in', 'is', 'it',
  'my', 'of', 'on', 'or', 'that', 'the', 'to', 'user', 'was', 'what', 'with', 'you', 'your'
]);
const TEMPORARY_PATTERN = /\b(today|tomorrow|yesterday|tonight|this week|next week|last week|currently|right now)\b/i;

function memoryError(message, status = 400, code = 'INVALID_MEMORY') {
  return Object.assign(new Error(message), { status, code });
}

function clampScore(value, fallback) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : fallback;
}

function normalizeWhitespace(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeMemoryText(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return new Set(
    normalizeMemoryText(value)
      .split(' ')
      .map((token) => token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  );
}

function makeMemoryKey(category, content, explicitKey) {
  return explicitKey || `${category}:${normalizeMemoryText(content)}`.slice(0, 1_200);
}

function rowToMemory(row) {
  return {
    id: row.id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    category: row.category,
    content: row.content,
    importance: row.importance,
    confidence: row.confidence,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateMemoryInput({ content, category = 'custom', importance = 0.5, confidence = 0.8 }) {
  if (typeof content !== 'string' || !normalizeWhitespace(content) || content.length > MAX_MEMORY_LENGTH) {
    throw memoryError(`Memory content must be between 1 and ${MAX_MEMORY_LENGTH} characters.`);
  }
  if (typeof category !== 'string' || !CATEGORIES.has(category)) {
    throw memoryError('Memory category must be profile, preference, fact, or custom.');
  }
  return {
    content: normalizeWhitespace(content),
    category,
    importance: clampScore(importance, 0.5),
    confidence: clampScore(confidence, 0.8)
  };
}

export function getMemory(id, userId, { includeDeleted = false } = {}) {
  const row = getDatabase().prepare(`
    SELECT * FROM memories
    WHERE id = ? AND user_id = ? ${includeDeleted ? '' : "AND status = 'active'"}
  `).get(id, userId);
  return row ? rowToMemory(row) : null;
}

export function listMemories(userId) {
  return getDatabase().prepare(`
    SELECT * FROM memories
    WHERE user_id = ? AND status = 'active'
    ORDER BY importance DESC, updated_at DESC, id DESC
  `).all(userId).map(rowToMemory);
}

export function createOrUpdateMemory(userId, input, { conversationId = null, source = 'manual', memoryKey } = {}) {
  const memory = validateMemoryInput(input);
  const database = getDatabase();
  const key = makeMemoryKey(memory.category, memory.content, memoryKey);
  const existing = database.prepare(`
    SELECT * FROM memories WHERE user_id = ? AND memory_key = ? AND status = 'active'
  `).get(userId, key);
  const metadata = JSON.stringify({ source });

  if (existing) {
    database.prepare(`
      UPDATE memories
      SET content = ?, category = ?, importance = ?, confidence = ?, conversation_id = ?, metadata_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      memory.content,
      memory.category,
      memory.importance,
      memory.confidence,
      conversationId,
      metadata,
      existing.id
    );
    return { memory: getMemory(existing.id, userId), created: false };
  }

  const result = database.prepare(`
    INSERT INTO memories (user_id, conversation_id, category, content, metadata_json, memory_key, importance, confidence, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    userId,
    conversationId,
    memory.category,
    memory.content,
    metadata,
    key,
    memory.importance,
    memory.confidence
  );
  return { memory: getMemory(Number(result.lastInsertRowid), userId), created: true };
}

export function updateMemory(id, userId, updates) {
  const existing = getMemory(id, userId);
  if (!existing) throw memoryError('Memory not found.', 404, 'MEMORY_NOT_FOUND');
  const input = validateMemoryInput({
    content: updates.content ?? existing.content,
    category: updates.category ?? existing.category,
    importance: updates.importance ?? existing.importance,
    confidence: updates.confidence ?? existing.confidence
  });
  const key = makeMemoryKey(input.category, input.content);
  const database = getDatabase();
  const duplicate = database.prepare(`
    SELECT id FROM memories WHERE user_id = ? AND memory_key = ? AND status = 'active' AND id != ?
  `).get(userId, key, id);
  if (duplicate) throw memoryError('An active memory with the same content already exists.', 409, 'DUPLICATE_MEMORY');

  database.prepare(`
    UPDATE memories
    SET content = ?, category = ?, importance = ?, confidence = ?, memory_key = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).run(input.content, input.category, input.importance, input.confidence, key, id, userId);
  return getMemory(id, userId);
}

export function deleteMemory(id, userId) {
  const result = getDatabase().prepare(`
    UPDATE memories SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND status = 'active'
  `).run(id, userId);
  return result.changes > 0;
}

export function extractMemoriesFromMessage(content) {
  if (typeof content !== 'string' || TEMPORARY_PATTERN.test(content)) return [];
  const text = normalizeWhitespace(content);
  const candidates = [];
  const add = (match, category, value, key, importance = 0.7) => {
    if (!match || !value || TEMPORARY_PATTERN.test(value)) return;
    const cleanValue = normalizeWhitespace(value).replace(/[.!?]+$/, '');
    candidates.push({ category, content: `${cleanValue}.`, memoryKey: key, importance, confidence: 0.9 });
  };

  let match = text.match(/\bmy name is ([\p{L}][\p{L}' -]{0,80})[.!?]?$/iu);
  add(match, 'profile', match && `User's name is ${normalizeWhitespace(match[1])}.`, 'profile:name', 0.9);

  match = text.match(/\bI live in ([\p{L}\p{N}][\p{L}\p{N}' ,.-]{0,100})[.!?]?$/iu);
  add(match, 'profile', match && `User lives in ${normalizeWhitespace(match[1])}.`, 'profile:location', 0.8);

  match = text.match(/\bI work as (?:an? )?([\p{L}][\p{L}' -]{1,100})[.!?]?$/iu);
  add(match, 'profile', match && `User works as ${normalizeWhitespace(match[1])}.`, 'profile:occupation', 0.8);

  match = text.match(/\bmy favorite ([\p{L} -]{2,60}) is ([^.!?]{1,160})[.!?]?$/iu);
  if (match) {
    const subject = normalizeWhitespace(match[1]);
    const value = normalizeWhitespace(match[2]);
    add(match, 'preference', `User's favorite ${subject} is ${value}.`, `preference:favorite:${normalizeMemoryText(subject)}`, 0.8);
  }

  match = text.match(/\bI (?:prefer|like|love) ([^.!?]{2,180})[.!?]?$/iu);
  if (match) {
    const value = normalizeWhitespace(match[1]);
    add(match, 'preference', `User prefers ${value}.`, `preference:${normalizeMemoryText(value)}`, 0.7);
  }

  return candidates;
}

export function storeExtractedMemories(userId, conversationId, content) {
  return extractMemoriesFromMessage(content).map((candidate) => createOrUpdateMemory(userId, candidate, {
    conversationId,
    source: 'conversation',
    memoryKey: candidate.memoryKey
  }));
}

export function findRelevantMemories(userId, message, { limit = 5 } = {}) {
  const queryTokens = tokens(message);
  if (!queryTokens.size) return [];

  return listMemories(userId)
    .map((memory) => {
      const memoryTokens = tokens(memory.content);
      const overlap = [...queryTokens].filter((token) => memoryTokens.has(token)).length;
      return { memory, score: overlap / queryTokens.size + memory.importance * 0.05 };
    })
    .filter(({ score }) => score >= 0.1)
    .sort((left, right) => right.score - left.score || right.memory.importance - left.memory.importance)
    .slice(0, limit)
    .map(({ memory }) => memory);
}
