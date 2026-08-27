import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config/env.js';
import { migrations } from './migrations/index.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, '../..');
const databaseFile = path.isAbsolute(config.databasePath)
  ? config.databasePath
  : path.resolve(projectRoot, config.databasePath);

let database;

function applyMigrations(connection) {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = new Set(
    connection.prepare('SELECT id FROM schema_migrations').all().map((row) => row.id)
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;

    connection.exec('BEGIN');
    try {
      migration.up(connection);
      connection.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(migration.id);
      connection.exec('COMMIT');
    } catch (error) {
      connection.exec('ROLLBACK');
      throw error;
    }
  }
}

export function initializeDatabase() {
  if (database) return database;

  fs.mkdirSync(path.dirname(databaseFile), { recursive: true });
  database = new DatabaseSync(databaseFile);
  database.exec('PRAGMA foreign_keys = ON;');
  database.exec('PRAGMA journal_mode = WAL;');
  applyMigrations(database);
  return database;
}

export function getDatabase() {
  return database || initializeDatabase();
}

export function getDatabasePath() {
  return databaseFile;
}
