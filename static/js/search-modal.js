// Search Modal with Fuse.js (lazy-loaded)
(function() {
  'use strict';

  let fuse = null;
  let searchData = null;
  let currentFocus = -1;
  let fuseLoaded = false;

  // DOM Elements
  const modal = document.getElementById('search-modal');
  const searchBtn = document.getElementById('search-btn');
  const closeBtn = document.getElementById('search-close');
  const overlay = modal?.querySelector('.search-modal-overlay');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const emptyMsg = document.getElementById('search-empty');

  if (!modal || !searchBtn) return;

  // Fuse.js options
  const fuseOptions = {
    isCaseSensitive: false,
    shouldSort: true,
    threshold: 0.4,
    distance: 1000,
    minMatchCharLength: 2,
    keys: ['title', 'summary', 'content', 'tags']
  };

  // Load Fuse.js dynamically
  function loadFuseJs() {
    if (fuseLoaded || typeof Fuse !== 'undefined') {
      fuseLoaded = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
      script.integrity = 'sha256-mFHW+hOJ8mKl/tiRS1IjY0mGQnEu6oTDYiFoZEYvpaI=';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        fuseLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Load search index
  function loadSearchIndex() {
    if (searchData) return Promise.resolve();

    // Get base URL from modal data attribute (set by Hugo)
    const baseUrl = modal.dataset.baseUrl || window.location.origin + '/blog/';
    const indexUrl = baseUrl.replace(/\/$/, '') + '/index.json';

    return loadFuseJs()
      .then(() => fetch(indexUrl))
      .then(res => res.json())
      .then(data => {
        searchData = data;
        fuse = new Fuse(data, fuseOptions);
      })
      .catch(err => console.error('Failed to load search:', err));
  }

  // Open modal
  function openModal() {
    loadSearchIndex().then(() => {
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('search-open');
      input.focus();
    });
  }

  // Close modal
  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('search-open');
    input.value = '';
    results.innerHTML = '';
    emptyMsg.style.display = 'none';
    currentFocus = -1;
  }

  // Check if query is a tag search (e.g., "AIL-1", "Go", etc.)
  function isTagSearch(query) {
    // AIL-X pattern or short uppercase/mixed case words
    return /^AIL-\d+$/i.test(query) || (query.length <= 15 && !query.includes(' '));
  }

  // Filter results by exact tag match
  function filterByExactTag(items, tagQuery) {
    const normalizedQuery = tagQuery.toLowerCase();
    return items.filter(item => {
      const tags = item.tags || [];
      return tags.some(tag => tag.toLowerCase() === normalizedQuery);
    });
  }

  // Perform search
  function performSearch(query) {
    if (!fuse || !query.trim()) {
      results.innerHTML = '';
      emptyMsg.style.display = 'none';
      return;
    }

    const trimmedQuery = query.trim();
    let searchResults;

    // For tag-like queries, try exact tag match first
    if (isTagSearch(trimmedQuery)) {
      const exactMatches = filterByExactTag(searchData, trimmedQuery);
      if (exactMatches.length > 0) {
        searchResults = exactMatches.map(item => ({ item }));
      } else {
        // Fall back to fuzzy search
        searchResults = fuse.search(trimmedQuery, { limit: 10 });
      }
    } else {
      searchResults = fuse.search(trimmedQuery, { limit: 10 });
    }

    if (searchResults.length === 0) {
      results.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }

    emptyMsg.style.display = 'none';
    currentFocus = -1;

    const html = searchResults.map((result, index) => {
      const item = result.item;
      const summary = item.summary || '';
      return `
        <li class="search-result-item" data-index="${index}">
          <a href="${item.permalink}">
            <div class="search-result-title">${escapeHtml(item.title)}</div>
            ${summary ? `<div class="search-result-summary">${escapeHtml(summary)}</div>` : ''}
          </a>
        </li>
      `;
    }).join('');

    results.innerHTML = html;
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Update focus
  function updateFocus(index) {
    const items = results.querySelectorAll('.search-result-item');
    items.forEach(item => item.classList.remove('focused'));

    if (index >= 0 && index < items.length) {
      items[index].classList.add('focused');
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  // Event listeners
  searchBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);

  input?.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const isModalOpen = modal.getAttribute('aria-hidden') === 'false';

    // Ctrl+K or Cmd+K to open
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isModalOpen) {
        closeModal();
      } else {
        openModal();
      }
      return;
    }

    if (!isModalOpen) return;

    const items = results.querySelectorAll('.search-result-item');
    const itemCount = items.length;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeModal();
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (itemCount > 0) {
          currentFocus = (currentFocus + 1) % itemCount;
          updateFocus(currentFocus);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (itemCount > 0) {
          currentFocus = currentFocus <= 0 ? itemCount - 1 : currentFocus - 1;
          updateFocus(currentFocus);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (currentFocus >= 0 && currentFocus < itemCount) {
          const link = items[currentFocus].querySelector('a');
          if (link) link.click();
        }
        break;
    }
  });
})();
