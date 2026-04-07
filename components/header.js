// Header component with navigation bar
function loadHeader() {
  const currentPath = window.location.pathname;

  const isInArticlesDir = currentPath.includes('/articles/') || currentPath.includes('/blog/');
  const isInPluginsDir = currentPath.includes('/products/');
  const isInLabDir = currentPath.includes('/lab/');
  const isAboutPage = currentPath.endsWith('/about.html') || currentPath.endsWith('/about');
  const isContactPage = currentPath.endsWith('/contact.html') || currentPath.endsWith('/contact');

  // Determine depth: lab/mix-analyzer/ is 2 levels deep, articles/ is 1 level deep
  const pathParts = currentPath.replace(/\/index\.html$/, '/').split('/').filter(Boolean);
  const siteRoot = window.location.hostname.includes('github.io') ? pathParts.shift() : null;
  const depth = pathParts.length; // 0 = root, 1 = lab/, 2 = lab/mix-analyzer/
  const prefix = depth === 0 ? './' : '../'.repeat(depth);

  const isHome = !isInArticlesDir && !isInPluginsDir && !isInLabDir && !isAboutPage && !isContactPage;

  const homePath = prefix;
  const articlesPath = prefix + 'articles/';
  const pluginsPath = prefix + 'products/';
  const labPath = prefix + 'lab/';
  const aboutPath = prefix + 'about.html';
  const contactPath = prefix + 'contact.html';

  const header = document.createElement('header');

  const iconPath = prefix + 'icon.webp';

  header.innerHTML = `
    <nav>
      <div class="nav-container">
        <div class="nav-brand">
          <div class="brand-top">
            <img src="${iconPath}" alt="Audivea Icon" class="nav-icon">
            <a href="${homePath}" class="nav-logo">Audivea</a>
          </div>
          <span class="nav-slogan">Dive deeper, let your sound ascend.</span>
        </div>
        <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="nav-links">
          <a href="${homePath}" class="nav-link ${isHome ? 'active' : ''}">Home</a>
          <a href="${pluginsPath}" class="nav-link ${isInPluginsDir ? 'active' : ''}">Products</a>
          <a href="${labPath}" class="nav-link ${isInLabDir ? 'active' : ''}">Lab</a>
          <a href="${articlesPath}" class="nav-link ${isInArticlesDir ? 'active' : ''}">Articles</a>
          <a href="${aboutPath}" class="nav-link ${isAboutPage ? 'active' : ''}">About</a>
          <a href="${contactPath}" class="nav-link ${isContactPage ? 'active' : ''}">Contact</a>
        </div>
      </div>
    </nav>
  `;

  document.body.insertBefore(header, document.body.firstChild);

  // Hamburger menu toggle
  const toggle = header.querySelector('.nav-toggle');
  const navLinks = header.querySelector('.nav-links');
  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when a link is clicked
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

document.addEventListener('DOMContentLoaded', loadHeader);
