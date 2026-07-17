(function () {
  // Special-case languages whose display name isn't just a capitalized
  // version of the class name (e.g. "json" -> "JSON", not "Json")
  var LABELS = {
    bash: 'Bash',
    sh: 'Shell',
    zsh: 'Zsh',
    python: 'Python',
    py: 'Python',
    rust: 'Rust',
    rs: 'Rust',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    diff: 'Diff',
    text: 'Text',
    plaintext: 'Text',
    javascript: 'JavaScript',
    js: 'JavaScript',
    typescript: 'TypeScript',
    ts: 'TypeScript',
    html: 'HTML',
    css: 'CSS',
    ruby: 'Ruby',
    rb: 'Ruby',
    c: 'C',
    cpp: 'C++',
    toml: 'TOML',
    ini: 'INI',
  };

  function labelFor(lang) {
    if (LABELS[lang]) return LABELS[lang];
    return lang.charAt(0).toUpperCase() + lang.slice(1);
  }

  var CLIPBOARD_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';

  var CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  document.querySelectorAll('.post-content .highlighter-rouge').forEach(function (block) {
    // Kramdown/Rouge also stamps the "highlighter-rouge" + "language-*"
    // classes onto inline code spans (e.g. `code`{: .language-text}).
    // Those are plain <code> elements with no <pre> inside them - only
    // real fenced code blocks (div.highlighter-rouge > .highlight > pre)
    // should get a label bar.
    if (!block.querySelector('pre')) return;

    var langClass = Array.prototype.find.call(block.classList, function (c) {
      return c.indexOf('language-') === 0;
    });
    if (!langClass) return;

    var lang = langClass.replace('language-', '');

    var label = document.createElement('div');
    label.className = 'code-lang-label';

    var name = document.createElement('span');
    name.className = 'code-lang-name';
    name.textContent = labelFor(lang);
    label.appendChild(name);

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-btn';
    button.setAttribute('aria-label', 'Copy code');
    button.innerHTML =
      '<span class="copy-state-default">' + CLIPBOARD_ICON + '</span>' +
      '<span class="copy-state-success">' + CHECK_ICON + ' Copied</span>';

    button.addEventListener('click', function () {
      var codeEl = block.querySelector('code');
      var text = codeEl ? codeEl.innerText : '';

      navigator.clipboard.writeText(text).then(function () {
        button.classList.add('copied');
        clearTimeout(button._copyTimeout);
        button._copyTimeout = setTimeout(function () {
          button.classList.remove('copied');
        }, 2000);
      });
    });

    label.appendChild(button);
    block.insertBefore(label, block.firstChild);
  });
})();
