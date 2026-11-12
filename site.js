// Carousels (scroll-snap + arrows/dots), the live night greeting, and the reality-check draw.
(function () {
  var lang = window.siteLang || 'it';

  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var track = root.querySelector('.track');
    var slides = Array.prototype.slice.call(track.children);
    var dots = root.querySelector('.dots');
    var prev = root.querySelector('[data-prev]');
    var next = root.querySelector('[data-next]');

    slides.forEach(function (slide, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', (lang === 'en' ? 'Slide ' : 'Scheda ') + (i + 1));
      b.addEventListener('click', function () { go(i); });
      dots.appendChild(b);
    });

    function current() {
      var center = track.scrollLeft + track.clientWidth / 2;
      var best = 0;
      slides.forEach(function (s, i) {
        if (Math.abs(s.offsetLeft + s.offsetWidth / 2 - center) <
            Math.abs(slides[best].offsetLeft + slides[best].offsetWidth / 2 - center)) best = i;
      });
      return best;
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      var s = slides[i];
      track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2, behavior: 'smooth' });
    }
    function sync() {
      var c = current();
      Array.prototype.forEach.call(dots.children, function (d, i) { d.setAttribute('aria-current', String(i === c)); });
      if (prev) prev.disabled = c === 0;
      if (next) next.disabled = c === slides.length - 1;
    }
    if (prev) prev.addEventListener('click', function () { go(current() - 1); });
    if (next) next.addEventListener('click', function () { go(current() + 1); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(sync); }, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  // Same greetings the app shows on its home screen, by hour.
  var greetings = {
    it: [
      [5, 12, 'Buongiorno', 'Cosa hai sognato stanotte?'],
      [12, 18, 'Buon pomeriggio', 'Ricordi qualcosa dei tuoi sogni?'],
      [18, 23, 'Buonasera', 'Prepara la mente al viaggio di stanotte.'],
      [23, 29, 'Buonanotte', 'Mentre ti addormenti: “la prossima volta saprò di sognare”.'],
    ],
    en: [
      [5, 12, 'Good morning', 'What did you dream last night?'],
      [12, 18, 'Good afternoon', 'Do you remember any of your dreams?'],
      [18, 23, 'Good evening', 'Prepare your mind for tonight’s journey.'],
      [23, 29, 'Good night', 'As you fall asleep: “next time, I’ll know I’m dreaming”.'],
    ],
  };
  var h = new Date().getHours();
  var hh = h < 5 ? h + 24 : h;
  var g = greetings[lang].filter(function (row) { return hh >= row[0] && hh < row[1]; })[0];
  document.querySelectorAll('[data-greeting]').forEach(function (el) { el.textContent = g[2]; });
  document.querySelectorAll('[data-greeting-sub]').forEach(function (el) { el.textContent = g[3]; });
  document.querySelectorAll('[data-clock]').forEach(function (el) {
    el.textContent = new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'it-IT', { hour: '2-digit', minute: '2-digit' });
  });

  // Reality checks: the same prompts the app's reminders send.
  var checks = {
    it: [
      'Sto sognando? Guarda le tue mani e conta le dita.',
      'Tappati il naso e prova a respirare.',
      'Leggi un testo, distogli lo sguardo e rileggilo. È cambiato?',
      'Guarda l’orologio due volte. L’ora è coerente?',
      'Come sei arrivato qui? Ricordi cosa facevi prima?',
    ],
    en: [
      'Am I dreaming? Look at your hands and count your fingers.',
      'Pinch your nose and try to breathe.',
      'Read some text, look away, and read it again. Has it changed?',
      'Look at the clock twice. Is the time consistent?',
      'How did you get here? Do you remember what you were doing before?',
    ],
  };
  var out = document.querySelector('[data-check-out]');
  var btn = document.querySelector('[data-check-btn]');
  var last = -1;
  if (out && btn) {
    btn.addEventListener('click', function () {
      var i;
      do { i = Math.floor(Math.random() * checks[lang].length); } while (i === last);
      last = i;
      out.textContent = checks[lang][i];
      out.classList.remove('pop');
      void out.offsetWidth;
      out.classList.add('pop');
    });
  }
})();
