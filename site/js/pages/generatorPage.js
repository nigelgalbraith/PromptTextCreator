
import { createPageLifecycle } from '../core/pageLifecycle.js';
import { buildAppShell } from '../core/appShell.js';
import { createEventBus } from '../core/eventBus.js';
import { applySavedTheme, initThemeToggle } from '../utils/theme.js';
import { buildStatusTickerPane } from '../Common/StatusTickerPane.js';
import { buildIntroPane } from '../Common/IntroPane.js';
import { buildExportPane } from '../Common/ExportPane.js';
import '../../text/intro.js';
import { buildGeneratorFormPane } from '../Generator/GeneratorFormPane.js';
import { buildGeneratorChecklistPane } from '../Generator/GeneratorChecklistPane.js';
import { buildGeneratorSnippetsPane } from '../Generator/GeneratorSnippetsPane.js';
import { buildGeneratorPreviewPane } from '../Generator/GeneratorPreviewPane.js';
import { buildGeneratorPiperPane } from '../Generator/GeneratorPiperPane.js';
import { buildProfileLoaderPane } from '../Common/ProfileLoaderPane.js';

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
    throw new Error('generatorPage: missing #app root element');
  }
  const { main, tickerHost, profileLoaderWrapper } = buildAppShell({
    appRoot: app,
    titleText: 'Text Generator',
    activeNavKey: 'generator',
    includeLoaderHost: false,
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
  // Build + mount Profile Loader above the ticker (so the button is visible)
  const profileLoaderPane = buildProfileLoaderPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    defaultUrl: 'data/default.json',
    tickerController: tickerControllerProxy,
    title: 'Profile',
    buttonLabel: 'Load Profile',
  });
  profileLoaderWrapper.insertBefore(profileLoaderPane.node, tickerHost);
  pageLifecycle.add(() => profileLoaderPane.destroy());
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
  const introPane = buildIntroPane({ introKey: 'main' });
  introPane.node.classList.add('intro-text');
  main.appendChild(introPane.node);
  pageLifecycle.add(() => introPane.destroy());
  const generatorFormPane = buildGeneratorFormPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    title: 'Details',
    defaultStyles: ['Professional', 'Friendly', 'Direct', 'Concise'],
  });
  main.appendChild(generatorFormPane.node);
  pageLifecycle.add(() => generatorFormPane.destroy());
  const generatorChecklistPane = buildGeneratorChecklistPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    defaultTitle: 'Options',
  });
  main.appendChild(generatorChecklistPane.node);
  pageLifecycle.add(() => generatorChecklistPane.destroy());
  const generatorSnippetsPane = buildGeneratorSnippetsPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    defaultTitle: 'Snippets',
  });
  main.appendChild(generatorSnippetsPane.node);
  pageLifecycle.add(() => generatorSnippetsPane.destroy());
  const generatorPreviewPane = buildGeneratorPreviewPane({
    state: sharedState,
    events,
    stateKey: PROFILE_STATE_KEY,
    tickerController: tickerControllerProxy,
    apiUrl: 'http://localhost:11434/api/generate',
    formRoot: generatorFormPane.node,
    checklistsRoot: generatorChecklistPane.node,
    snippetsRoot: generatorSnippetsPane.node,
    textId: 'generator-text',
    title: 'Preview',
    generateLabel: 'Generate',
    copyLabel: 'Copy',
    pdfLabel: 'Open PDF preview',
  });
  main.appendChild(generatorPreviewPane.node);
  pageLifecycle.add(() => generatorPreviewPane.destroy());
  const previewTextNode = generatorPreviewPane.node.querySelector('#generator-text');
  const generatorPiperPane = buildGeneratorPiperPane({
    piperBase: '/piper',
    voiceId: 'en_US-amy-low',
    targetElement: previewTextNode,
    tickerController: tickerControllerProxy,
    title: 'Voice (Piper)',
  });
  main.appendChild(generatorPiperPane.node);
  pageLifecycle.add(() => generatorPiperPane.destroy());
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
