import { icon } from './icons.js';
import { mockData } from '../data/mock-data.js';

export const navigation = [
  ['home', 'Home', 'home'], ['chat', 'Chat', 'chat'], ['tasks', 'Tasks', 'check'],
  ['calendar', 'Calendar', 'calendar'], ['memory', 'Memory', 'memory'], ['files', 'Files', 'file'], ['settings', 'Settings', 'settings']
];

function navItems(active, items = navigation) {
  return items.map(([id, label, glyph]) => `<button class="nav-item ${id === active ? 'is-active' : ''}" data-nav="${id}" aria-current="${id === active ? 'page' : 'false'}">${icon(glyph)}<span>${label}</span></button>`).join('');
}

function rail(active) {
  return `<aside class="desktop-rail"><div class="wordmark"><span class="wordmark__mark"></span><span>ELIENA</span></div>${navItems(active)}<div class="rail-bottom"><button class="nav-item" data-action="voice" aria-label="Open voice mode">${icon('mic')}<span>Voice</span></button></div></aside>`;
}

function topbar() {
  return `<header class="topbar"><div class="wordmark"><span class="wordmark__mark"></span><span>ELIENA</span></div><div class="status-pill"><i class="status-pill__dot"></i><span id="connection-status">Connecting</span></div></header>`;
}

function assistantPanel(state = 'idle') {
  const labels = { idle: ['PRESENT', 'I’m here with you'], listening: ['LISTENING', 'I’m listening'], thinking: ['THINKING', 'I’m connecting the dots'], responding: ['RESPONDING', 'I’m ready to respond'], working: ['WORKING', 'I’m preparing an action'], error: ['ATTENTION', 'Something needs a moment'] };
  const [eyebrow, title] = labels[state];
  return `<section class="assistant-panel" data-assistant-panel data-state="${state}"><button class="orb" data-action="cycle-state" aria-label="Change Eliena visual state"><span class="orb__pulse"></span></button><div class="core-state"><div class="core-state__label"><span>${eyebrow}</span><strong data-state-title>${title}</strong></div><button class="state-cycle" data-action="cycle-state" aria-label="Change assistant state">${icon('spark')}</button></div></section>`;
}

function briefCard(iconName, label, value, detail) {
  return `<article class="glass-card brief-card"><div class="brief-card__top"><span class="brief-card__icon">${icon(iconName)}</span><p class="brief-card__label">${label}</p></div><p class="brief-card__value">${value}</p><p class="brief-card__detail">${detail}</p></article>`;
}

function agenda() {
  return mockData.agenda.map((item) => `<article class="glass-card agenda-item"><span class="agenda-item__time">${item.time}</span><div><strong>${item.title}</strong><small>${item.detail}</small></div><i class="agenda-item__dot" style="background:var(--${item.color});box-shadow:0 0 12px var(--${item.color})"></i></article>`).join('');
}

export function homeScreen() {
  return `<section class="screen"><div class="hero-grid"><div class="hero-copy"><p class="eyebrow">YOUR PERSONAL INTELLIGENCE</p><h1>Good morning,<br><em>you’re in focus.</em></h1><p>Eliena keeps the signal clear: what matters now, what is next, and where your attention can make a difference.</p><div class="section-head"><h2>Today, at a glance</h2></div><div class="card-grid">${briefCard('check', 'Focus', '3', 'priority moments')} ${briefCard('calendar', 'Schedule', '2', 'events ahead')} ${briefCard('spark', 'Energy', 'Clear', 'day in balance')}</div></div>${assistantPanel()}</div><div class="section-head"><h2>Start with intent</h2></div><div class="quick-grid"><button class="quick-action" data-action="mock" data-label="New task">${icon('plus')}<span>Capture a task</span></button><button class="quick-action" data-action="voice">${icon('mic')}<span>Talk to Eliena</span></button><button class="quick-action" data-nav="calendar">${icon('calendar')}<span>Plan your time</span></button><button class="quick-action" data-nav="chat">${icon('chat')}<span>Open a conversation</span></button></div><div class="section-head"><h2>Your rhythm</h2><button class="section-link" data-nav="calendar">Full schedule ${icon('arrow')}</button></div><div class="agenda-list">${agenda()}</div></section>`;
}

