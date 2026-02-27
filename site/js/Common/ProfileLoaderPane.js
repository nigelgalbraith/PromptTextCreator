
import { notifyTicker } from '../utils/ticker.js';
import { button, el } from '../utils/dom.js';

const DEFAULT_STATE_KEY = 'TEXT_PROFILE';
const DEFAULT_ACCEPT = 'application/json';
const DEFAULT_PROFILE_URL = 'data/default.json';

const DEFAULT_MESSAGES = {
  defaultLoaded: 'Default profile loaded',
  defaultFailed: 'Failed to load default profile',
  profileLoaded: 'Profile loaded: {file}',
  invalidJson: 'Invalid JSON file',
  readFailed: 'Failed to read file',
};

// readFileAsText handles this function's logic.
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}


// Parse JSONSafe.
function parseJSONSafe(text, fallbackMsg) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: fallbackMsg || 'Invalid JSON file' };
  }
}


// Resolve Messages.
function resolveMessages(messages) {
  return { ...DEFAULT_MESSAGES, ...(messages || {}) };
}


// Set Shared State.
function setSharedState(state, stateKey, setState, profile) {
  if (typeof setState === 'function') {
    setState(profile);
    return;
  }
  if (state && typeof state.set === 'function') {
    // Mutate shared state so dependent panes stay in sync.
    state.set(stateKey, profile);
  }
}


// Update Status.
function updateStatus(statusEl, text, color) {
  if (!statusEl) return;
  // Update DOM state so the UI reflects current data.
  statusEl.textContent = text;
  statusEl.style.color = color || '';
}


// Load Default Profile.
async function loadDefaultProfile({
  url,
  messages,
  statusEl,
  tickerController,
  state,
  stateKey,
  setState,
  isDestroyed,
}) {
  try {
    // Handle async work before continuing UI updates.
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const txt = await res.text();
    if (isDestroyed()) return;
    const parsed = parseJSONSafe(txt, messages.invalidJson);
    if (!parsed.ok) {
      const msgErr = messages.invalidJson || parsed.error || 'Invalid JSON file';
      updateStatus(statusEl, msgErr, '#f87171');
      notifyTicker(tickerController, msgErr, 3000);
      return;
    }
    setSharedState(state, stateKey, setState, parsed.value);
    const msg = messages.defaultLoaded || 'Default profile loaded';
    updateStatus(statusEl, msg, 'var(--accent)');
    notifyTicker(tickerController, msg, 2500);
  } catch {
    if (isDestroyed()) return;
    const emsg = messages.defaultFailed || 'Failed to load default profile';
    updateStatus(statusEl, emsg, '#f87171');
    notifyTicker(tickerController, emsg, 3000);
  }
}


// Build a profile loader pane with explicit configuration.
export function buildProfileLoaderPane(options = {}) {
  const {
    buttonLabel = 'Load Profile',
    accept = DEFAULT_ACCEPT,
    defaultProfileUrl = DEFAULT_PROFILE_URL,
    loadDefaultOnInit = true,
    state = null,
    stateKey = DEFAULT_STATE_KEY,
    setState,
    tickerController = null,
    messages,
  } = options;
  const resolvedMessages = resolveMessages(messages);
  const node = el('div', { className: 'pane-profile-loader' });
  const actions = el('div', { className: 'actions actions-centered' });
  const btn = button({ className: 'primary', text: buttonLabel });
  const input = el('input', { attrs: { type: 'file', accept } });
  input.hidden = true;
  // Update DOM state so the UI reflects current data.
  actions.appendChild(btn);
  actions.appendChild(input);
  node.appendChild(actions);
  const status = tickerController
    ? null
    : (() => {
        const statusNode = el('div', { className: 'status-text' });
        node.appendChild(statusNode);
        return statusNode;
      })();
  let destroyed = false;
  const isDestroyed = () => destroyed;
  // On Btn Click.
  function onBtnClick() {
    input.click();
  }
  // On Input Change.
  async function onInputChange(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      // Handle async work before continuing UI updates.
      const txt = await readFileAsText(file);
      if (isDestroyed()) return;
      const parsed = parseJSONSafe(txt, resolvedMessages.invalidJson);
      if (!parsed.ok) {
        const msgErr = resolvedMessages.invalidJson || parsed.error || 'Invalid JSON file';
        updateStatus(status, msgErr, '#f87171');
        notifyTicker(tickerController, msgErr, 3000);
        return;
      }
      setSharedState(state, stateKey, setState, parsed.value);
      const fileName = file.name || 'profile.json';
      const msg = String(resolvedMessages.profileLoaded || 'Profile loaded: {file}').replace('{file}', fileName);
      updateStatus(status, msg, 'var(--accent)');
      notifyTicker(tickerController, msg, 2500);
    } catch {
      if (isDestroyed()) return;
      const emsg = resolvedMessages.readFailed || 'Failed to read file';
      updateStatus(status, emsg, '#f87171');
      notifyTicker(tickerController, emsg, 3000);
    } finally {
      ev.target.value = '';
    }
  }
  btn.addEventListener('click', onBtnClick);
  input.addEventListener('change', onInputChange);
  if (loadDefaultOnInit && defaultProfileUrl) {
    loadDefaultProfile({
      url: defaultProfileUrl,
      messages: resolvedMessages,
      statusEl: status,
      tickerController,
      state,
      stateKey,
      setState,
      isDestroyed,
    });
  }
  return {
    node,
    destroy() {
      destroyed = true;
      btn.removeEventListener('click', onBtnClick);
      input.removeEventListener('change', onInputChange);
    },
  };
}
