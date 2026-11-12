// Language: ?lang=, saved choice, or browser language. Swaps [data-lang] blocks and [data-en] texts.
(function () {
  var param = new URLSearchParams(location.search).get('lang');
  var saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}
  var lang = param || saved || (navigator.language || 'it').slice(0, 2);
  if (lang !== 'en') lang = 'it';
  try { localStorage.setItem('lang', lang); } catch (e) {}

  document.documentElement.lang = lang;
  document.querySelectorAll('[data-lang]').forEach(function (el) {
    el.hidden = el.getAttribute('data-lang') !== lang;
  });
  document.querySelectorAll('[data-en]').forEach(function (el) {
    if (!el.hasAttribute('data-it')) el.setAttribute('data-it', el.textContent);
    el.textContent = el.getAttribute(lang === 'en' ? 'data-en' : 'data-it');
  });
  document.querySelectorAll('nav.lang a').forEach(function (a) {
    a.setAttribute('aria-current', String(a.getAttribute('data-set') === lang));
  });
  var title = document.querySelector('meta[name="title-' + lang + '"]');
  if (title) document.title = title.content;
  window.siteLang = lang;
})();
