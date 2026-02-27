
import { DEFAULT_STATE_KEY, ensureProfileState } from '../core/profileState.js';
import { parseCsvOrArray } from '../utils/parse.js';

const FALLBACK_STYLES = ['Professional', 'Friendly', 'Direct', 'Concise'];

// setStyles handles this function's logic.
function setStyles(state, stateKey, styles) {
  const st = ensureProfileState(state, stateKey);
  st.styles = Array.isArray(styles) ? styles : [];
  // Mutate shared state so dependent panes stay in sync.
  state.set(stateKey, st);
}


// Render.
function render(node, state, cfg, markLocalWrite) {
  // Update DOM state so the UI reflects current data.
  node.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'pane pane--builder-styles';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = cfg.title || 'Styles';
  const rowsWrap = document.createElement('div');
  rowsWrap.className = 'builder-styles-rows';
  const btnAdd = document.createElement('button');
  btnAdd.className = 'mini';
  btnAdd.type = 'button';
  btnAdd.textContent = '+ Add Style';
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.appendChild(btnAdd);
  section.appendChild(h2);
  section.appendChild(rowsWrap);
  section.appendChild(actions);
  node.appendChild(section);
  // Read Styles From DOM.
  function readStylesFromDOM() {
    const inputs = rowsWrap.querySelectorAll('input[data-role="style"]');
    return Array.prototype.map
      .call(inputs, (i) => String(i.value || '').trim())
      .filter(Boolean);
  }
  // Commit DOMTo State.
  function commitDOMToState() {
    markLocalWrite();
    setStyles(state, cfg.stateKey, readStylesFromDOM());
  }
  // Add Style Row.
  function addStyleRow(value) {
    const row = document.createElement('div');
    // Update DOM state so the UI reflects current data.
    row.className = 'group builder-style-row';
    const lab = document.createElement('label');
    lab.textContent = 'Style';
    const input = document.createElement('input');
    input.placeholder = 'e.g., Professional';
    input.value = value || '';
    input.dataset.role = 'style';
    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'mini danger';
    btnRemove.textContent = '×';
    // Wire user-driven events to keep the pane reactive.
    input.addEventListener('input', commitDOMToState);
    btnRemove.addEventListener('click', () => {
      row.remove();
      commitDOMToState();
    });
    row.appendChild(lab);
    row.appendChild(input);
    row.appendChild(btnRemove);
    rowsWrap.appendChild(row);
  }
  const st = ensureProfileState(state, cfg.stateKey);
  let existing = Array.isArray(st.styles) && st.styles.length ? st.styles : cfg.defaultStyles;
  if (!existing.length) existing = FALLBACK_STYLES.slice();
  existing.forEach((s) => {
    addStyleRow(s);
  });
  if (!st.styles || !st.styles.length) {
    commitDOMToState();
  }
  btnAdd.addEventListener('click', () => {
    addStyleRow('');
    commitDOMToState();
  });
}


// Build the builder styles pane with explicit state dependencies.
export function buildBuilderStylesPane(options = {}) {
  const {
    state,
    events = null,
    stateKey = DEFAULT_STATE_KEY,
    title = 'Styles',
    defaultStyles = FALLBACK_STYLES,
  } = options;
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') {
    throw new Error('BuilderStylesPane: missing state adapter');
  }
  const node = document.createElement('div');
  // Update DOM state so the UI reflects current data.
  node.className = 'pane-builder-styles';
  const cfg = {
    stateKey,
    title,
    defaultStyles: parseCsvOrArray(defaultStyles, FALLBACK_STYLES),
  };
  let ignoreNext = false;
  // Mark Local Write.
  function markLocalWrite() {
    ignoreNext = true;
    setTimeout(() => {
      ignoreNext = false;
    }, 0);
  }
  render(node, state, cfg, markLocalWrite);
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      if (ignoreNext) return;
      render(node, state, cfg, markLocalWrite);
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
    },
  };
}
