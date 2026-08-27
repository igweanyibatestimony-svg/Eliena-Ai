import { Router } from 'express';
import { createConversation, getConversation, getDefaultUserId, listConversations, listMessages } from '../services/conversations.js';

const router = Router();

router.get('/', (request, response) => response.json({ conversations: listConversations(getDefaultUserId()) }));

router.post('/', (request, response) => {
  const title = typeof request.body?.title === 'string' ? request.body.title : 'New conversation';
  response.status(201).json({ conversation: createConversation(getDefaultUserId(), title) });
});

router.get('/:id/messages', (request, response) => {
  const id = Number.parseInt(request.params.id, 10);
  if (!Number.isInteger(id)) return response.status(400).json({ error: { code: 'INVALID_CONVERSATION', message: 'Invalid conversation.' } });
  const userId = getDefaultUserId();
  if (!getConversation(id, userId)) return response.status(404).json({ error: { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found.' } });
  return response.json({ messages: listMessages(id, userId) });
});

export default router;
