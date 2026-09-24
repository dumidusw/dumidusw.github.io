(function () {
  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  function updateGiscusTheme(theme) {
    var iframe = document.querySelector('iframe.giscus-frame');
    if (!iframe) return;

    var giscusTheme = theme === 'dark' ? 'dark' : 'light';
    iframe.contentWindow.postMessage(
      { giscus: { setConfig: { theme: giscusTheme } } },
      'https://giscus.app',
    );
  }

  toggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);

    updateGiscusTheme(next);
  });
})();
