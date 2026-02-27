

const DEFAULT_INTRO_KEY = 'main';

// resolveIntroHtml handles this function's logic.
function resolveIntroHtml(introKey) {
  const key = introKey || DEFAULT_INTRO_KEY;
  if (!window.INTRO_TEXT || !window.INTRO_TEXT[key]) {
    return '';
  }
  return window.INTRO_TEXT[key];
}


// Noop.
function noop() {}


// Build an intro pane using an explicit intro key.
export function buildIntroPane(options = {}) {
  const { introKey = DEFAULT_INTRO_KEY } = options;
  const node = document.createElement('div');
  // Update DOM state so the UI reflects current data.
  node.className = 'pane-intro-text';
  node.innerHTML = resolveIntroHtml(introKey);
  return {
    node,
    destroy: noop,
  };
}
