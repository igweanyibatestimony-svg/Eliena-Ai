import 'dotenv/config';

function parsePort(value) {
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port > 0 && port < 65_536 ? port : 3000;
}

export const config = Object.freeze({
  environment: process.env.NODE_ENV || 'development',
  port: parsePort(process.env.PORT || '3000'),
  databasePath: process.env.ELIENA_DB_PATH || 'data/eliena.db',
  aiProvider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  aiTimeoutMs: Number.parseInt(process.env.AI_TIMEOUT_MS || '90000', 10)
});

export const isProduction = config.environment === 'production';
