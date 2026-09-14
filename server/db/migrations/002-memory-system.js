const memorySystem = {
  id: '002-memory-system',
  up(database) {
    database.exec(`
      ALTER TABLE memories ADD COLUMN memory_key TEXT;
      ALTER TABLE memories ADD COLUMN importance REAL NOT NULL DEFAULT 0.5;
      ALTER TABLE memories ADD COLUMN confidence REAL NOT NULL DEFAULT 0.8;
      ALTER TABLE memories ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

      CREATE INDEX idx_memories_user_status_updated
        ON memories(user_id, status, updated_at DESC, id DESC);
      CREATE INDEX idx_memories_user_category_status
        ON memories(user_id, category, status);
      CREATE UNIQUE INDEX idx_memories_active_key
        ON memories(user_id, memory_key) WHERE status = 'active' AND memory_key IS NOT NULL;
    `);
  }
};

export default memorySystem;
