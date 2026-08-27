import { getDatabase } from '../db/database.js';

const ROLE_PATTERN = /^(user|assistant|system)$/;

function rowToConversation(row) {
  return { id: row.id, userId: row.user_id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at };
}

function rowToMessage(row) {
  return { id: row.id, conversationId: row.conversation_id, role: row.role, content: row.content, createdAt: row.created_at };
}

export function getDefaultUserId() {
  const database = getDatabase();
  const existing = database.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  if (existing) return existing.id;
  const result = database.prepare('INSERT INTO users DEFAULT VALUES').run();
  return Number(result.lastInsertRowid);
}

export function createConversation(userId, title = 'New conversation') {
  const database = getDatabase();
  const result = database.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(userId, title.slice(0, 120));
  return getConversation(Number(result.lastInsertRowid), userId);
}

export function getConversation(id, userId) {
  const row = getDatabase().prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(id, userId);
  return row ? rowToConversation(row) : null;
}

export function listConversations(userId) {
  return getDatabase().prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC').all(userId).map(rowToConversation);
}

export function listMessages(conversationId, userId) {
  return getDatabase().prepare(`SELECT m.* FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.conversation_id = ? AND c.user_id = ? ORDER BY m.created_at ASC, m.id ASC`).all(conversationId, userId).map(rowToMessage);
}

export function addMessage(conversationId, userId, role, content) {
  if (!ROLE_PATTERN.test(role) || typeof content !== 'string' || !content.trim()) {
    throw Object.assign(new Error('Invalid message.'), { status: 400, code: 'INVALID_MESSAGE' });
  }
  const database = getDatabase();
  const conversation = getConversation(conversationId, userId);
  if (!conversation) throw Object.assign(new Error('Conversation not found.'), { status: 404, code: 'CONVERSATION_NOT_FOUND' });
  const result = database.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conversationId, role, content.trim());
  database.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);
  return rowToMessage(
  database.prepare('SELECT * FROM messages WHERE id = ?').get(Number(result.lastInsertRowid))
);
}
export function updateConversationTitle(conversationId, userId, title) {
  const safeTitle = title.trim().slice(0, 120) || 'New conversation';
  getDatabase().prepare('UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(safeTitle, conversationId, userId);
}