export function chatScreen(messages = []) {
  const renderedMessages = messages.map((message) => `<article class="message message--${message.role === 'assistant' ? 'eliena' : message.role}">${message.role === 'assistant' ? '<p class="message__meta">ELIENA</p>' : ''}<p>${message.content}</p></article>`).join('');
  return `<section class="screen"><p class="eyebrow">CONVERSATION SPACE</p><h1 class="screen-title">Talk with Eliena.</h1><div class="chat-shell"><div class="chat-topline"><div class="presence"><span class="presence__mini"></span><div><strong>Eliena</strong><small data-chat-status>Present and ready</small></div></div><button class="icon-button" data-action="voice" aria-label="Open voice mode">${icon('mic')}</button></div><div class="messages" data-messages aria-label="Conversation messages">${renderedMessages}<div class="tool-activity" data-tool-activity><i class="tool-activity__pulse"></i><span>Assistant activity will appear here when Eliena works with your tools.</span></div></div><form class="composer" data-composer><button class="icon-button" type="button" data-action="mock" data-label="Attachments" aria-label="Attach a file">${icon('attachment')}</button><textarea aria-label="Message Eliena" placeholder="What would you like to explore?"></textarea><button class="icon-button" type="button" data-action="voice" aria-label="Start voice mode">${icon('mic')}</button><button class="send-button" aria-label="Send message">${icon('send')}</button></form></div></section>`;
}

const screenDescriptions = {
  tasks: ['Tasks, with clarity.', 'A calm command view for everything you have committed to — not task management for its own sake.'],
  calendar: ['Your time, in orbit.', 'A visual schedule surface for plans, focus, and the space between them.'],
  memory: ['What Eliena remembers.', 'Transparent, editable, and always under your control.'],
  files: ['Your working context.', 'A quiet home for documents, references, and recent material.'],
  settings: ['Make Eliena yours.', 'Appearance, privacy, voice, and assistant preferences will live here.']
};

export function placeholderScreen(id) {
  const [title, copy] = screenDescriptions[id];
  const labels = id === 'tasks' ? ['Today’s priorities', 'Upcoming', 'Completed'] : id === 'calendar' ? ['Today', 'This week', 'Schedule something'] : id === 'memory' ? ['Personal context', 'Preferences', 'Memory controls'] : id === 'files' ? ['Recent files', 'Upload a file', 'Collections'] : ['Appearance', 'Privacy', 'Assistant preferences'];
  return `<section class="screen"><p class="eyebrow">${id.toUpperCase()} · UI FOUNDATION</p><h1 class="screen-title">${title}</h1><p class="screen-subtitle">${copy}</p><div class="placeholder-grid">${labels.map((label, index) => `<article class="glass-card placeholder-card"><span class="brief-card__icon">${icon(index === 1 ? 'spark' : id === 'calendar' ? 'calendar' : id === 'files' ? 'file' : id === 'memory' ? 'memory' : 'check')}</span><h3>${label}</h3><p>This is a visual placeholder. Its live personal-assistant capability arrives in a later phase.</p><i class="placeholder-card__line" style="width:${82 - index * 14}%"></i></article>`).join('')}</div></section>`;
}

export function voiceModal() {
  return `<div class="voice-modal" data-voice-modal role="dialog" aria-modal="true" aria-labelledby="voice-title"><section class="voice-card"><button class="icon-button" data-action="close-voice" aria-label="Close voice mode">×</button><div class="orb" data-voice-orb><span class="orb__pulse"></span></div><p class="eyebrow">VOICE MODE</p><h2 id="voice-title">Eliena is listening.</h2><p>This is the visual foundation for a future voice conversation.</p><div class="voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="voice-actions"><button class="button" data-action="close-voice">Cancel</button><button class="button button--primary" data-action="stop-voice">Stop listening</button></div></section></div>`;
}

export function appShell(activeScreen, messages = []) {
  const content = activeScreen === 'home' ? homeScreen() : activeScreen === 'chat' ? chatScreen(messages) : placeholderScreen(activeScreen);
  return `<div class="app-shell">${rail(activeScreen)}${topbar()}<main class="main-stage" id="main-stage">${content}</main><nav class="bottom-nav" aria-label="Primary navigation">${navItems(activeScreen, navigation.slice(0, 5))}</nav>${voiceModal()}</div>`;
}
