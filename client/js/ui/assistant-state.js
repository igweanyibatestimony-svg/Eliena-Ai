const states = ['idle', 'listening', 'thinking', 'responding', 'working', 'error'];
const labels = { idle: 'I’m here with you', listening: 'I’m listening', thinking: 'I’m connecting the dots', responding: 'I’m ready to respond', working: 'I’m preparing an action', error: 'Something needs a moment' };

export function cycleAssistantState(root) {
  const panel = root.querySelector('[data-assistant-panel]');
  if (!panel) return;
  const current = panel.dataset.state || 'idle';
  const next = states[(states.indexOf(current) + 1) % states.length];
  panel.dataset.state = next;
  panel.querySelector('[data-state-title]').textContent = labels[next];
}

export function setAssistantState(root, state) {
  root.dataset.assistantState = state;
  const panel = root.querySelector('[data-assistant-panel]');
  if (!panel || !states.includes(state)) return;
  panel.dataset.state = state;
  panel.querySelector('[data-state-title]').textContent = labels[state];
}
