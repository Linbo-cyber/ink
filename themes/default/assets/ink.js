// Ink — Client JS
(function () {
  'use strict';

  // ── Code Copy ──────────────────────────────────
  window.inkCopyCode = function (btn) {
    var code = btn.parentElement.querySelector('code');
    if (!code) return;
    navigator.clipboard.writeText(code.textContent).then(function () {
      var orig = btn.innerHTML;
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span style="font-size:11px;margin-left:2px">Copied!</span>';
      btn.style.opacity = '1';
      btn.style.color = 'var(--ink-accent)';
      setTimeout(function () {
        btn.innerHTML = orig;
        btn.style.opacity = '';
        btn.style.color = '';
      }, 1500);
    });
  };

  // ── Theme Toggle ──────────────────────────────
  var themeBtn = document.querySelector('.ink-theme-toggle');
  var stored = localStorage.getItem('ink-theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark');

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ink-theme', next);
      updateThemeIcon();
    });
    updateThemeIcon();
  }

  function updateThemeIcon() {
    if (!themeBtn) return;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeBtn.innerHTML = dark
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  }

  // ── Search ────────────────────────────────────
  var overlay = document.querySelector('.ink-search-overlay');
  var input = document.querySelector('.ink-search-input');
  var results = document.querySelector('.ink-search-results');
  var searchData = null;

  function openSearch() {
    if (!overlay) return;
    overlay.classList.add('open');
    input.value = '';
    results.innerHTML = '';
    input.focus();
    if (!searchData) loadSearchData();
  }

  function closeSearch() {
    if (overlay) overlay.classList.remove('open');
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') closeSearch();
  });

  var searchBtn = document.querySelector('.ink-search-btn');
  if (searchBtn) searchBtn.addEventListener('click', openSearch);
  if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSearch(); });

  function loadSearchData() {
    var base = document.documentElement.getAttribute('data-base') || '';
    fetch(base + '/search-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { searchData = data; })
      .catch(function () { searchData = []; });
  }

  if (input) {
    input.addEventListener('input', function () {
      if (!searchData) return;
      var q = input.value.toLowerCase().trim();
      if (!q) { results.innerHTML = ''; return; }
      var matches = searchData.filter(function (item) {
        return item.title.toLowerCase().includes(q) || item.content.toLowerCase().includes(q);
      }).slice(0, 10);
      results.innerHTML = matches.map(function (m) {
        var idx = m.content.toLowerCase().indexOf(q);
        var preview = idx >= 0 ? '...' + m.content.slice(Math.max(0, idx - 30), idx + 80) + '...' : '';
        return '<a class="ink-search-item" href="' + m.url + '"><div class="search-title">' + m.title + '</div><div class="search-preview">' + preview + '</div></a>';
      }).join('');
    });
  }

  // ── TOC active tracking ───────────────────────
  var tocLinks = document.querySelectorAll('.ink-toc a');
  if (tocLinks.length > 0) {
    var headingEls = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) headingEls.push({ el: el, link: link });
    });

    function updateToc() {
      var scrollY = window.scrollY + 80;
      var active = null;
      for (var i = headingEls.length - 1; i >= 0; i--) {
        if (headingEls[i].el.offsetTop <= scrollY) { active = headingEls[i]; break; }
      }
      tocLinks.forEach(function (l) { l.classList.remove('active'); });
      if (active) active.link.classList.add('active');
    }

    window.addEventListener('scroll', updateToc, { passive: true });
    updateToc();
  }

  // ── Tabs ──────────────────────────────────────
  window.inkSwitchTab = function (uid, idx) {
    var container = document.getElementById(uid);
    if (!container) return;
    container.querySelectorAll('.ink-tab-btn').forEach(function (b, i) {
      b.classList.toggle('active', i === idx);
    });
    container.querySelectorAll('.ink-tab-panel').forEach(function (p, i) {
      p.classList.toggle('active', i === idx);
    });
  };

  // ── Mobile sidebar ────────────────────────────
  var hamburger = document.querySelector('.ink-hamburger');
  var sidebar = document.querySelector('.ink-sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });
    // Close on link click
    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { sidebar.classList.remove('open'); });
    });
  }

  // ── Sidebar active ────────────────────────────
  var currentPath = window.location.pathname;
  document.querySelectorAll('.ink-sidebar-item').forEach(function (item) {
    if (item.getAttribute('href') === currentPath) {
      item.classList.add('active');
    }
  });

  // ── Music Player ──────────────────────────────
  var playerStates = {};

  function fmtTime(s) {
    if (isNaN(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  window.inkPlayerToggle = function (uid) {
    var audio = document.getElementById(uid + '_audio');
    var btn = document.querySelector('#' + uid + ' .ink-player-btn');
    if (!audio) return;
    if (audio.paused) {
      // Pause all other players
      document.querySelectorAll('.ink-player audio').forEach(function (a) {
        if (a !== audio && !a.paused) a.pause();
      });
      audio.play();
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      if (!playerStates[uid]) {
        playerStates[uid] = true;
        audio.addEventListener('timeupdate', function () {
          var fill = document.getElementById(uid + '_fill');
          var cur = document.getElementById(uid + '_cur');
          if (fill && audio.duration) fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
          if (cur) cur.textContent = fmtTime(audio.currentTime);
        });
        audio.addEventListener('loadedmetadata', function () {
          var dur = document.getElementById(uid + '_dur');
          if (dur) dur.textContent = fmtTime(audio.duration);
        });
        audio.addEventListener('ended', function () {
          var loopBtn = document.querySelector('#' + uid + ' .ink-player-loop');
          if (loopBtn && loopBtn.classList.contains('active')) {
            audio.currentTime = 0;
            audio.play();
          } else {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
            var fill = document.getElementById(uid + '_fill');
            if (fill) fill.style.width = '0%';
          }
        });
        audio.addEventListener('pause', function () {
          btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
        });
      }
    } else {
      audio.pause();
    }
  };

  window.inkPlayerSeek = function (e, uid) {
    var audio = document.getElementById(uid + '_audio');
    var bar = e.currentTarget;
    if (!audio || !audio.duration) return;
    var rect = bar.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  window.inkPlayerLoop = function (uid) {
    var btn = document.querySelector('#' + uid + ' .ink-player-loop');
    var audio = document.getElementById(uid + '_audio');
    if (!btn || !audio) return;
    btn.classList.toggle('active');
    audio.loop = btn.classList.contains('active');
  };

})();
