
const NAV_ITEMS = [
  { key: 'generator', href: 'index.html', label: 'Generator' },
  { key: 'profile', href: 'profile.html', label: 'Profile Builder' },
];

// Build the shared app shell for generator/profile pages.
export function buildAppShell(config = {}) {
  const {
    appRoot,
    titleText,
    activeNavKey,
    includeLoaderHost = false,
  } = config;
  if (!appRoot) {
    throw new Error('buildAppShell: missing appRoot');
  }
  const appNode = document.createElement('div');
  // Update DOM state so the UI reflects current data.
  appNode.className = 'app';
  const header = document.createElement('header');
  header.className = 'header-centered';
  const title = document.createElement('h1');
  title.textContent = titleText || '';
  const themeToggleWrapper = document.createElement('div');
  themeToggleWrapper.className = 'theme-toggle-wrapper';
  const themeButton = document.createElement('button');
  themeButton.className = 'theme-toggle';
  themeButton.type = 'button';
  themeButton.setAttribute('aria-label', 'Toggle light/dark mode');
  themeButton.setAttribute('aria-pressed', 'false');
  themeButton.title = 'Toggle light/dark mode';
  const themeIcon = document.createElement('span');
  themeIcon.className = 'theme-toggle-icon';
  themeIcon.setAttribute('aria-hidden', 'true');
  themeIcon.textContent = '☾';
  const themeText = document.createElement('span');
  themeText.className = 'theme-toggle-text';
  themeText.textContent = 'Theme';
  themeButton.appendChild(themeIcon);
  themeButton.appendChild(themeText);
  themeToggleWrapper.appendChild(themeButton);
  const nav = document.createElement('nav');
  nav.className = 'nav';
  const navLinks = document.createElement('div');
  navLinks.className = 'nav-links';
  const navLinkNodes = {};
  NAV_ITEMS.forEach((item) => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    if (item.key === activeNavKey) {
      link.setAttribute('aria-current', 'page');
    }
    navLinks.appendChild(link);
    navLinkNodes[item.key] = link;
  });
  nav.appendChild(navLinks);
  const profileLoaderWrapper = document.createElement('div');
  profileLoaderWrapper.className = 'profile-loader-wrapper';
  const loaderHost = includeLoaderHost ? document.createElement('div') : null;
  if (loaderHost) {
    profileLoaderWrapper.appendChild(loaderHost);
  }
  const tickerHost = document.createElement('div');
  tickerHost.className = 'profile-loader-ticker';
  profileLoaderWrapper.appendChild(tickerHost);
  const main = document.createElement('main');
  main.className = 'split';
  main.id = 'root';
  header.appendChild(title);
  header.appendChild(themeToggleWrapper);
  header.appendChild(nav);
  header.appendChild(profileLoaderWrapper);
  appNode.appendChild(header);
  appNode.appendChild(main);
  appRoot.replaceChildren(appNode);
  return {
    appNode,
    header,
    main,
    navLinks: navLinkNodes,
    profileLoaderWrapper,
    loaderHost,
    tickerHost,
    themeButton,
  };
}
