import { Router } from 'express';
import {
  addMessage,
  createConversation,
  getConversation,
  getDefaultUserId,
  listMessages,
  updateConversationTitle
} from '../services/conversations.js';
import { streamCompletion } from '../services/ai/provider.js';
import { findRelevantMemories, storeExtractedMemories } from '../services/memories.js';
import { config } from '../config/env.js';

const MAX_MESSAGE_LENGTH = 12_000;

function sseHeaders(response) {
  response.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  response.flushHeaders?.();
}

function sendEvent(response, event) {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}

function parseConversationId(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null;
  return typeof value === 'string' && /^(?:[1-9]\d*)$/.test(value) ? Number(value) : null;
}

export function createChatRouter({ aiService } = {}) {
  const router = Router();
  const completion = aiService ? aiService.streamCompletion.bind(aiService) : streamCompletion;

  router.post('/', async (request, response, next) => {
    const message = request.body?.message;

    if (
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return response.status(400).json({
        error: {
          code: 'INVALID_MESSAGE',
          message: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.`
        }
      });
    }

    try {
      const userId = getDefaultUserId();
      let conversationId = request.body?.conversationId;

      if (conversationId === undefined || conversationId === null || conversationId === '') {
        conversationId = createConversation(userId, message.trim().slice(0, 60)).id;
      } else {
        conversationId = parseConversationId(conversationId);
      }

      if (!conversationId || !getConversation(conversationId, userId)) {
        return response.status(404).json({
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found.'
          }
        });
      }

      const userMessage = addMessage(conversationId, userId, 'user', message);
      const history = listMessages(conversationId, userId).map(({ role, content }) => ({ role, content }));
      const memories = findRelevantMemories(userId, message);

      if (history.length === 1) updateConversationTitle(conversationId, userId, message);

      sseHeaders(response);
      sendEvent(response, { type: 'conversation', conversationId, message: userMessage });
      sendEvent(response, { type: 'assistant.thinking' });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.aiTimeoutMs);
      response.on('close', () => controller.abort());
      let assistantText = '';

      try {
        for await (const chunk of completion(history, controller.signal, { memories })) {
          assistantText += chunk;
          sendEvent(response, { type: 'assistant.responding', value: chunk });
        }

        if (!assistantText) {
          throw Object.assign(new Error('The AI provider returned no text.'), {
            status: 502,
            code: 'AI_EMPTY_RESPONSE'
          });
        }

        const assistantMessage = addMessage(conversationId, userId, 'assistant', assistantText);
        storeExtractedMemories(userId, conversationId, userMessage.content);
        sendEvent(response, { type: 'done', conversationId, message: assistantMessage });
      } catch (error) {
        const safeMessage = error.name === 'AbortError'
          ? 'The AI request timed out or was cancelled.'
          : error.status && error.status < 500
            ? error.message
            : 'Eliena could not complete that response.';

        sendEvent(response, {
          type: 'error',
          code: error.name === 'AbortError' ? 'AI_TIMEOUT' : error.code || 'AI_PROVIDER_ERROR',
          message: safeMessage
        });
      } finally {
        clearTimeout(timeout);
        response.end();
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createChatRouter;
