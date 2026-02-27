
import { notifyTicker } from '../utils/ticker.js';
import { button, clear, el } from '../utils/dom.js';

const FLASH_DURATION_MS = 5000;
const DEFAULT_STATE_KEY = 'TEXT_PROFILE';

// flash handles this function's logic.
function flash(flashEl, msg) {
  // Update DOM state so the UI reflects current data.
  flashEl.textContent = msg || '';
  flashEl.classList.add('show');
  setTimeout(() => {
    flashEl.classList.remove('show');
    flashEl.textContent = '';
  }, FLASH_DURATION_MS);
}


// Resolve Data.
function resolveData({ getData, data, state, stateKey }) {
  if (typeof getData === 'function') {
    return getData();
  }
  if (typeof data !== 'undefined') {
    return data;
  }
  if (state && typeof state.get === 'function') {
    return state.get(stateKey);
  }
  return null;
}


// Download Json.
function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // Update DOM state so the UI reflects current data.
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}


// On Export Click.
function onExportClick(config) {
  const {
    getData,
    data,
    state,
    stateKey,
    filename,
    msgExportEmpty,
    msgExportSaved,
    flashEl,
    tickerController,
  } = config;
  const obj = resolveData({ getData, data, state, stateKey });
  if (!obj) {
    flash(flashEl, msgExportEmpty);
    notifyTicker(tickerController, msgExportEmpty, FLASH_DURATION_MS);
    return;
  }
  downloadJson(obj, filename);
  const msg = String(msgExportSaved).replace('{filename}', filename);
  flash(flashEl, msg);
  notifyTicker(tickerController, msg, FLASH_DURATION_MS);
}


// Build an export pane with explicit data and ticker bindings.
export function buildExportPane(options = {}) {
  const {
    title = 'Export',
    filename = 'profile.json',
    buttonLabel = 'Download JSON',
    msgExportEmpty = 'Nothing to export',
    msgExportSaved = 'Saved {filename}',
    getData,
    data,
    state = null,
    stateKey = DEFAULT_STATE_KEY,
    tickerController = null,
  } = options;
  const node = el('div', { className: 'pane-builder-export' });
  clear(node);
  const section = el('section', { className: 'pane pane--builder-export' });
  const h2 = el('h2', { className: 'pane-title', text: title });
  const actions = el('div', { className: 'actions' });
  const btn = button({ className: 'primary', text: buttonLabel });
  const flashDiv = el('div', { className: 'flash' });
  // Update DOM state so the UI reflects current data.
  actions.appendChild(btn);
  section.appendChild(h2);
  section.appendChild(actions);
  section.appendChild(flashDiv);
  node.appendChild(section);
  // Click Handler.
  const clickHandler = () => {
    onExportClick({
      getData,
      data,
      state,
      stateKey,
      filename,
      msgExportEmpty,
      msgExportSaved,
      flashEl: flashDiv,
      tickerController,
    });
  };
  btn.addEventListener('click', clickHandler);
  return {
    node,
    destroy() {
      btn.removeEventListener('click', clickHandler);
    },
  };
}
