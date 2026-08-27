/**
 * Stable, implementation-neutral record shapes for future Eliena services.
 * They are descriptors, not database models or business logic.
 */
export const entityContracts = Object.freeze({
  Message: ['id', 'conversationId', 'role', 'content', 'metadata', 'createdAt'],
  Conversation: ['id', 'userId', 'title', 'createdAt', 'updatedAt'],
  Memory: ['id', 'userId', 'conversationId', 'category', 'content', 'metadata', 'createdAt', 'updatedAt'],
  Task: ['id', 'userId', 'title', 'status', 'dueAt', 'metadata', 'createdAt', 'updatedAt'],
  Reminder: ['id', 'userId', 'taskId', 'scheduledFor', 'status', 'metadata', 'createdAt', 'updatedAt'],
  ToolCall: ['id', 'name', 'arguments', 'status', 'requiresConfirmation', 'result'],
  Notification: ['id', 'userId', 'title', 'body', 'status', 'createdAt'],
  StreamingEvent: ['type', 'conversationId', 'value', 'metadata']
});

export const streamingEventTypes = Object.freeze([
  'text',
  'thinking',
  'tool_activity',
  'usage',
  'error',
  'done'
]);
