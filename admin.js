/* Pagina admin: login con Supabase Auth e lettura di admin_stats(). Nessuna libreria, nessun segreto:
   la chiave qui sotto è quella "pubblicabile" (la stessa dell'app); l'accesso ai dati è deciso solo dal database. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://bryevlkcvkqfxatvdqvj.supabase.co';
  var PUBLISHABLE_KEY = 'sb_publishable_qY4_uMV2YNWaoloiPQUtIQ_CLV_qIKG';

  // Il token resta solo in memoria: ricaricando la pagina si accede di nuovo.
  var accessToken = null;

  // ---------------------------------------------------------------- Formattazione (pura, testabile)
  function fmtDateTime(value) {
    if (!value) return '—';
    var d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function fmtDate(value) {
    if (!value) return '—';
    var d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function userLabel(u) {
    return (u.username ? '@' + u.username : '(senza username)') + ' · ' + u.ref;
  }

  function isActive(u, days, now) {
    if (!u.last_active) return false;
    return new Date(u.last_active).getTime() > (now || Date.now()) - days * 86400000;
  }

  function cards(totals) {
    return [
      ['Utenti iscritti', totals.users],
      ['Attivi (7 giorni)', totals.active_7d],
      ['Attivi (30 giorni)', totals.active_30d],
      ['Con almeno un sogno', totals.users_with_dreams],
      ['Sogni scritti', totals.dreams],
      ['Condivisioni fatte', totals.shares],
      ['Utenti che condividono', totals.sharing_users],
      ['Con cifratura E2E', totals.users_with_e2e],
      ['Messaggi in chat', totals.messages],
    ];
  }

  function describeError(status, body) {
    var text = body && (body.message || body.msg || body.error_description || body.error) ? String(body.message || body.msg || body.error_description || body.error) : '';
    if (status === 400 && /invalid login|credentials/i.test(text)) return 'Email o password non corrette.';
    if (status === 403 || /not_admin/.test(text) || (body && body.code === '42501')) return 'Questo account non è autorizzato a vedere le statistiche.';
    if (status === 401) return 'Sessione scaduta: accedi di nuovo.';
    if (status === 0) return 'Rete non raggiungibile.';
    return 'Errore (' + status + ')' + (text ? ': ' + text : '');
  }

  // Il link di recupero password di Supabase porta nell'indirizzo (dopo #) un token a tempo: lo si usa una volta e lo si toglie subito.
  function parseRecovery(hash) {
    if (!hash || hash.charAt(0) !== '#') return null;
    var params = {};
    hash.slice(1).split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i > 0) params[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
    });
    return params.type === 'recovery' && params.access_token ? params.access_token : null;
  }

  function validatePassword(a, b) {
    if (a.length < 12) return 'La password deve avere almeno 12 caratteri.';
    if (a !== b) return 'Le due password non coincidono.';
    return '';
  }

  // ---------------------------------------------------------------- Rete
  function request(path, options) {
    return fetch(SUPABASE_URL + path, options).then(
      function (res) {
        return res.text().then(function (text) {
          var body = null;
          try {
            body = text ? JSON.parse(text) : null;
          } catch (e) {
            body = null;
          }
          if (!res.ok) {
            var err = new Error(describeError(res.status, body));
            err.status = res.status;
            throw err;
          }
          return body;
        });
      },
      function () {
        throw new Error(describeError(0, null));
      },
    );
  }

  function login(email, password) {
    return request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    }).then(function (session) {
      accessToken = session.access_token;
    });
  }

  function setPassword(token, password) {
    return request('/auth/v1/user', {
      method: 'PUT',
      headers: { apikey: PUBLISHABLE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
    });
  }

  function loadStats() {
    return request('/rest/v1/rpc/admin_stats', {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: '{}',
    });
  }

  function logout() {
    var token = accessToken;
    accessToken = null;
    if (token) {
      fetch(SUPABASE_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, Authorization: 'Bearer ' + token } }).catch(function () {});
    }
  }

  // ---------------------------------------------------------------- Interfaccia (solo textContent: niente HTML dai dati)
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function render(stats) {
    var totals = document.getElementById('totals');
    totals.replaceChildren();
    cards(stats.totals).forEach(function (c) {
      var card = el('div', 'admin-stat');
      card.appendChild(el('strong', null, String(c[1])));
      card.appendChild(el('span', null, c[0]));
      totals.appendChild(card);
    });

    var days = document.getElementById('by-day');
    days.replaceChildren();
    var max = 1;
    stats.by_day.forEach(function (d) {
      max = Math.max(max, d.dreams, d.shares, d.new_users);
    });
    stats.by_day.forEach(function (d) {
      var col = el('div', 'admin-day');
      var bars = el('div', 'admin-bars');
      [['dreams', 'Sogni', d.dreams], ['shares', 'Condivisioni', d.shares], ['users', 'Nuovi utenti', d.new_users]].forEach(function (b) {
        var bar = el('i', 'bar ' + b[0]);
        bar.style.height = Math.round((b[2] / max) * 100) + '%';
        bar.title = b[1] + ': ' + b[2];
        bars.appendChild(bar);
      });
      col.appendChild(bars);
      col.appendChild(el('small', null, String(d.day).slice(8, 10) + '/' + String(d.day).slice(5, 7)));
      days.appendChild(col);
    });

    var body = document.querySelector('#users tbody');
    body.replaceChildren();
    stats.per_user.forEach(function (u) {
      var row = el('tr');
      row.appendChild(el('td', null, userLabel(u)));
      [u.dreams, u.signs, u.shares_made, u.shares_received].forEach(function (n) {
        row.appendChild(el('td', 'num', String(n)));
      });
      row.appendChild(el('td', null, u.e2e ? 'sì' : 'no'));
      var last = el('td', isActive(u, 7) ? 'active' : '', fmtDateTime(u.last_active));
      row.appendChild(last);
      row.appendChild(el('td', null, fmtDate(u.joined)));
      body.appendChild(row);
    });

    document.getElementById('generated').textContent = 'Dati del ' + fmtDateTime(stats.generated_at);
  }

  function show(id, visible) {
    document.getElementById(id).hidden = !visible;
  }

  function setError(id, message) {
    var node = document.getElementById(id);
    node.textContent = message || '';
    node.hidden = !message;
  }

  function refresh() {
    setError('dash-error', '');
    loadStats().then(
      function (stats) {
        render(stats);
        show('login', false);
        show('dashboard', true);
        show('logout', true);
      },
      function (err) {
        if (err.status === 401 || err.status === 403) {
          logout();
          show('dashboard', false);
          show('logout', false);
          show('login', true);
          setError('login-error', err.message);
        } else {
          setError('dash-error', err.message);
        }
      },
    );
  }

  function initRecovery() {
    var token = parseRecovery(window.location.hash);
    if (!token) return;
    // Il token non deve restare nella barra degli indirizzi né nella cronologia.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    show('login', false);
    show('recovery', true);
    document.getElementById('recovery-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var first = document.getElementById('new-password');
      var second = document.getElementById('new-password2');
      var problem = validatePassword(first.value, second.value);
      if (problem) return setError('recovery-error', problem);
      setError('recovery-error', '');
      setPassword(token, first.value).then(
        function () {
          first.value = '';
          second.value = '';
          token = null;
          show('recovery', false);
          show('login', true);
          setError('login-error', '');
          var ok = document.getElementById('login-ok');
          ok.textContent = 'Password impostata. Accedi con la nuova password.';
          ok.hidden = false;
        },
        function (err) {
          setError('recovery-error', err.status === 401 || err.status === 403 ? 'Il link è scaduto: chiedi un nuovo recupero password.' : err.message);
        },
      );
    });
  }

  function init() {
    initRecovery();
    document.getElementById('login-form').addEventListener('submit', function (event) {
      event.preventDefault();
      setError('login-error', '');
      var password = document.getElementById('password');
      login(document.getElementById('email').value.trim(), password.value).then(
        function () {
          password.value = '';
          refresh();
        },
        function (err) {
          setError('login-error', err.message);
        },
      );
    });
    document.getElementById('refresh').addEventListener('click', refresh);
    document.getElementById('logout').addEventListener('click', function () {
      logout();
      show('dashboard', false);
      show('logout', false);
      show('login', true);
    });
  }

  if (typeof document !== 'undefined') init();
  if (typeof module !== 'undefined') module.exports = { parseRecovery: parseRecovery, validatePassword: validatePassword, fmtDateTime: fmtDateTime, fmtDate: fmtDate, userLabel: userLabel, isActive: isActive, cards: cards, describeError: describeError };
})();
