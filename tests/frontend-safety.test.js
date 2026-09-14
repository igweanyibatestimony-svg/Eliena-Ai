import assert from 'node:assert/strict';
import test from 'node:test';
import { chatScreen, memoryScreen } from '../client/js/ui/templates.js';

test('persisted chat content is escaped before template rendering', () => {
  const screen = chatScreen([
    { role: 'assistant', content: '<img src=x onerror="alert(1)">' },
    { role: 'user', content: 'Fish & chips' }
  ]);

  assert.doesNotMatch(screen, /<img src=x/);
  assert.match(screen, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  assert.match(screen, /Fish &amp; chips/);
});

test('memory screen renders safe memory content and a delete control', () => {
  const screen = memoryScreen([{
    id: 42,
    category: 'preference',
    content: '<script>alert(1)</script>',
    importance: 0.8
  }]);

  assert.doesNotMatch(screen, /<script>/);
  assert.match(screen, /data-action="delete-memory"/);
  assert.match(screen, /data-memory-id="42"/);
});
