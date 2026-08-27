import { appShell } from './ui/templates.js';
import { cycleAssistantState } from './ui/assistant-state.js';
import { setAssistantState } from './ui/assistant-state.js';
import { showToast } from './ui/toast.js';
import { streamChat } from './services/chat-api.js';

const app = document.querySelector('#app');
let activeScreen = 'home';
let conversationId = null;
let chatMessages = [];
let chatBusy = false;

function render() {
  app.innerHTML = appShell(activeScreen, chatMessages);
  checkConnection();
  if (activeScreen === 'chat' && conversationId) loadConversation();
}

function openVoiceMode() {
  const modal = app.querySelector('[data-voice-modal]');
  modal.classList.add('is-open');
  modal.querySelector('[data-action="close-voice"]').focus();
}

function closeVoiceMode() {
  app.querySelector('[data-voice-modal]')?.classList.remove('is-open');
}

async function checkConnection() {
  const indicator = document.querySelector('#connection-status');
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || payload.status !== 'ok') throw new Error('Health check failed');
    indicator.textContent = 'Systems ready';
  } catch {
    indicator.textContent = 'Offline shell';
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/service-worker.js');
  } catch (error) {
    console.warn('Service worker registration failed.', error);
  }
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-nav], [data-action]');
  if (!target) return;
  if (target.dataset.nav) { activeScreen = target.dataset.nav; render(); return; }
  if (target.dataset.action === 'voice') openVoiceMode();
  if (target.dataset.action === 'close-voice') closeVoiceMode();
  if (target.dataset.action === 'stop-voice') { closeVoiceMode(); showToast('Voice mode is ready for Phase 4 connection.'); }
  if (target.dataset.action === 'cycle-state') cycleAssistantState(app);
  if (target.dataset.action === 'mock') showToast(`${target.dataset.label || 'This action'} is a Phase 3 visual placeholder.`);
});

app.addEventListener('submit', (event) => {
  if (!event.target.matches('[data-composer]')) return;
  event.preventDefault();
  const input = event.target.querySelector('textarea');
  const message = input.value.trim();
  if (!message || chatBusy) return;
  sendChatMessage(message, input);
});

async function loadConversation() {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/messages`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Conversation unavailable');
    const payload = await response.json();
    chatMessages = payload.messages || [];
    if (activeScreen === 'chat' && !chatBusy) render();
  } catch {
    conversationId = null;
    localStorage.removeItem('eliena.conversationId');
  }
}

async function sendChatMessage(message, input) {
  chatBusy = true;
  input.value = '';
  const messagesElement = app.querySelector('[data-messages]');
  const activity = app.querySelector('[data-tool-activity]');
  const status = app.querySelector('[data-chat-status]');
  const userBubble = document.createElement('article');
  userBubble.className = 'message message--user'; userBubble.innerHTML = `<p>${message.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</p>`;
  messagesElement.insertBefore(userBubble, activity);
  const assistantBubble = document.createElement('article');
  assistantBubble.className = 'message message--eliena'; assistantBubble.innerHTML = '<p class="message__meta">ELIENA</p><p data-stream-text></p>';
  messagesElement.insertBefore(assistantBubble, activity);
  chatMessages.push({ role: 'user', content: message });
  setAssistantState(app, 'thinking'); status.textContent = 'Thinking'; activity.hidden = false;
  try {
    await streamChat({ conversationId, message, onEvent: (event) => {
      if (event.conversationId && !conversationId) { conversationId = event.conversationId; localStorage.setItem('eliena.conversationId', String(conversationId)); }
      if (event.type === 'assistant.thinking') { status.textContent = 'Thinking'; }
      if (event.type === 'assistant.responding') { setAssistantState(app, 'responding'); status.textContent = 'Responding'; assistantBubble.querySelector('[data-stream-text]').textContent += event.value || ''; }
      if (event.type === 'done') { chatMessages = [...chatMessages, event.message ? { role: 'assistant', content: event.message.content } : null].filter(Boolean); status.textContent = 'Present and ready'; }
      if (event.type === 'error') { throw new Error(event.message || 'AI response failed.'); }
    }});
  } catch (error) {
    assistantBubble.remove(); chatMessages = chatMessages.filter((entry) => !(entry.role === 'user' && entry.content === message)); status.textContent = 'Needs attention'; setAssistantState(app, 'error'); showToast(error.message);
  } finally { chatBusy = false; activity.hidden = true; if (status.textContent !== 'Needs attention') { setAssistantState(app, 'idle'); status.textContent = 'Present and ready'; } }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeVoiceMode();
});

conversationId = Number.parseInt(localStorage.getItem('eliena.conversationId') || '', 10) || null;
render();
registerServiceWorker();
