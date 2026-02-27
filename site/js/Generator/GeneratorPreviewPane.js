
import { notifyTicker } from '../utils/ticker.js';

const GENERATE_DOT_INTERVAL = 350;
const FLASH_AUTOHIDE_MS = 1500;
const DEFAULT_OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MUSTACHE = /\{\{\s*(\w+)\s*\}\}/g;

// renderTemplate handles this function's logic.
function renderTemplate(str, ctx) {
  return String(str || '').replace(MUSTACHE, (_, k) => (k in ctx ? String(ctx[k]) : ''));
}


// Generate With Ollama.
async function generateWithOllama(params) {
  const model = params.model;
  const opts = params.options || { temperature: 0.3 };
  const prompt = params.prompt;
  const vars = params.vars || {};
  const apiUrl = params.apiUrl || DEFAULT_OLLAMA_API_URL;
  if (!model || !prompt) throw new Error('Ollama: missing model or prompt');
  const renderedPrompt = renderTemplate(prompt, vars);
  const body = {
    model,
    prompt: renderedPrompt,
    options: opts,
    stream: true,
  };
  // Handle async work before continuing UI updates.
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    let text = '';
    try {
      text = await resp.text();
    } catch {
      // ignore
    }
    throw new Error(`Ollama HTTP ${resp.status}: ${text}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const step = await reader.read();
    if (step.done) break;
    const chunk = decoder.decode(step.value, { stream: true });
    chunk.split('\n').forEach((line) => {
      if (!line.trim()) return;
      try {
        const obj = JSON.parse(line);
        if (obj.response) out += obj.response;
      } catch {
        // ignore
      }
    });
  }
  return out.trim();
}


// Build Print HTML.
function buildPrintHTML(text) {
  // Esc.
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  const body = esc(text).replace(/\r?\n/g, '<br>');
  return (
    '<!doctype html>' +
    '<html>' +
    '<head>' +
    '  <meta charset="utf-8">' +
    '  <title>Text – PDF Preview</title>' +
    '  <style>' +
    '    @page { margin: 20mm; }' +
    '    :root {' +
    '      --text: #111;' +
    '      --font: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif;' +
    '    }' +
    '    body {' +
    '      background: #fff;' +
    '      color: var(--text);' +
    '      font-family: var(--font);' +
    '      line-height: 1.5;' +
    '      font-size: 12pt;' +
    '      margin: 0;' +
    '      padding: 20mm;' +
    '    }' +
    '    .text {' +
    '      max-width: 800px;' +
    '      margin: 0 auto;' +
    '    }' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="text">' + body + '</div>' +
    '  <script>' +
    '    window.onload = function () {' +
    '      setTimeout(function () { window.print(); }, 250);' +
    '    };' +
    '  <\\/script>' +
    '</body>' +
    '</html>'
  );
}


// Build Ctx.
function buildCtx(formRoot, checklistsRoot, snippetsRoot) {
  const ctx = {};
  if (formRoot) {
    const inputs = formRoot.querySelectorAll('input, textarea, select');
    Array.prototype.forEach.call(inputs, (inp) => {
      const key = inp.dataset.key;
      if (!key) return;
      ctx[key] = inp.value || '';
    });
  }
  const optionsMap = {};
  if (checklistsRoot) {
    const boxes = checklistsRoot.querySelectorAll('input[type="checkbox"][data-group][data-label]');
    const grouped = {};
    Array.prototype.forEach.call(boxes, (cb) => {
      const g = cb.dataset.group;
      const label = cb.dataset.label || '';
      if (!grouped[g]) grouped[g] = [];
      if (cb.checked) grouped[g].push(label);
    });
    Object.keys(grouped).forEach((slug) => {
      const joined = grouped[slug].join(', ');
      ctx[slug] = joined;
      optionsMap[slug] = joined;
    });
  }
  ctx.options_json = JSON.stringify(optionsMap);
  if (snippetsRoot) {
    const cards = snippetsRoot.querySelectorAll('.snippet-card');
    const chosen = [];
    Array.prototype.forEach.call(cards, (card) => {
      const cb = card.querySelector('input[type="checkbox"][data-role="snippet-selected"][data-subject]');
      if (!cb || !cb.checked) return;
      let subj = cb.dataset.subject || '';
      const ta = card.querySelector('textarea[data-role="snippet-text"][data-subject]');
      let text = ta ? ta.value || '' : '';
      subj = String(subj).trim();
      text = String(text).trim();
      if (!subj && !text) return;
      chosen.push({ subject: subj, text });
    });
    ctx.snippets = chosen
      .map((s) => {
        if (s.subject && s.text) return `${s.subject}: ${s.text}`;
        return s.subject || s.text;
      })
      .join('\n');
    ctx.snippets_json = JSON.stringify(chosen);
  }
  return ctx;
}


// Generate Text.
async function generateText(params) {
  const {
    state,
    stateKey,
    apiUrl,
    formRoot,
    checklistsRoot,
    snippetsRoot,
  } = params;
  const profile = state && typeof state.get === 'function' ? state.get(stateKey) || {} : {};
  const ctx = buildCtx(formRoot, checklistsRoot, snippetsRoot);
  const mode = profile.mode === 'llm' ? 'llm' : 'template';
  if (mode === 'llm' && profile.prompt && profile.ollama && profile.ollama.model) {
    return generateWithOllama({
      model: profile.ollama.model,
      options: profile.ollama.options || { temperature: 0.3 },
      prompt: profile.prompt,
      vars: ctx,
      apiUrl,
    });
  }
  if (typeof profile.template === 'string' && profile.template.trim()) {
    return renderTemplate(profile.template, ctx);
  }
  return '';
}


// Has Profile.
function hasProfile(state, stateKey) {
  if (!state) return false;
  if (typeof state.has === 'function') return !!state.has(stateKey);
  if (typeof state.get === 'function') return !!state.get(stateKey);
  return false;
}


// Build the generator preview pane with explicit state and element bindings.
export function buildGeneratorPreviewPane(options = {}) {
  const {
    state = null,
    events = null,
    stateKey = 'TEXT_PROFILE',
    tickerController = null,
    tickerMsgGenerating = 'Generating text...',
    tickerMsgComplete = 'Text ready.',
    tickerMsgError = 'Generation failed.',
    tickerMsgBusy = 'Already generating…',
    apiUrl = DEFAULT_OLLAMA_API_URL,
    formRoot = null,
    checklistsRoot = null,
    snippetsRoot = null,
    textId = 'generator-text',
    title = 'Preview',
    generateLabel = 'Generate',
    copyLabel = 'Copy',
    pdfLabel = 'Open PDF preview',
  } = options;
  const node = document.createElement('div');
  // Update DOM state so the UI reflects current data.
  node.className = 'pane-generator-preview';
  const section = document.createElement('section');
  section.className = 'pane pane--generator-preview';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = title;
  const actions = document.createElement('div');
  actions.className = 'actions';
  const btnGen = document.createElement('button');
  btnGen.className = 'primary';
  btnGen.type = 'button';
  btnGen.textContent = generateLabel;
  const btnCopy = document.createElement('button');
  btnCopy.type = 'button';
  btnCopy.textContent = copyLabel;
  const btnPdf = document.createElement('button');
  btnPdf.type = 'button';
  btnPdf.textContent = pdfLabel;
  actions.appendChild(btnGen);
  actions.appendChild(btnCopy);
  actions.appendChild(btnPdf);
  const flashDiv = document.createElement('div');
  flashDiv.id = 'preview-flash';
  const text = document.createElement('div');
  text.className = 'text';
  text.contentEditable = 'true';
  text.id = textId;
  section.appendChild(h2);
  section.appendChild(actions);
  section.appendChild(flashDiv);
  section.appendChild(text);
  node.appendChild(section);
  // Set Generate Enabled.
  function setGenerateEnabled() {
    btnGen.disabled = !hasProfile(state, stateKey);
  }
  setGenerateEnabled();
  let isGenerating = false;
  let dotTimer = null;
  let hideTimer = null;
  // Clear Preview On Profile Change.
  function clearPreviewOnProfileChange() {
    if (isGenerating) return;
    // Update DOM state so the UI reflects current data.
    text.textContent = '';
  }
  // Flash.
  function flash(msg, autoHide) {
    // Update DOM state so the UI reflects current data.
    flashDiv.textContent = msg || '';
    flashDiv.classList.add('show');
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (autoHide !== false) {
      hideTimer = setTimeout(() => {
        flashDiv.classList.remove('show');
        hideTimer = null;
      }, FLASH_AUTOHIDE_MS);
    }
  }
  // Start Dots.
  function startDots() {
    let dots = 0;
    flash('Generating', false);
    if (dotTimer) {
      clearInterval(dotTimer);
      dotTimer = null;
    }
    dotTimer = setInterval(() => {
      dots = (dots + 1) % 4;
      flash(`Generating${'.'.repeat(dots)}`, false);
    }, GENERATE_DOT_INTERVAL);
  }
  // Stop Dots.
  function stopDots(finalMsg) {
    if (dotTimer) {
      clearInterval(dotTimer);
      dotTimer = null;
    }
    flash(finalMsg || '', true);
  }
  // On Generate Click.
  function onGenerateClick() {
    if (!hasProfile(state, stateKey)) {
      flash('Load a profile first', true);
      notifyTicker(tickerController, 'Load a profile first', 2000);
      return;
    }
    if (isGenerating) {
      flash(tickerMsgBusy, true);
      notifyTicker(tickerController, tickerMsgBusy, 2000);
      return;
    }
    isGenerating = true;
    notifyTicker(tickerController, tickerMsgGenerating, 4000);
    startDots();
    generateText({
      state,
      stateKey,
      apiUrl,
      formRoot,
      checklistsRoot,
      snippetsRoot,
    })
      .then((txt) => {
        // Update DOM state so the UI reflects current data.
        text.textContent = txt || '';
        stopDots('Generation complete');
        notifyTicker(tickerController, tickerMsgComplete, 3000);
      })
      .catch(() => {
        stopDots('Error during generation');
        notifyTicker(tickerController, tickerMsgError, 3500);
      })
      .finally(() => {
        isGenerating = false;
      });
  }
  // On Copy Click.
  function onCopyClick() {
    const txt = text.textContent || '';
    if (!txt) {
      flash('Nothing to copy', true);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(txt)
        .then(() => {
          flash('Copied', true);
        })
        .catch(() => {
          flash('Clipboard error', true);
        });
    } else {
      flash('Clipboard not available', true);
    }
  }
  // On Pdf Click.
  function onPdfClick() {
    const txt = text.textContent || '';
    const html = buildPrintHTML(txt);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      flash('Popup blocked — allow popups', true);
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  }
  btnGen.addEventListener('click', onGenerateClick);
  btnCopy.addEventListener('click', onCopyClick);
  btnPdf.addEventListener('click', onPdfClick);
  let offEnable = null;
  let offState = null;
  if (events && typeof events.on === 'function') {
    offEnable = events.on(`state:changed:${stateKey}`, () => {
      setGenerateEnabled();
    });
    offState = events.on(`state:changed:${stateKey}`, () => {
      clearPreviewOnProfileChange();
    });
  }
  return {
    node,
    destroy() {
      try {
        if (dotTimer) clearInterval(dotTimer);
        if (hideTimer) clearTimeout(hideTimer);
      } catch {
        // ignore timer cleanup errors
      }
      if (typeof offState === 'function') offState();
      if (typeof offEnable === 'function') offEnable();
      btnGen.removeEventListener('click', onGenerateClick);
      btnCopy.removeEventListener('click', onCopyClick);
      btnPdf.removeEventListener('click', onPdfClick);
    },
  };
}
