

const FLASH_DURATION = 1200;

// toSlug handles this function's logic.
function toSlug(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}


// Flash.
function flash(flashDiv, msg, timeout) {
  if (!flashDiv) return;
  // Update DOM state so the UI reflects current data.
  flashDiv.textContent = msg || '';
  flashDiv.classList.add('show');
  setTimeout(() => {
    flashDiv.classList.remove('show');
  }, timeout || FLASH_DURATION);
}


// Render One Group.
function renderOneGroup(group, container, defaultTitle) {
  const section = document.createElement('section');
  // Update DOM state so the UI reflects current data.
  section.className = 'pane checklist-group';
  const h2 = document.createElement('h2');
  h2.className = 'pane-title';
  h2.textContent = group.title || defaultTitle || 'Options';
  const actions = document.createElement('div');
  actions.className = 'actions';
  const btnAll = document.createElement('button');
  btnAll.className = 'mini';
  btnAll.type = 'button';
  btnAll.textContent = 'Select All';
  const btnNone = document.createElement('button');
  btnNone.className = 'mini';
  btnNone.type = 'button';
  btnNone.textContent = 'Clear';
  actions.appendChild(btnAll);
  actions.appendChild(btnNone);
  const list = document.createElement('div');
  list.className = 'checklist';
  const flashDiv = document.createElement('div');
  flashDiv.className = 'flash';
  const slug = toSlug(group.title || defaultTitle || 'options');
  // Render List.
  function renderList() {
    // Update DOM state so the UI reflects current data.
    list.innerHTML = '';
    (group.items || []).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'checkrow';
      const lab = document.createElement('label');
      lab.textContent = item.label || '';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!item.selected;
      cb.dataset.group = slug;
      cb.dataset.label = item.label || '';
      // Wire user-driven events to keep the pane reactive.
      cb.addEventListener('change', () => {
        item.selected = cb.checked;
      });
      row.appendChild(lab);
      row.appendChild(cb);
      list.appendChild(row);
    });
  }
  btnAll.addEventListener('click', () => {
    (group.items || []).forEach((i) => {
      i.selected = true;
    });
    renderList();
    flash(flashDiv, 'All selected');
  });
  btnNone.addEventListener('click', () => {
    (group.items || []).forEach((i) => {
      i.selected = false;
    });
    renderList();
    flash(flashDiv, 'Cleared');
  });
  renderList();
  section.appendChild(h2);
  section.appendChild(actions);
  section.appendChild(list);
  section.appendChild(flashDiv);
  container.appendChild(section);
}


// Render All.
function renderAll(node, profile, defaultTitle) {
  // Update DOM state so the UI reflects current data.
  node.innerHTML = '';
  const groups = Array.isArray(profile && profile.options) ? profile.options : [];
  groups.forEach((g) => {
    renderOneGroup(
      {
        title: g.title || defaultTitle || 'Options',
        items: (g.items || []).map((it) => ({
          label: it.label || '',
          selected: !!it.selected,
        })),
      },
      node,
      defaultTitle,
    );
  });
}


// Get Profile.
function getProfile(state, stateKey) {
  if (!state || typeof state.get !== 'function') return null;
  return state.get(stateKey);
}


// Build the generator checklist pane with explicit state dependencies.
export function buildGeneratorChecklistPane(options = {}) {
  const {
    state = null,
    events = null,
    stateKey = 'TEXT_PROFILE',
    defaultTitle = 'Options',
  } = options;
  const node = document.createElement('div');
  // Update DOM state so the UI reflects current data.
  node.className = 'pane-generator-checklists';
  // Rerender From State.
  function rerenderFromState() {
    const profile = getProfile(state, stateKey);
    if (!profile) {
      // Update DOM state so the UI reflects current data.
      node.innerHTML = '';
      return;
    }
    renderAll(node, profile, defaultTitle);
  }
  rerenderFromState();
  let off = null;
  if (events && typeof events.on === 'function') {
    off = events.on(`state:changed:${stateKey}`, () => {
      rerenderFromState();
    });
  }
  return {
    node,
    destroy() {
      if (typeof off === 'function') off();
    },
  };
}
