function parseEvent(raw) {
  const line = raw.split('\n').find((entry) => entry.startsWith('data:'));
  if (!line) return null;
  try { return JSON.parse(line.slice(5).trim()); } catch { return null; }
}

export async function streamChat({ conversationId, message, onEvent }) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ conversationId, message })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || 'Eliena could not start that conversation.');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const raw of events) { const event = parseEvent(raw); if (event) onEvent(event); }
    if (done) break;
  }
}
