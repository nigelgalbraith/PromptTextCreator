
import { createPageLifecycle } from '../core/pageLifecycle.js';
import { buildAppShell } from '../core/appShell.js';
import { createEventBus } from '../core/eventBus.js';
import { applySavedTheme, initThemeToggle } from '../utils/theme.js';
import { buildStatusTickerPane } from '../Common/StatusTickerPane.js';
import { buildProfileLoaderPane } from '../Common/ProfileLoaderPane.js';
import { buildIntroPane } from '../Common/IntroPane.js';
import { buildExportPane } from '../Common/ExportPane.js';
import '../../text/intro.js';
import { buildBuilderFormPane } from '../Builder/BuilderFormPane.js';
import { buildBuilderChecklistPane } from '../Builder/BuilderChecklistPane.js';
import { buildBuilderSnippetsPane } from '../Builder/BuilderSnippetsPane.js';
import { buildBuilderStylesPane } from '../Builder/BuilderStylesPane.js';
import { buildBuilderMetaPane } from '../Builder/BuilderMetaPane.js';

const PROFILE_STATE_KEY = 'TEXT_PROFILE';

let pageLifecycle = null;

// Destroy Page.
export function destroyPage() {
  if (!pageLifecycle) return;
  pageLifecycle.destroy();
  pageLifecycle = null;
}


// initPage handles this function's logic.
export function initPage() {
  destroyPage();
  pageLifecycle = createPageLifecycle();
  applySavedTheme();
  const app = document.getElementById('app');
  if (!app) {
    throw new Error('profilePage: missing #app root element');
  }
  const { main, loaderHost, tickerHost } = buildAppShell({
    appRoot: app,
    titleText: 'Profile Builder',
    activeNavKey: 'profile',
    includeLoaderHost: true,
  });
  const events = createEventBus();
  pageLifecycle.add(() => events.clear());
  const sharedStateStore = new Map();
  const sharedState = {
    get(key) {
      return sharedStateStore.get(String(key));
    },
    has(key) {
      return sharedStateStore.has(String(key));
    },
    set(key, value) {
      const k = String(key);
      sharedStateStore.set(k, value);
      events.emit('state:changed', { key: k, value });
      events.emit(`state:changed:${k}`, { key: k, value });
      return value;
    },
  };
  const tickerControllerRef = { current: null };
  const tickerControllerProxy = {
    showTemporary(text, ms) {
      if (tickerControllerRef.current && typeof tickerControllerRef.current.showTemporary === 'function') {
        tickerControllerRef.current.showTemporary(text, ms);
      }
    },
  };
  const tickerPane = buildStatusTickerPane({
    messagesUrl: 'data/messages.json',
    tickerId: 'profile-main',
    onController(controller) {
      tickerControllerRef.current = controller;
    },
  });
  // Update DOM state so the UI reflects current data.
  tickerHost.appendChild(tickerPane.node);
  pageLifecycle.add(() => tickerPane.destroy());
  const loaderPane = buildProfileLoaderPane({
    buttonLabel: 'Load Profile',
    accept: 'application/json',
    defaultProfileUrl: 'data/default.json',
    loadDefaultOnInit: true,
    state: sharedState,
    stateKey: PROFILE_STATE_KEY,
    tickerController: tickerControllerProxy,
  });
  if (!loaderHost) {
    throw new Error('profilePage: missing loader host');
  }
  loaderHost.appendChild(loaderPane.node);
  pageLifecycle.add(() => loaderPane.destroy());
  const introPane = buildIntroPane({ introKey: 'profile' });
  introPane.node.classList.add('intro-text');
  main.appendChild(introPane.node);
  pageLifecycle.add(() => introPane.destroy());
  const builderFormPane = buildBuilderFormPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Form Fields',
  });
  main.appendChild(builderFormPane.node);
  pageLifecycle.add(() => builderFormPane.destroy());
  const builderChecklistPane = buildBuilderChecklistPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Checklist Groups',
  });
  main.appendChild(builderChecklistPane.node);
  pageLifecycle.add(() => builderChecklistPane.destroy());
  const builderSnippetsPane = buildBuilderSnippetsPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Snippets',
  });
  main.appendChild(builderSnippetsPane.node);
  pageLifecycle.add(() => builderSnippetsPane.destroy());
  const builderStylesPane = buildBuilderStylesPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Styles',
  });
  main.appendChild(builderStylesPane.node);
  pageLifecycle.add(() => builderStylesPane.destroy());
  const builderMetaPane = buildBuilderMetaPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Profile',
  });
  main.appendChild(builderMetaPane.node);
  pageLifecycle.add(() => builderMetaPane.destroy());
  const exportPane = buildExportPane({
    title: 'Export Profile',
    filename: 'profile.json',
    buttonLabel: 'Download JSON',
    stateKey: PROFILE_STATE_KEY,
    getData: () => sharedState.get(PROFILE_STATE_KEY),
    tickerController: tickerControllerProxy,
  });
  main.appendChild(exportPane.node);
  pageLifecycle.add(() => exportPane.destroy());
  initThemeToggle();
}

initPage();
