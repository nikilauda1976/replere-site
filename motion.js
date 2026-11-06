/* Le mouvement de l'accueil, sans bibliothèque. Trois choses, et rien d'autre :
   1. les blocs apparaissent en montant quand ils entrent dans l'écran (une fois) ;
   2. les chiffres comptent jusqu'à leur valeur ;
   3. le mot d'Anatole se révèle mot à mot au fil du défilement.
   Si la personne a demandé moins d'animations, tout est affiché d'emblée. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  root.classList.add(reduce ? 'sans-mouvement' : 'avec-mouvement');

  // 1. Apparition en montant, avec un léger décalage entre les enfants d'un même groupe.
  //    Sur une page de lecture sans balises, chaque bloc de main en reçoit une.
  if (!document.querySelector('[data-reveal]')) {
    var zone = document.querySelector('main .wrap') || document.querySelector('main');
    if (zone) Array.prototype.forEach.call(zone.children, function (el) { el.setAttribute('data-reveal', ''); });
  }
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('visible');
        var children = el.querySelectorAll('[data-reveal-child]');
        children.forEach(function (c, i) { c.style.transitionDelay = (i * 90) + 'ms'; c.classList.add('visible'); });
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  // 2. Les chiffres qui comptent (data-count="97", data-prefix, data-suffix).
  var counters = document.querySelectorAll('[data-count]');
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null, duration = 1400;
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals).replace('.', ',') + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (reduce || !('IntersectionObserver' in window)) {
    counters.forEach(function (el) {
      el.textContent = (el.getAttribute('data-prefix') || '') + el.getAttribute('data-count').replace('.', ',') + (el.getAttribute('data-suffix') || '');
    });
  } else {
    var ioc = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); ioc.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { ioc.observe(el); });
  }

  // 3. Le texte qui se révèle mot à mot au défilement (data-words sur un paragraphe).
  var passages = document.querySelectorAll('[data-words]');
  passages.forEach(function (p) {
    var html = '';
    p.childNodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          html += /^\s+$/.test(w) ? w : '<span class="parole">' + w + '</span>';
        });
      } else if (node.nodeType === 1) {
        html += '<span class="parole">' + node.outerHTML + '</span>';
      }
    });
    p.innerHTML = html;
  });
  if (passages.length && !reduce) {
    var words = [];
    passages.forEach(function (p) { words = words.concat(Array.prototype.slice.call(p.querySelectorAll('.parole'))); });
    var section = passages[0].closest('section') || passages[0];
    var ticking = false;
    function update() {
      ticking = false;
      var r = section.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 quand le haut de la section arrive aux trois quarts de l'écran, 1 quand il est au tiers.
      var progress = Math.min(1, Math.max(0, (vh * 0.78 - r.top) / (vh * 0.55)));
      var lit = Math.floor(progress * (words.length + 2));
      words.forEach(function (w, i) { w.style.opacity = i < lit ? 1 : 0.22; });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // Le menu mobile : un bouton qui devient une croix, un panneau plein écran, les liens qui
  // arrivent l'un après l'autre (60 ms chacun, 400 ms au plus).
  var menu = document.querySelector('.menu');
  var panneau = document.getElementById('panneau');
  if (menu && panneau) {
    var links = panneau.querySelectorAll('a');
    var step = Math.min(60, 400 / Math.max(1, links.length));
    links.forEach(function (a, i) { a.style.transitionDelay = (i * step) + 'ms'; });
    function setOpen(open) {
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      document.body.classList.toggle('panneau-ouvert', open);
      if (open) { panneau.hidden = false; requestAnimationFrame(function () { panneau.classList.add('ouvert'); }); }
      else { panneau.classList.remove('ouvert'); setTimeout(function () { panneau.hidden = true; }, reduce ? 0 : 420); }
    }
    menu.addEventListener('click', function () { setOpen(menu.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panneau.hidden) { setOpen(false); menu.focus(); } });
    links.forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  }

  // L'en-tête se fait discret dès qu'on défile.
  var header = document.querySelector('header');
  if (header) {
    var onScroll = function () { header.classList.toggle('defile', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
