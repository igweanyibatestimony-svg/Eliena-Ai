import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCompletionMessages,
  createAiService,
  ELIENA_SYSTEM_INSTRUCTION
} from '../server/services/ai/provider.js';

function configuration(overrides = {}) {
  return {
    aiProvider: 'gemini',
    geminiApiKey: 'test-gemini-key',
    geminiModel: 'gemini-test',
    openaiApiKey: 'test-openai-key',
    openaiBaseUrl: 'https://gateway.example/v1',
    openaiModel: 'openai-test',
    ...overrides
  };
}

async function collect(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

test('Eliena identity is always the first provider message', () => {
  const messages = buildCompletionMessages([{ role: 'user', content: 'What is your name?' }]);
  assert.deepEqual(messages[0], { role: 'system', content: ELIENA_SYSTEM_INSTRUCTION });
  assert.match(messages[0].content, /Your name is Eliena/);
  assert.match(messages[0].content, /never as an underlying model/);
  assert.deepEqual(messages.slice(1), [{ role: 'user', content: 'What is your name?' }]);
});

test('relevant memories are injected as separate contextual system content', () => {
  const messages = buildCompletionMessages([{ role: 'user', content: 'What is my name?' }], {
    memories: [{ content: "User's name is Grace." }]
  });
  assert.equal(messages[0].content, ELIENA_SYSTEM_INSTRUCTION);
  assert.match(messages[1].content, /Relevant long-term user memories/);
  assert.match(messages[1].content, /User's name is Grace/);
  assert.deepEqual(messages[2], { role: 'user', content: 'What is my name?' });
});

test('Gemini selection sends identity as a system instruction and streams text', async () => {
  let request;
  const aiService = createAiService({
    configuration: configuration(),
    fetchImplementation: async (url, options) => {
      request = { url, options };
      return new Response('data: {"candidates":[{"content":{"parts":[{"text":"Eliena"}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":" here"}]}}]}');
    }
  });

  assert.deepEqual(await collect(aiService.streamCompletion([{ role: 'user', content: 'What is your name?' }])), ['Eliena', ' here']);
  assert.match(request.url, /models\/gemini-test:streamGenerateContent/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.systemInstruction.parts[0].text, ELIENA_SYSTEM_INSTRUCTION);
  assert.deepEqual(body.contents, [{ role: 'user', parts: [{ text: 'What is your name?' }] }]);
});

test('OpenAI-compatible selection sends the Eliena system message and streams text', async () => {
  let request;
  const aiService = createAiService({
    configuration: configuration({ aiProvider: 'openai' }),
    fetchImplementation: async (url, options) => {
      request = { url, options };
      return new Response('data: {"choices":[{"delta":{"content":"Eliena"}}]}\r\n\r\ndata: [DONE]\r\n\r\n');
    }
  });

  assert.deepEqual(await collect(aiService.streamCompletion([{ role: 'user', content: 'Name?' }])), ['Eliena']);
  assert.equal(request.url, 'https://gateway.example/v1/chat/completions');
  assert.deepEqual(JSON.parse(request.options.body).messages[0], {
    role: 'system', content: ELIENA_SYSTEM_INSTRUCTION
  });
});

test('provider configuration and malformed streams fail safely', async () => {
  const unsupported = createAiService({ configuration: configuration({ aiProvider: 'unknown' }) });
  await assert.rejects(collect(unsupported.streamCompletion([])), { code: 'AI_PROVIDER_NOT_CONFIGURED' });

  const missingKey = createAiService({ configuration: configuration({ geminiApiKey: '' }) });
  await assert.rejects(collect(missingKey.streamCompletion([])), { code: 'AI_PROVIDER_NOT_CONFIGURED' });

  const malformed = createAiService({
    configuration: configuration(),
    fetchImplementation: async () => new Response('data: not-json\n\n')
  });
  assert.deepEqual(await collect(malformed.streamCompletion([])), []);

  const invalidBaseUrl = createAiService({
    configuration: configuration({ aiProvider: 'openai', openaiBaseUrl: 'not a url' })
  });
  await assert.rejects(collect(invalidBaseUrl.streamCompletion([])), { code: 'AI_PROVIDER_NOT_CONFIGURED' });

  const unavailable = createAiService({
    configuration: configuration(),
    fetchImplementation: async () => new Response('', { status: 429 })
  });
  await assert.rejects(collect(unavailable.streamCompletion([])), (error) => (
    error.code === 'AI_PROVIDER_ERROR' && error.status === 429
  ));
});
