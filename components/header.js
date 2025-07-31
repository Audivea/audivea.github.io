// Header component with navigation bar
function loadHeader() {
  // Get the current page path to determine active links and path structure
  const currentPath = window.location.pathname;
  
  // Determine if we're in the blog directory or root directory
  const isInBlogDir = currentPath.includes('/blog/');
  
  // Set the home and blog paths based on current location
  const homePath = isInBlogDir ? '../index.html' : './index.html';
  const blogPath = isInBlogDir ? './index.html' : './blog/index.html';
  
  // Create header element
  const header = document.createElement('header');
  
  // Determine the path to the icon based on current location
  const iconPath = isInBlogDir ? '../icon.png' : './icon.png';

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
          <a href="${blogPath}" class="nav-link ${isInBlogDir ? 'active' : ''}">Articles</a>
        </div>
      </div>
    </nav>
  `;
  
  // Insert the header at the beginning of the body
  document.body.insertBefore(header, document.body.firstChild);
}

// Load the header when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadHeader);