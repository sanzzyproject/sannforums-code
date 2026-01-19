// API Base URL
const API_BASE = '/api';

// DOM Elements
const alertBox = document.getElementById('alert');
const loadingIndicator = document.getElementById('loading');

// Utility Functions
function showAlert(message, type = 'success') {
  if (!alertBox) return;
  
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.add('show');
  
  setTimeout(() => {
    alertBox.classList.remove('show');
  }, 5000);
}

function showLoading() {
  if (loadingIndicator) {
    loadingIndicator.style.display = 'flex';
  }
}

function hideLoading() {
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

// Copy to Clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showAlert('Copied to clipboard!', 'success');
  }).catch(err => {
    showAlert('Failed to copy: ' + err, 'error');
  });
}

// Syntax Highlighting (Basic JavaScript-only)
function highlightCode(code, language) {
  if (language.toLowerCase() !== 'javascript' && language.toLowerCase() !== 'js') {
    return code;
  }

  const keywords = [
    'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return',
    'class', 'export', 'import', 'default', 'from', 'async', 'await', 'try',
    'catch', 'finally', 'throw', 'new', 'this', 'typeof', 'instanceof', 'in',
    'of', 'switch', 'case', 'break', 'continue', 'true', 'false', 'null',
    'undefined', 'NaN', 'Infinity'
  ];

  const patterns = [
    {
      regex: /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g,
      className: 'string'
    },
    {
      regex: /\b(\d+\.?\d*)\b/g,
      className: 'number'
    },
    {
      regex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      className: 'comment'
    }
  ];

  let highlighted = code;
  
  // Highlight keywords
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    highlighted = highlighted.replace(regex, `<span class="hl-keyword">${keyword}</span>`);
  });
  
  // Highlight patterns
  patterns.forEach(pattern => {
    highlighted = highlighted.replace(pattern.regex, `<span class="hl-${pattern.className}">$1</span>`);
  });
  
  return highlighted;
}

// Format Date
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Code Display Page
if (window.location.pathname.includes('code.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeId = urlParams.get('id');
    
    if (!codeId) {
      showAlert('No code ID provided', 'error');
      return;
    }
    
    try {
      showLoading();
      
      // Get code data
      const response = await fetch(`${API_BASE}/code/${codeId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load code');
      }
      
      const { snippet, code, stats } = data;
      
      // Update page title
      document.title = `${snippet.title} - SannForums Code`;
      
      // Update metadata for SEO
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', snippet.title);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', snippet.description);
      
      // Display snippet info
      const titleElement = document.getElementById('code-title');
      const languageElement = document.getElementById('code-language');
      const descriptionElement = document.getElementById('code-description');
      const createdAtElement = document.getElementById('code-created');
      const updatedAtElement = document.getElementById('code-updated');
      
      if (titleElement) titleElement.textContent = snippet.title;
      if (languageElement) {
        languageElement.textContent = snippet.language;
        languageElement.classList.add('code-language');
      }
      if (descriptionElement) descriptionElement.textContent = snippet.description || 'No description';
      if (createdAtElement) createdAtElement.textContent = formatDate(snippet.createdAt);
      if (updatedAtElement) updatedAtElement.textContent = formatDate(snippet.updatedAt);
      
      // Display code with highlighting
      const codeElement = document.getElementById('code-content');
      if (codeElement) {
        codeElement.innerHTML = highlightCode(escapeHtml(code), snippet.language);
      }
      
      // Display stats
      const viewsElement = document.getElementById('views-count');
      const copiesElement = document.getElementById('copies-count');
      
      if (viewsElement) viewsElement.textContent = stats.views || 0;
      if (copiesElement) copiesElement.textContent = stats.copies || 0;
      
      // Copy button
      const copyBtn = document.getElementById('copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          copyToClipboard(code);
          
          // Track copy
          await fetch(`${API_BASE}/stats/copy/${codeId}`, {
            method: 'POST'
          });
          
          // Update stats display
          if (copiesElement) {
            const current = parseInt(copiesElement.textContent) || 0;
            copiesElement.textContent = current + 1;
          }
        });
      }
      
      // Track view
      await fetch(`${API_BASE}/stats/view/${codeId}`, {
        method: 'POST'
      });
      
      // Update views display
      if (viewsElement) {
        const current = parseInt(viewsElement.textContent) || 0;
        viewsElement.textContent = current + 1;
      }
      
    } catch (error) {
      showAlert('Error loading code: ' + error.message, 'error');
      console.error(error);
    } finally {
      hideLoading();
    }
  });
}

// Admin Panel
if (window.location.pathname.includes('admin.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    const adminKeyInput = document.getElementById('admin-key');
    const loginBtn = document.getElementById('login-btn');
    const adminPanel = document.getElementById('admin-panel');
    const snippetsList = document.getElementById('snippets-list');
    const snippetForm = document.getElementById('snippet-form');
    const formTitle = document.getElementById('form-title');
    const snippetIdInput = document.getElementById('snippet-id');
    const deleteBtn = document.getElementById('delete-btn');
    
    let isAuthenticated = false;
    let adminKey = '';
    let snippets = [];
    let isEditing = false;
    
    // Login
    loginBtn?.addEventListener('click', async () => {
      const key = adminKeyInput?.value.trim();
      
      if (!key) {
        showAlert('Please enter admin key', 'error');
        return;
      }
      
      adminKey = key;
      isAuthenticated = true;
      
            // Show admin panel
      if (adminPanel) {
        adminPanel.style.display = 'block';
        adminKeyInput.parentElement.style.display = 'none';
        showAlert('Admin login successful', 'success');
        
        // Load snippets
        await loadSnippets();
      }
    });
    
    // Load all snippets
    async function loadSnippets() {
      try {
        showLoading();
        
        // In a real implementation, you'd need to list all snippet files
        // For simplicity, we'll assume you maintain an index file
        // For now, we'll create a placeholder message
        if (snippetsList) {
          snippetsList.innerHTML = '<p>Loading snippets...</p>';
        }
        
        // Note: GitHub API doesn't easily allow listing all files in a folder
        // without additional setup. You might need to maintain an index.json
        // or use GitHub Search API
        
        showAlert('Admin panel loaded', 'success');
      } catch (error) {
        showAlert('Failed to load snippets: ' + error.message, 'error');
      } finally {
        hideLoading();
      }
    }
    
    // Create/Update snippet
    snippetForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const title = document.getElementById('title').value;
      const language = document.getElementById('language').value;
      const description = document.getElementById('description').value;
      const code = document.getElementById('code').value;
      const snippetId = snippetIdInput?.value;
      
      if (!title || !language || !code) {
        showAlert('Please fill in all required fields', 'error');
        return;
      }
      
      try {
        showLoading();
        
        const payload = {
          title,
          language,
          description,
          code
        };
        
        if (isEditing && snippetId) {
          // Update existing
          payload.id = snippetId;
          
          const response = await fetch(`${API_BASE}/admin/update`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Key': adminKey
            },
            body: JSON.stringify(payload)
          });
          
          const data = await response.json();
          
          if (data.success) {
            showAlert('Snippet updated successfully', 'success');
            resetForm();
            await loadSnippets();
          } else {
            throw new Error(data.error);
          }
        } else {
          // Create new
          const response = await fetch(`${API_BASE}/admin/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Key': adminKey
            },
            body: JSON.stringify(payload)
          });
          
          const data = await response.json();
          
          if (data.success) {
            showAlert(`Snippet created! Share URL: ${data.url}`, 'success');
            resetForm();
            await loadSnippets();
          } else {
            throw new Error(data.error);
          }
        }
      } catch (error) {
        showAlert('Error: ' + error.message, 'error');
      } finally {
        hideLoading();
      }
    });
    
    // Delete snippet
    deleteBtn?.addEventListener('click', async () => {
      const snippetId = snippetIdInput?.value;
      
      if (!snippetId) {
        showAlert('No snippet selected to delete', 'error');
        return;
      }
      
      if (!confirm('Are you sure you want to delete this snippet? This action cannot be undone.')) {
        return;
      }
      
      try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/admin/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': adminKey
          },
          body: JSON.stringify({ id: snippetId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          showAlert('Snippet deleted successfully', 'success');
          resetForm();
          await loadSnippets();
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        showAlert('Error: ' + error.message, 'error');
      } finally {
        hideLoading();
      }
    });
    
    // Reset form
    function resetForm() {
      if (snippetForm) snippetForm.reset();
      if (formTitle) formTitle.textContent = 'Create New Snippet';
      if (deleteBtn) deleteBtn.style.display = 'none';
      if (snippetIdInput) snippetIdInput.value = '';
      isEditing = false;
    }
    
    // Edit snippet
    function editSnippet(snippet) {
      isEditing = true;
      
      document.getElementById('title').value = snippet.title;
      document.getElementById('language').value = snippet.language;
      document.getElementById('description').value = snippet.description || '';
      
      // Load code content
      loadCodeContent(snippet.id).then(code => {
        document.getElementById('code').value = code;
      });
      
      if (formTitle) formTitle.textContent = 'Edit Snippet';
      if (deleteBtn) deleteBtn.style.display = 'inline-flex';
      if (snippetIdInput) snippetIdInput.value = snippet.id;
      
      // Scroll to form
      snippetForm?.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Load code content
    async function loadCodeContent(id) {
      try {
        const response = await fetch(`${API_BASE}/code/${id}`);
        const data = await response.json();
        
        if (data.success) {
          return data.code;
        }
      } catch (error) {
        console.error('Failed to load code:', error);
        return '';
      }
    }
  });
}

// Home Page
if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    // Add any home page specific functionality here
    console.log('Home page loaded');
    
    // Example: Create new snippet button for admin
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
      });
    }
  });
}

// Escape HTML function (missing from previous code)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Add CSS for syntax highlighting
const style = document.createElement('style');
style.textContent = `
  .hl-keyword { color: #d73a49; font-weight: bold; }
  .hl-string { color: #032f62; }
  .hl-number { color: #005cc5; }
  .hl-comment { color: #6a737d; font-style: italic; }
`;
document.head.appendChild(style);
