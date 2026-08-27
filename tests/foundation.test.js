import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../server/app.js';

test('health endpoint returns the Eliena service status', async (t) => {
  const server = createApp().listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: 'ok',
    service: 'Eliena AI'
  });
});
