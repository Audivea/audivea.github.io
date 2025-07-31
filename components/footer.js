// Footer component with social links
function loadFooter() {
  const footer = document.createElement('footer');
  footer.className = 'social-footer';
  footer.innerHTML = `
    <div class="footer-links">
      <a href="https://www.instagram.com/audivea/" target="_blank" class="social-link">Instagram</a>
      <span class="divider">|</span>
      <a href="https://www.facebook.com/audivea" target="_blank" class="social-link">Facebook</a>
      <span class="divider">|</span>
      <a href="mailto:audivea.official@gmail.com" class="social-link">Email</a>
    </div>
  `;
  
  // Append the footer to the body
  document.body.appendChild(footer);
}

// Load the footer when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadFooter);