// Header component with navigation bar
function loadHeader() {
  // Get the current page path to determine active links and path structure
  const currentPath = window.location.pathname;
  
  // Determine if we're in a subdirectory
  const isInArticlesDir = currentPath.includes('/articles/') || currentPath.includes('/blog/');
  const isInPluginsDir = currentPath.includes('/products/');
  const isInSubDir = isInArticlesDir || isInPluginsDir;

  // Set paths based on current location
  const homePath = isInSubDir ? '../index.html' : './index.html';
  const articlesPath = isInSubDir ? '../articles/index.html' : './articles/index.html';
  const pluginsPath = isInSubDir ? '../products/index.html' : './products/index.html';
  
  // Create header element
  const header = document.createElement('header');
  
  // Determine the path to the icon based on current location
  const iconPath = isInSubDir ? '../icon.png' : './icon.png';

  // Set the HTML content with relative paths
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
        <div class="nav-links">
          <a href="${pluginsPath}" class="nav-link ${isInPluginsDir ? 'active' : ''}">Products</a>
          <a href="${articlesPath}" class="nav-link ${isInArticlesDir ? 'active' : ''}">Articles</a>
        </div>
      </div>
    </nav>
  `;
  
  // Insert the header at the beginning of the body
  document.body.insertBefore(header, document.body.firstChild);
}

// Load the header when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadHeader);