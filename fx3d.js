/* AutoReel — efecte 3D pentru autoreel.ro (nov 2026).

   Doar decor: nu adaugă, nu scoate și nu ascunde text. Fără biblioteci,
   doar transformări CSS 3D pornite de aici.

   - Telefonul din hero se înclină în 3D: după cursor pe calculator,
     singur (legănare lentă) pe telefon, plus puțin la derulare.
   - Cardurile (funcții, parteneri, contact, donații) se înclină sub cursor.
   - Blocurile de sub primul ecran intră în pagină cu o rotire 3D.

   Reguli:
   - „prefers-reduced-motion: reduce” → fișierul nu face nimic.
   - Un element se ascunde pentru intrare DOAR dacă e sub ecran în clipa
     pornirii. Ce se vede deja rămâne neatins (fără pâlpâire), iar un robot
     cu fereastră foarte înaltă vede toată pagina din prima.
   - Clasa `fx3d` de pe <html> e condiția pentru tot CSS-ul care depinde de
     acest fișier (styles.css, secțiunea „3D”). */
(function () {
  'use strict';

  var d = document;
  var root = d.documentElement;
  if (!window.matchMedia || !window.requestAnimationFrame) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  root.classList.add('fx3d');

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ---------------- 0. Cifre care rulează ca un kilometraj ----------------
     Chemată din index.html pentru eticheta cu cifrele live din hero. Fiecare
     cifră rămâne text real în pagină (transparent); coloana care rulează e
     desenată din CSS (`.odo-d::before`), deci textul paginii e tot „614
     mașini active…”, nu un șir de cifre. */
  window.autoreelOdometer = function (el, txt) {
    var wrap = d.createElement('span');
    wrap.className = 'odo';
    var k = 0;
    String(txt).split(/(\d)/).forEach(function (part) {
      if (!part) return;
      if (/^\d$/.test(part)) {
        var s = d.createElement('span');
        s.className = 'odo-d';
        s.textContent = part;
        s.style.setProperty('--n', part);
        s.style.setProperty('--k', k++);
        wrap.appendChild(s);
      } else {
        wrap.appendChild(d.createTextNode(part));
      }
    });
    el.textContent = '';
    el.appendChild(wrap);
    // Două cadre: întâi se desenează poziția de pornire, apoi pornește rularea.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { wrap.classList.add('go'); });
    });
  };

  /* ---------------- 1. Telefonul din hero ---------------- */
  (function () {
    var visual = d.querySelector('.hero2 .hero-visual');
    var phone = visual && visual.querySelector('.phone');
    if (!phone) return;
    var hero = visual.closest('.hero') || visual;

    var BASE_RX = 5, BASE_RY = -15;      // aceeași poziție ca în CSS, fără JS
    var cur = { rx: BASE_RX, ry: BASE_RY };
    var ptr = null;                      // cursorul, -1..1 față de centrul telefonului
    var onScreen = true, raf = 0;
    var t0 = performance.now();

    if (fine) {
      hero.addEventListener('pointermove', function (e) {
        var r = phone.getBoundingClientRect();
        ptr = {
          x: clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1),
          y: clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1)
        };
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { ptr = null; });
    }

    function frame(now) {
      raf = 0;
      var t = (now - t0) / 1000;
      var scroll = clamp(window.scrollY / 600, 0, 1);
      var rx, ry;
      if (ptr) {                         // telefonul „se uită” spre cursor
        ry = ptr.x * 20;
        rx = -ptr.y * 12;
      } else {                           // legănare lentă
        ry = BASE_RY + Math.sin(t * 0.7) * 7;
        rx = BASE_RX + Math.cos(t * 0.5) * 3;
      }
      rx += scroll * 14;                 // se lasă pe spate când derulezi
      cur.rx += (rx - cur.rx) * 0.07;
      cur.ry += (ry - cur.ry) * 0.07;

      phone.style.setProperty('--rx', cur.rx.toFixed(2) + 'deg');
      phone.style.setProperty('--ry', cur.ry.toFixed(2) + 'deg');
      phone.style.setProperty('--gx', (50 + cur.ry * 2.4).toFixed(1) + '%');
      visual.style.setProperty('--px', (cur.ry / 20).toFixed(3));
      visual.style.setProperty('--py', (cur.rx / 20).toFixed(3));
      schedule();
    }

    function schedule() {
      if (!raf && onScreen && !d.hidden) raf = requestAnimationFrame(frame);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[entries.length - 1].isIntersecting;
        schedule();
      }).observe(visual);
    }
    d.addEventListener('visibilitychange', schedule);
    schedule();
  })();

  /* ---------------- 2. Carduri care se înclină sub cursor ---------------- */
  var TILT_SEL = '.feature, .partner-card, .contact-card, .donate-card';

  function tagTilt(scope) {
    if (!fine) return;
    var els = scope.querySelectorAll(TILT_SEL);
    for (var i = 0; i < els.length; i++) els[i].classList.add('tilt');
  }

  if (fine) {
    var active = null, lastEvent = null, queued = false;

    var release = function (el) {
      el.classList.remove('tilting');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    };

    var apply = function () {
      queued = false;
      var e = lastEvent;
      var el = (e && e.target && e.target.closest) ? e.target.closest('.tilt') : null;
      if (el && el.classList.contains('rv')) el = null;   // încă intră în pagină
      if (el !== active) {
        if (active) release(active);
        active = el;
        if (el) el.classList.add('tilting');
      }
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var px = clamp((e.clientX - r.left) / r.width, 0, 1);
      var py = clamp((e.clientY - r.top) / r.height, 0, 1);
      // Cardurile late se înclină mai puțin, ca marginea să nu „sară”.
      var max = clamp(1800 / r.width, 2.5, 8);
      el.style.setProperty('--ry', ((px - 0.5) * 2 * max).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((0.5 - py) * 2 * max).toFixed(2) + 'deg');
      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    };

    d.addEventListener('pointermove', function (e) {
      lastEvent = e;
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });

    var drop = function () {
      lastEvent = null;
      if (active) { release(active); active = null; }
    };
    root.addEventListener('pointerleave', drop);
    window.addEventListener('blur', drop);
  }

  /* ---------------- 3. Intrare 3D la derulare ---------------- */
  var REVEAL_SEL = '.section-divider, .partners-title, .partners-sub, .partner-card, ' +
                   '.partners-footer, .dealer-section, .contact-card, .donate-card, details.card';
  var io = null;

  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        var delay = Math.min(n++, 5) * 70;
        el.style.setProperty('--d', delay + 'ms');
        el.classList.add('in');
        setTimeout(function () {
          el.classList.remove('rv', 'in');
          el.style.removeProperty('--d');
        }, 950 + delay);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  }

  function armReveal(scope) {
    if (!io) return;
    var els = scope.querySelectorAll(REVEAL_SEL);
    var vh = window.innerHeight;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.classList.contains('rv')) continue;
      if (el.getBoundingClientRect().top > vh) {   // doar ce e sub ecran
        el.classList.add('rv');
        io.observe(el);
      }
    }
  }

  // Un salt în pagină (ancoră, End, căutare) poate trece peste elemente fără
  // ca ele să intre vreodată în ecran. Ce a rămas deasupra se arată pe loc,
  // ca nimic să nu stea ascuns când omul derulează înapoi.
  if (io) {
    var sweepQueued = false;
    var sweep = function () {
      sweepQueued = false;
      var els = d.querySelectorAll('.rv:not(.in)');
      for (var i = 0; i < els.length; i++) {
        if (els[i].getBoundingClientRect().bottom < 0) {
          io.unobserve(els[i]);
          els[i].classList.remove('rv');
        }
      }
    };
    window.addEventListener('scroll', function () {
      if (!sweepQueued) { sweepQueued = true; requestAnimationFrame(sweep); }
    }, { passive: true });
  }

  tagTilt(d);
  armReveal(d);

  // Cardurile partenerilor vin din baza de date, după încărcarea paginii.
  var grid = d.getElementById('partnersGrid');
  if (grid && 'MutationObserver' in window) {
    new MutationObserver(function () {
      tagTilt(grid);
      armReveal(grid);
    }).observe(grid, { childList: true });
  }
})();
