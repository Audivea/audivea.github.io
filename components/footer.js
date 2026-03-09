// Footer component
function loadFooter() {
  const currentPath = window.location.pathname;
  const isInSubDir = currentPath.includes('/articles/') || currentPath.includes('/blog/') || currentPath.includes('/products/');

  const productsPath = isInSubDir ? '../products/' : './products/';
  const articlesPath = isInSubDir ? '../articles/' : './articles/';
  const aboutPath = isInSubDir ? '../about.html' : './about.html';

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
            <a href="${articlesPath}">Articles</a>
            <a href="${aboutPath}">About</a>
          </div>
          <div class="footer-social">
            <a href="https://www.facebook.com/audivea" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://www.instagram.com/audivea" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="mailto:audivea.official@gmail.com" aria-label="Email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </a>
          </div>
          <div class="footer-signup">
            <p>Stay updated on new tools and articles.</p>
            <form class="signup-form" action="mailto:audivea.official@gmail.com" method="POST" enctype="text/plain">
              <input type="email" name="email" placeholder="Your email address" required>
              <button type="submit">Subscribe</button>
            </form>
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
