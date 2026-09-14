import { Router } from 'express';
import { getDefaultUserId } from '../services/conversations.js';
import {
  createOrUpdateMemory,
  deleteMemory,
  getMemory,
  listMemories,
  updateMemory
} from '../services/memories.js';

const router = Router();

function parseMemoryId(value) {
  return typeof value === 'string' && /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

function invalidId(response) {
  return response.status(400).json({
    error: { code: 'INVALID_MEMORY', message: 'Invalid memory.' }
  });
}

router.get('/', (request, response) => {
  response.json({ memories: listMemories(getDefaultUserId()) });
});

router.post('/', (request, response, next) => {
  try {
    const result = createOrUpdateMemory(getDefaultUserId(), request.body || {});
    response.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (request, response) => {
  const id = parseMemoryId(request.params.id);
  if (!id) return invalidId(response);
  const memory = getMemory(id, getDefaultUserId());
  if (!memory) {
    return response.status(404).json({
      error: { code: 'MEMORY_NOT_FOUND', message: 'Memory not found.' }
    });
  }
  return response.json({ memory });
});

router.patch('/:id', (request, response, next) => {
  const id = parseMemoryId(request.params.id);
  if (!id) return invalidId(response);
  try {
    response.json({ memory: updateMemory(id, getDefaultUserId(), request.body || {}) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (request, response) => {
  const id = parseMemoryId(request.params.id);
  if (!id) return invalidId(response);
  if (!deleteMemory(id, getDefaultUserId())) {
    return response.status(404).json({
      error: { code: 'MEMORY_NOT_FOUND', message: 'Memory not found.' }
    });
  }
  return response.status(204).end();
});

export default router;
