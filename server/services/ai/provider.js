import { config } from '../../config/env.js';

function providerError(message, status = 502, code = 'AI_PROVIDER_ERROR') {
  return Object.assign(new Error(message), { status, code });
}

function requireKey(value, label) {
  if (!value) throw providerError(`${label} is not configured on the server.`, 503, 'AI_PROVIDER_NOT_CONFIGURED');
}

function extractText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
}

async function* geminiStream(messages, signal) {
  requireKey(config.geminiApiKey, 'Gemini');
  const contents = messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  const system = messages.find((message) => message.role === 'system');
  const body = { contents, ...(system ? { systemInstruction: { parts: [{ text: system.content }] } } : {}) };
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.geminiApiKey)}`;
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!response.ok) throw providerError('The AI provider could not process this request.', response.status === 429 ? 429 : 502);
  yield* parseSseText(response.body, (payload) => extractText(payload));
}

async function* openAiStream(messages, signal) {
  requireKey(config.openaiApiKey, 'OpenAI-compatible AI');
  const response = await fetch(`${config.openaiBaseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiApiKey}` }, body: JSON.stringify({ model: config.openaiModel, messages, stream: true }), signal });
  if (!response.ok) throw providerError('The AI provider could not process this request.', response.status === 429 ? 429 : 502);
  yield* parseSseText(response.body, (payload) => payload?.choices?.[0]?.delta?.content || '');
}

async function* parseSseText(body, getText) {
  if (!body) throw providerError('The AI provider returned an empty stream.');
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const data = line.trim().replace(/^data:\s*/, '');
      if (!data || data === '[DONE]') continue;
      try { const text = getText(JSON.parse(data)); if (text) yield text; } catch { /* Ignore provider keep-alives/malformed chunks. */ }
    }
    if (done) break;
  }
}

export function getProviderName() { return config.aiProvider; }

export async function* streamCompletion(messages, signal) {
  if (config.aiProvider === 'gemini') yield* geminiStream(messages, signal);
  else if (config.aiProvider === 'openai') yield* openAiStream(messages, signal);
  else throw providerError('No supported AI provider is configured. Set AI_PROVIDER to gemini or openai.', 503, 'AI_PROVIDER_NOT_CONFIGURED');
}
