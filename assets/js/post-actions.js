document.addEventListener('DOMContentLoaded', function () {
  var shareBtn = document.getElementById('share-btn');
  var shareMenu = document.getElementById('share-menu');
  var bookmarkBtn = document.getElementById('bookmark-btn');

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.innerHTML =
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
      '<span>' + message + '</span>';
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('is-visible');
    });
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () {
        toast.remove();
      }, 200);
    }, 2000);
  }

  function flashCopiedIcon() {
    if (!shareBtn) return;
    shareBtn.classList.add('is-copied');
    setTimeout(function () {
      shareBtn.classList.remove('is-copied');
    }, 1500);
  }

  function copyText(text) {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('Clipboard API unavailable'));
  }

  function openMenu() {
    if (!shareMenu) return;
    shareMenu.hidden = false;
    shareBtn.setAttribute('aria-expanded', 'true');
    // Defer attaching the outside-click listener so it doesn't fire
    // for the same click event that's currently bubbling to document.
    setTimeout(function () {
      document.addEventListener('click', handleOutsideClick);
    }, 0);
    document.addEventListener('keydown', handleEscape);
  }

  function closeMenu() {
    if (!shareMenu) return;
    shareMenu.hidden = true;
    shareBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEscape);
  }

  function handleOutsideClick(e) {
    if (!shareMenu.contains(e.target) && !shareBtn.contains(e.target)) {
      closeMenu();
    }
  }

  function handleEscape(e) {
    if (e.key === 'Escape') closeMenu();
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      if (navigator.share) {
        navigator
          .share({ title: document.title, url: window.location.href })
          .catch(function () {
            /* user cancelled the native share sheet, nothing to do */
          });
        return;
      }

      if (shareMenu.hidden) {
        openMenu();
      } else {
        closeMenu();
      }
    });
  }

  if (shareMenu) {
    shareMenu.addEventListener('click', function (e) {
      var item = e.target.closest('.share-menu-item');
      if (!item) return;

      var title = document.title;
      var url = window.location.href;
      var action = item.getAttribute('data-action');
      var text, toastMessage;

      if (action === 'copy-link') {
        text = url;
        toastMessage = 'Link copied';
      } else if (action === 'copy-markdown') {
        text = '[' + title + '](' + url + ')';
        toastMessage = 'Markdown link copied';
      } else if (action === 'copy-title-link') {
        text = title + '\n' + url;
        toastMessage = 'Title + link copied';
      }

      copyText(text)
        .then(function () {
          closeMenu();
          showToast(toastMessage);
          flashCopiedIcon();
        })
        .catch(function () {
          closeMenu();
          showToast('Could not copy');
        });
    });
  }

  if (bookmarkBtn) {
    var url = bookmarkBtn.getAttribute('data-url');
    var storageKey = 'bookmarked-posts';

    function getBookmarks() {
      try {
        var raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }

    function setBookmarks(list) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(list));
      } catch (e) {
        /* localStorage unavailable (private browsing, quota, etc.) */
      }
    }

    function isBookmarked() {
      return getBookmarks().indexOf(url) !== -1;
    }

    function updateButtonState() {
      var bookmarked = isBookmarked();
      bookmarkBtn.classList.toggle('is-bookmarked', bookmarked);
      bookmarkBtn.setAttribute('aria-pressed', String(bookmarked));
      bookmarkBtn.title = bookmarked ? 'Remove bookmark' : 'Bookmark this post';
    }

    bookmarkBtn.addEventListener('click', function () {
      var list = getBookmarks();
      var idx = list.indexOf(url);

      if (idx === -1) {
        list.push(url);
      } else {
        list.splice(idx, 1);
      }

      setBookmarks(list);
      updateButtonState();
    });

    updateButtonState();
  }
});
