document.addEventListener('DOMContentLoaded', function () {
  var toggleBtn = document.getElementById('search-toggle');
  var overlay = document.getElementById('search-overlay');
  var closeBtn = document.getElementById('search-close');
  var input = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');

  if (!toggleBtn || !overlay || !input || !resultsEl) return;

  var indexData = null;
  var indexPromise = null;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(
        document.body.getAttribute('data-search-url') || '/search.json'
      )
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          indexData = data;
          return data;
        })
        .catch(function () {
          indexData = [];
          return indexData;
        });
    }
    return indexPromise;
  }

  function openSearch() {
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    loadIndex().then(function () {
      input.focus();
    });
  }

  function closeSearch() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    input.value = '';
    resultsEl.innerHTML = '';
  }

  function renderResults(matches, query) {
    if (!query) {
      resultsEl.innerHTML = '';
      return;
    }
    if (matches.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">No posts found.</div>';
      return;
    }
    resultsEl.innerHTML = matches
      .map(function (post) {
        var cats = (post.categories || [])
          .map(function (c) {
            return '<span class="post-category-tag">' + c + '</span>';
          })
          .join('');
        return (
          '<a class="search-result" href="' +
          post.url +
          '">' +
          '<div class="search-result-title">' +
          post.title +
          '</div>' +
          '<div class="search-result-meta">' +
          post.date +
          (cats ? ' &bull; ' + cats : '') +
          '</div>' +
          '<div class="search-result-excerpt">' +
          post.excerpt +
          '</div>' +
          '</a>'
        );
      })
      .join('');
  }

  function runSearch(query) {
    if (!indexData) return;
    var q = query.trim().toLowerCase();
    if (!q) {
      renderResults([], '');
      return;
    }
    var matches = indexData.filter(function (post) {
      var haystack = (
        post.title +
        ' ' +
        post.excerpt +
        ' ' +
        (post.categories || []).join(' ')
      ).toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
    renderResults(matches, q);
  }

  toggleBtn.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeSearch();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  input.addEventListener('input', function () {
    runSearch(input.value);
  });
});
