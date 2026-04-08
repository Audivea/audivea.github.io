// Footer component
function loadFooter() {
  const currentPath = window.location.pathname;

  // Determine depth: lab/mix-analyzer/ is 2 levels deep, articles/ is 1 level deep
  const pathParts = currentPath.replace(/\/index\.html$/, '/').split('/').filter(Boolean);
  const siteRoot = window.location.hostname.includes('github.io') ? pathParts.shift() : null;
  const depth = pathParts.length; // 0 = root, 1 = lab/, 2 = lab/mix-analyzer/
  const prefix = depth === 0 ? './' : '../'.repeat(depth);

  const productsPath = prefix + 'products/';
  const labPath = prefix + 'lab/';
  const articlesPath = prefix + 'articles/';
  const aboutPath = prefix + 'about.html';
  const contactPath = prefix + 'contact.html';

  const footer = document.createElement('footer');
  footer.className = 'social-footer';
  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-top">
        <div class="footer-brand">
          <span class="footer-logo">Audivea</span>
          <p class="footer-tagline">Dive deeper. Let your sound ascend.</p>
        </div>
        <div class="footer-right">
          <div class="footer-nav">
            <a href="${productsPath}">Products</a>
            <a href="${labPath}">Lab</a>
            <a href="${articlesPath}">Articles</a>
            <a href="${aboutPath}">About</a>
            <a href="${contactPath}">Contact</a>
          </div>
          <div class="footer-social">
            <a href="https://www.facebook.com/audivea" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://www.instagram.com/audivea" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://x.com/audivea" target="_blank" rel="noopener noreferrer" aria-label="X">
              <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://www.youtube.com/@Audivea" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; 2026 Audivea</span>
      </div>
    </div>
  `;

  document.body.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', loadFooter);
