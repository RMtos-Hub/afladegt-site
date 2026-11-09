/* Mode d'édition AFLADEGT — actif uniquement sur la version hébergée par Claude,
   pour les personnes autorisées à modifier. Sans effet ailleurs (ex. Cloudflare). */
(function () {
  'use strict';
  var INLINE = { A: 1, EM: 1, STRONG: 1, B: 1, I: 1, BR: 1, SUP: 1, SUB: 1 };
  var SKIP = { A: 1, BUTTON: 1, LABEL: 1, INPUT: 1, SELECT: 1, OPTION: 1, TEXTAREA: 1, SCRIPT: 1, STYLE: 1, SUMMARY: 1 };
  var page = decodeURIComponent(location.pathname.split('/').pop() || '') || 'index.html';
  if (!/\.html$/.test(page)) page = 'index.html';
  var KEY = 'afladegt-src:' + page;

  function roots(doc) {
    return [].slice.call(doc.querySelectorAll('main, section.letter, section.donband'));
  }
  // Éléments de texte modifiables : texte simple ou avec mise en forme légère.
  function candidates(doc) {
    var out = [];
    roots(doc).forEach(function (root) {
      root.querySelectorAll('*').forEach(function (el) {
        if (SKIP[el.tagName] || el.closest('form, .filters, nav, .ed-ui')) return;
        if (!el.textContent.trim()) return;
        var ok = [].every.call(el.childNodes, function (n) {
          return n.nodeType === 3 || (n.nodeType === 1 && INLINE[n.tagName]) || n.nodeType === 8;
        });
        if (!ok) return;
        if (out.some(function (p) { return p.contains(el); })) return;
        out.push(el);
      });
    });
    return out;
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function clean(node) {
    var h = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) { h += esc(n.nodeValue); return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName;
      if (t === 'BR') { h += '<br>'; return; }
      if (t === 'A' && n.getAttribute('href') && !/^\s*javascript:/i.test(n.getAttribute('href'))) {
        var ext = /^https?:/i.test(n.getAttribute('href'));
        h += '<a href="' + esc(n.getAttribute('href')).replace(/"/g, '&quot;') + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + clean(n) + '</a>';
        return;
      }
      if (INLINE[t] && t !== 'A') { var tag = t.toLowerCase(); h += '<' + tag + '>' + clean(n) + '</' + tag + '>'; return; }
      h += clean(n);
    });
    return h;
  }

  var art, assets, srcText, srcDoc, live = [], before = [], photos = {}, editing = false, busy = false;

  function ui() {
    var css = document.createElement('style');
    css.textContent =
      '.ed-ui{position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:flex-end;max-width:calc(100vw - 32px);font-family:var(--body,Arial,sans-serif)}' +
      '.ed-ui button{font:700 15px/1 var(--body,Arial,sans-serif);padding:13px 18px;border-radius:99px;border:0;cursor:pointer;box-shadow:0 6px 20px rgba(30,16,48,.25)}' +
      '.ed-main{background:var(--blue,#5B1E8E);color:#fff}.ed-save{background:var(--red,#C8306F);color:#fff}.ed-cancel{background:#fff;color:var(--ink,#1E1030)}' +
      '.ed-msg{background:var(--ink,#1E1030);color:#fff;padding:10px 14px;border-radius:8px;font-size:14px;max-width:340px}' +
      '.ed-on [data-ed]{outline:2px dashed rgba(200,48,111,.55);outline-offset:3px;border-radius:2px;cursor:text}' +
      '.ed-on [data-ed]:focus{outline:2px solid var(--red,#C8306F);background:rgba(247,184,212,.18)}' +
      '.ed-tools{position:absolute;top:10px;right:10px;z-index:3;display:flex;gap:6px}' +
      '.ed-tools button,.ed-add{font:700 13px/1 var(--body,Arial,sans-serif);padding:9px 12px;border-radius:99px;border:0;cursor:pointer;background:#fff;color:var(--ink,#1E1030);box-shadow:0 2px 8px rgba(0,0,0,.2)}' +
      '.ed-tools .ed-del{background:var(--red,#C8306F);color:#fff}' +
      '.ed-add{background:var(--blue,#5B1E8E);color:#fff;padding:12px 18px;margin:0 0 20px}' +
      '.ed-on .card .media{position:relative}';
    document.head.appendChild(css);
    var box = document.createElement('div');
    box.className = 'ed-ui';
    box.innerHTML = '<span class="ed-msg" hidden></span><button type="button" class="ed-cancel" hidden>Annuler</button><button type="button" class="ed-save" hidden>Enregistrer</button><button type="button" class="ed-main">Modifier</button>';
    document.body.appendChild(box);
    return box;
  }
  var box, msgEl;
  function say(t, keep) {
    msgEl.textContent = t; msgEl.hidden = !t;
    if (t && !keep) setTimeout(function () { if (msgEl.textContent === t) msgEl.hidden = true; }, 5000);
  }

  function loadSource() {
    var cached = null;
    try { cached = sessionStorage.getItem(KEY); } catch (e) {}
    if (cached) return Promise.resolve(cached);
    return fetch(page, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('source');
      return r.text();
    });
  }
  function serialize(doc) {
    return '<!doctype html>\n' + doc.documentElement.outerHTML + '\n';
  }

  function enter() {
    if (busy) return;
    busy = true; say('Préparation…', true);
    loadSource().then(function (txt) {
      srcText = txt;
      srcDoc = new DOMParser().parseFromString(txt, 'text/html');
      live = candidates(document);
      var srcC = candidates(srcDoc);
      if (srcC.length !== live.length) {
        try { sessionStorage.removeItem(KEY); } catch (e) {}
        say('La page a changé entre-temps. Rechargez-la puis réessayez.', true);
        busy = false; return;
      }
      before = live.map(function (el) { return clean(el); });
      live.forEach(function (el, i) {
        el.setAttribute('data-ed', i);
        el.contentEditable = 'true';
        el.spellcheck = true;
      });
      document.documentElement.classList.add('ed-on');
      addCardTools();
      editing = true; busy = false;
      box.querySelector('.ed-main').hidden = true;
      box.querySelector('.ed-save').hidden = false;
      box.querySelector('.ed-cancel').hidden = false;
      say('Cliquez sur un texte pour le modifier, puis « Enregistrer ».');
    }).catch(function () { busy = false; say("Impossible de préparer la modification. Rechargez la page.", true); });
  }

  function cards(doc) { return [].slice.call(doc.querySelectorAll('main article.card')); }

  function addCardTools() {
    var liveCards = cards(document);
    liveCards.forEach(function (card, i) {
      var media = card.querySelector('.media');
      if (!media) return;
      var t = document.createElement('div');
      t.className = 'ed-tools';
      t.innerHTML = (assets ? '<button type="button" class="ed-photo">Photo</button>' : '') + '<button type="button" class="ed-del">Supprimer</button>';
      media.appendChild(t);
      var ph = t.querySelector('.ed-photo');
      if (ph) ph.addEventListener('click', function () { pickPhoto(card, i); });
      var del = t.querySelector('.ed-del');
      del.addEventListener('click', function () {
        if (del.dataset.sure) { removeCard(i); return; }
        del.dataset.sure = '1'; del.textContent = 'Confirmer ?';
        setTimeout(function () { del.dataset.sure = ''; del.textContent = 'Supprimer'; }, 4000);
      });
    });
    var list = document.querySelector('main .news');
    if (list && liveCards.length) {
      var add = document.createElement('button');
      add.type = 'button'; add.className = 'ed-add ed-ui-inline'; add.textContent = '+ Ajouter une actualité';
      add.addEventListener('click', addCard);
      list.parentNode.insertBefore(add, list);
    }
  }

  function pickPhoto(card, i) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp,image/gif';
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) { say('Photo trop lourde (20 Mo maximum).'); return; }
      say('Envoi de la photo…', true);
      assets.upload(f).then(function (r) {
        photos[i] = r.id;
        var media = card.querySelector('.media');
        var old = media.querySelector(':scope > .ph, :scope > img');
        var img = document.createElement('img');
        img.src = r.url; img.alt = ''; img.className = 'ed-img';
        if (old) old.replaceWith(img); else media.insertBefore(img, media.firstChild);
        say('Photo ajoutée. Pensez à enregistrer.');
      }).catch(function (e) {
        var c = e && e.code;
        say(c === 'too_large' ? 'Photo trop lourde.' : c === 'unsupported_type' ? 'Format non accepté (JPG, PNG, WebP).' : c === 'quota_or_state' ? 'Espace de stockage plein.' : "La photo n'a pas pu être envoyée.");
      });
    });
    inp.click();
  }

  function applyEdits(doc) {
    var srcC = candidates(doc);
    live.forEach(function (el, i) {
      var now = clean(el);
      if (now !== before[i] && srcC[i]) srcC[i].innerHTML = now;
    });
    var sc = cards(doc);
    Object.keys(photos).forEach(function (k) {
      var card = sc[+k]; if (!card) return;
      var media = card.querySelector('.media');
      var old = media.querySelector(':scope > .ph, :scope > img');
      var img = doc.createElement('img');
      img.src = '/_blob/' + photos[k]; img.alt = '';
      if (old) old.replaceWith(img); else media.insertBefore(img, media.firstChild);
    });
  }

  function publish(doc, okMsg) {
    var html = serialize(doc);
    var files = {}; files[page] = html;
    busy = true; say('Enregistrement…', true);
    return art.publish(files).then(function () {
      try { sessionStorage.setItem(KEY, html); } catch (e) {}
      say(okMsg || 'Enregistré !', true);
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function (e) {
      busy = false;
      var c = e && e.code;
      if (c === 'conflict') { try { sessionStorage.removeItem(KEY); } catch (x) {} say('Quelqu\'un a modifié le site en même temps. La page se recharge.', true); return; }
      if (c === 'not_writer' || c === 'not_granted' || c === 'capability_disabled' || c === 'consent_required') { say("Vous n'avez pas le droit de modifier ce site.", true); box.querySelector('.ed-save').hidden = true; return; }
      if (c === 'rate_limited') { say('Trop d\'enregistrements rapprochés. Patientez une minute.', true); return; }
      if (c === 'too_large') { say('La page est trop lourde pour être enregistrée.', true); return; }
      say("L'enregistrement a échoué. Réessayez dans un instant.", true);
    });
  }

  function save() {
    if (busy || !editing) return;
    applyEdits(srcDoc);
    var changed = serialize(srcDoc) !== serialize(new DOMParser().parseFromString(srcText, 'text/html'));
    if (!changed) { say('Aucune modification à enregistrer.'); return; }
    publish(srcDoc);
  }

  function addCard() {
    if (busy) return;
    applyEdits(srcDoc);
    var sc = cards(srcDoc);
    var first = sc[0];
    var n = first.cloneNode(true);
    var media = n.querySelector('.media');
    media.className = 'media c-blue';
    media.innerHTML = '<span class="cat">Terrain</span><div class="ph"><span class="disc"><img src="assets/logo-mark.png" alt=""></span></div>';
    n.setAttribute('data-cat', 'Terrain');
    n.querySelector('.txt').innerHTML = '<p class="meta">Date · Lieu</p><h3>Titre de l\'actualité</h3><p>Décrivez ici l\'activité en quelques phrases.</p>';
    first.parentNode.insertBefore(n, first);
    publish(srcDoc, 'Actualité ajoutée. Cliquez sur « Modifier » pour la remplir.');
  }

  function removeCard(i) {
    if (busy) return;
    applyEdits(srcDoc);
    var sc = cards(srcDoc);
    if (sc[i]) sc[i].remove();
    publish(srcDoc, 'Actualité supprimée.');
  }

  function cancel() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  }

  function keyGuard(e) {
    if (!editing || !e.target.closest || !e.target.closest('[data-ed]')) return;
    if (e.key === 'Enter') { e.preventDefault(); }
  }
  function pasteGuard(e) {
    if (!editing || !e.target.closest || !e.target.closest('[data-ed]')) return;
    e.preventDefault();
    var t = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s*\n\s*/g, ' ');
    document.execCommand('insertText', false, t);
  }

  function start() {
    var c = window.claude;
    if (!c || typeof c.use !== 'function') return false;
    Promise.all([c.use('artifact'), c.use('assets'), c.use('user')]).then(function (r) {
      art = r[0]; assets = r[1];
      var user = r[2];
      var canEdit = !!assets || (user && typeof user.canEdit === 'function' && user.canEdit());
      if (!art || !canEdit) return;
      box = ui(); msgEl = box.querySelector('.ed-msg');
      box.querySelector('.ed-main').addEventListener('click', enter);
      box.querySelector('.ed-save').addEventListener('click', save);
      box.querySelector('.ed-cancel').addEventListener('click', cancel);
      document.addEventListener('keydown', keyGuard, true);
      document.addEventListener('paste', pasteGuard, true);
      // Une page fraîchement servie remplace toute copie locale plus ancienne.
      try {
        var k = sessionStorage.getItem(KEY);
        if (k) fetch(page, { cache: 'no-store' }).then(function (x) { return x.text(); }).then(function (t) { if (t === k) sessionStorage.removeItem(KEY); });
      } catch (e) {}
    }).catch(function () {});
    return true;
  }
  if (!start()) {
    var tries = 0;
    var timer = setInterval(function () { if (start() || ++tries > 20) clearInterval(timer); }, 250);
  }
})();
