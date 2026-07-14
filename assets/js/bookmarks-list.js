document.addEventListener('DOMContentLoaded', function () {
  var section = document.getElementById('bookmarks-section');
  var list = document.getElementById('bookmark-list');
  var countEl = document.getElementById('bookmark-count');
  var dataEl = document.getElementById('all-posts-data');

  if (!section || !list || !countEl || !dataEl) return;

  function getBookmarks() {
    try {
      var raw = localStorage.getItem('bookmarked-posts');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  var BOOKMARK_ICON =
    '<svg class="bookmark-row-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';

  var REMOVE_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';

  function setBookmarks(list) {
    try {
      localStorage.setItem('bookmarked-posts', JSON.stringify(list));
    } catch (e) {
      /* localStorage unavailable */
    }
  }

  function removeBookmark(url) {
    var remaining = getBookmarks().filter(function (u) { return u !== url; });
    setBookmarks(remaining);
    render();
  }

  function render() {
    var bookmarkedUrls = getBookmarks();

    if (bookmarkedUrls.length === 0) {
      section.hidden = true;
      list.innerHTML = '';
      return;
    }

    var allPosts;
    try {
      allPosts = JSON.parse(dataEl.textContent);
    } catch (e) {
      allPosts = [];
    }

    // Preserve bookmark order (most recently bookmarked last-in-array),
    // but only include posts that still exist in allPosts.
    var matched = bookmarkedUrls
      .map(function (url) {
        return allPosts.filter(function (p) { return p.url === url; })[0];
      })
      .filter(Boolean);

    if (matched.length === 0) {
      section.hidden = true;
      list.innerHTML = '';
      return;
    }

    list.innerHTML = matched
      .map(function (post) {
        return (
          '<li class="bookmark-item">' +
          '<a href="' + post.url + '" class="bookmark-link stretched-link">' +
          BOOKMARK_ICON +
          '<span class="bookmark-title">' + post.title + '</span>' +
          '</a>' +
          '<div class="bookmark-meta">' +
          '<span>' + post.date + '</span>' +
          '<span class="dot-separator">&bull;</span>' +
          '<span>' + post.readingTime + ' min read</span>' +
          '</div>' +
          '<button class="bookmark-remove" type="button" data-url="' + post.url + '" aria-label="Remove bookmark">' + REMOVE_ICON + '</button>' +
          '</li>'
        );
      })
      .join('');

    countEl.textContent = String(matched.length);
    section.hidden = false;

    list.querySelectorAll('.bookmark-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeBookmark(btn.getAttribute('data-url'));
      });
    });
  }

  render();

  // Keep in sync if a bookmark is toggled on a post page in another tab,
  // or if the user navigates back to the homepage via bfcache.
  window.addEventListener('storage', function (e) {
    if (e.key === 'bookmarked-posts') render();
  });
  window.addEventListener('pageshow', render);
});
