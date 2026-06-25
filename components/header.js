// Header component — Instrument (v2) navigation bar
function loadHeader() {
  const currentPath = window.location.pathname;

  const isInArticlesDir = currentPath.includes('/articles/') || currentPath.includes('/blog/');
  const isInPluginsDir = currentPath.includes('/products/');
  const isInLabDir = currentPath.includes('/lab/');
  const isAboutPage = currentPath.endsWith('/about.html') || currentPath.endsWith('/about');
  const isContactPage = currentPath.endsWith('/contact.html') || currentPath.endsWith('/contact');

  // Determine depth so relative links resolve from any directory level.
  const pathParts = currentPath.replace(/\/index\.html$/, '/').split('/').filter(Boolean);
  if (window.location.hostname.includes('github.io')) pathParts.shift();
  const depth = pathParts.length; // 0 = root, 1 = lab/, 2 = lab/mix-analyzer/
  const prefix = depth === 0 ? './' : '../'.repeat(depth);

  const homePath = prefix;
  const productsPath = prefix + 'products/';
  const labPath = prefix + 'lab/';
  const articlesPath = prefix + 'articles/';
  const aboutPath = prefix + 'about.html';
  const contactPath = prefix + 'contact.html';
  const iconPath = prefix + 'icon.webp';

  const act = (on) => on ? ' active' : '';

  const header = document.createElement('header');
  header.className = 'site';
  header.innerHTML = `
    <div class="wrap nav">
      <a class="wordmark" href="${homePath}" aria-label="Audivea home">
        <img src="${iconPath}" alt="Audivea" class="wordmark-icon">
        <span class="wordmark-text">
          <span class="wordmark-name">Audivea</span>
          <span class="wordmark-slogan">Dive deeper, let your sound ascend.</span>
        </span>
      </a>
      <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="nav-menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <nav class="navlinks" id="nav-menu" aria-label="Primary">
        <a href="${productsPath}" class="nav-link${act(isInPluginsDir)}">Products</a>
        <a href="${labPath}" class="nav-link${act(isInLabDir)}">Lab</a>
        <a href="${articlesPath}" class="nav-link${act(isInArticlesDir)}">Articles</a>
        <a href="${aboutPath}" class="nav-link${act(isAboutPage)}">About</a>
        <a href="${contactPath}" class="nav-link${act(isContactPage)}">Contact</a>
      </nav>
    </div>
  `;

  document.body.insertBefore(header, document.body.firstChild);

  const toggle = header.querySelector('.nav-toggle');
  const navLinks = header.querySelector('.navlinks');
  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });
  navLinks.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

document.addEventListener('DOMContentLoaded', loadHeader);
