import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import { initializeDatabase } from './db/database.js';
import healthRouter from './routes/health.js';
import conversationsRouter from './routes/conversations.js';
import chatRouter from './routes/chat.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDirectory = path.resolve(currentDirectory, '../client');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use((request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    response.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/chat', chatRouter);
  app.use(express.static(clientDirectory, { extensions: ['html'] }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export function startServer() {
  initializeDatabase();
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Eliena AI is running at http://localhost:${config.port}`);
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
