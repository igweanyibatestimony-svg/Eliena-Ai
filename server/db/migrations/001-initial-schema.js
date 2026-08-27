const initialSchema = {
  id: '001-initial-schema',
  up(database) {
    database.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE conversations (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE messages (
        id INTEGER PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE memories (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
        category TEXT,
        content TEXT NOT NULL,
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        due_at TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE reminders (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
        scheduled_for TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE files (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
        original_name TEXT NOT NULL,
        storage_key TEXT NOT NULL UNIQUE,
        mime_type TEXT,
        size_bytes INTEGER,
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE integrations (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'disabled',
        metadata_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, type)
      );

      CREATE INDEX idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX idx_memories_user_id ON memories(user_id);
      CREATE INDEX idx_tasks_user_id_status ON tasks(user_id, status);
      CREATE INDEX idx_reminders_scheduled_for_status ON reminders(scheduled_for, status);
      CREATE INDEX idx_files_user_id ON files(user_id);
      CREATE INDEX idx_integrations_user_id ON integrations(user_id);
    `);
  }
};

export default initialSchema;
