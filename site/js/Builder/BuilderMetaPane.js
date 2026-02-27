
import { DEFAULT_STATE_KEY, ensureProfileState } from '../core/profileState.js';

const FALLBACK_MODEL = 'phi3';
const FALLBACK_TEMP = 0.3;
const MODES = ['template', 'llm'];

// parseTemp handles this function's logic.
function parseTemp(raw, fallback) {
  const n = Number(raw);
  return Number.isNaN(n) ? fallback : n;
}


// Set Disabled.
function setDisabled(el, disabled) {
  el.disabled = !!disabled;
  el.classList.toggle('is-disabled', !!disabled);
}


// Render.
function render(node, state, cfg, markLocalWrite) {
  // Update DOM state so the UI reflects current data.
  node.innerHTML = '';
  const section = document.createElement('section');
  section.className = 'pane pane--builder-meta';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = cfg.title || 'Profile';
  const modeGroup = document.createElement('div');
  modeGroup.className = 'group';
  const modeLab = document.createElement('label');
  modeLab.textContent = 'Mode';
  const selMode = document.createElement('select');
  MODES.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    selMode.appendChild(opt);
  });
  modeGroup.appendChild(modeLab);
  modeGroup.appendChild(selMode);
  const modelGroup = document.createElement('div');
  modelGroup.className = 'group';
  const modelLab = document.createElement('label');
  modelLab.textContent = 'LLM Model';
  const modelInput = document.createElement('input');
  modelGroup.appendChild(modelLab);
  modelGroup.appendChild(modelInput);
  const tempGroup = document.createElement('div');
  tempGroup.className = 'group';
  const tempLab = document.createElement('label');
  tempLab.textContent = 'LLM Temperature';
  const tempInput = document.createElement('input');
  tempInput.type = 'number';
  tempInput.step = 0.05;
  tempInput.min = 0;
  tempInput.max = 1;
  tempGroup.appendChild(tempLab);
  tempGroup.appendChild(tempInput);
  const tmplLab = document.createElement('label');
  tmplLab.textContent = 'Template';
  const tmplArea = document.createElement('textarea');
  const promptLab = document.createElement('label');
  promptLab.textContent = 'Prompt';
  const promptArea = document.createElement('textarea');
  section.appendChild(h2);
  section.appendChild(modeGroup);
  section.appendChild(modelGroup);
  section.appendChild(tempGroup);
  section.appendChild(tmplLab);
  section.appendChild(tmplArea);
  section.appendChild(promptLab);
  section.appendChild(promptArea);
  node.appendChild(section);
  // Sync From DOM.
  function syncFromDOM() {
    const st = ensureProfileState(state, cfg.stateKey);
    st.mode = selMode.value === 'llm' ? 'llm' : 'template';
    const isLLM = st.mode === 'llm';
    st.template = tmplArea.value || '';
    st.prompt = promptArea.value || '';
    st.ollama = isLLM
      ? {
          model: modelInput.value || cfg.defaultModel,
          options: { temperature: parseTemp(tempInput.value, cfg.defaultTemp) },
        }
      : null;
    setDisabled(tmplArea, isLLM);
    setDisabled(promptArea, !isLLM);
    setDisabled(modelInput, !isLLM);
    setDisabled(tempInput, !isLLM);
    markLocalWrite();
    // Mutate shared state so dependent panes stay in sync.
    state.set(cfg.stateKey, st);
  }
  const st0 = ensureProfileState(state, cfg.stateKey);
  selMode.value = st0.mode === 'llm' ? 'llm' : 'template';
  const stModel = st0.ollama && st0.ollama.model;
  const stTemp =
    st0.ollama && st0.ollama.options && typeof st0.ollama.options.temperature === 'number'
      ? st0.ollama.options.temperature
      : null;
  modelInput.value = stModel || cfg.defaultModel;
  tempInput.value = stTemp != null ? stTemp : cfg.defaultTemp;
  tmplArea.value = st0.template || '';
  promptArea.value = st0.prompt || '';
  selMode.addEventListener('change', syncFromDOM);
  modelInput.addEventListener('input', syncFromDOM);
  tempInput.addEventListener('input', syncFromDOM);
  tmplArea.addEventListener('input', syncFromDOM);
  promptArea.addEventListener('input', syncFromDOM);
  syncFromDOM();
}


// Build the builder meta pane with explicit state dependencies.
export function buildBuilderMetaPane(options = {}) {
  const {
    state,
    events = null,
    stateKey = DEFAULT_STATE_KEY,
    title = 'Profile',
    defaultModel = FALLBACK_MODEL,
    defaultTemp = FALLBACK_TEMP,
  } = options;
  if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') {
    throw new Error('BuilderMetaPane: missing state adapter');
  }
  const node = document.createElement('div');
  // Update DOM state so the UI reflects current data.
  node.className = 'pane-builder-meta';
  const cfg = {
    stateKey,
    title,
    defaultModel,
    defaultTemp: parseTemp(defaultTemp, FALLBACK_TEMP),
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
