/* Effets du site Replere : sans dépendance, chargés en différé.
 * - Annotations dessinées à la main (soulignés, cercles, surlignages) : .annote
 * - Courbe du cœur qui redescend, en direct : #coeur-live
 * - Signature manuscrite : .signature
 * - Fond plasma WebGL pour le bloc final : canvas.plasma
 *   (shader adapté de « Closing Plasma », Componentry, licence MIT)
 * Tout respecte « Réduire les animations » : l'état final s'affiche sans mouvement.
 */
(function () {
  'use strict';
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function quandVisible(el, fn, seuil) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var o = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { if (e.isIntersecting) { o.disconnect(); fn(); } });
    }, { threshold: seuil || 0.35 });
    o.observe(el);
  }

  /* ── Annotations manuscrites ─────────────────────────────────────────── */
  var TRAITS = {
    souligne: { vb: '0 0 200 20', d: ['M3 12 C 40 6, 80 16, 120 10 S 180 8, 197 11'] },
    vague: { vb: '0 0 200 20', d: ['M2 12 q 12 -9 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0 t 24 0'] },
    cercle: { vb: '0 0 200 60', d: ['M100 4 C 160 2, 197 18, 194 32 C 190 50, 140 58, 96 56 C 46 55, 4 46, 6 30 C 8 14, 60 4, 118 7'] },
    surligne: { vb: '0 0 200 20', d: ['M2 10 C 50 8, 150 12, 198 9'] }
  };
  document.querySelectorAll('.annote').forEach(function (el, i) {
    var type = el.getAttribute('data-trait') || 'souligne';
    var t = TRAITS[type] || TRAITS.souligne;
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', t.vb);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'trait trait-' + type);
    t.d.forEach(function (d) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('pathLength', '1');
      svg.appendChild(p);
    });
    el.appendChild(svg);
    if (reduit) { el.classList.add('dessine'); return; }
    var delai = parseFloat(el.getAttribute('data-delai') || '0');
    quandVisible(el, function () {
      setTimeout(function () { el.classList.add('dessine'); }, delai * 1000);
    }, 0.6);
  });

  /* ── Signature ───────────────────────────────────────────────────────── */
  document.querySelectorAll('.signature').forEach(function (el) {
    if (reduit) { el.classList.add('signe'); return; }
    quandVisible(el, function () { el.classList.add('signe'); }, 0.6);
  });

  /* ── Le cœur qui redescend, en direct ────────────────────────────────── */
  var live = document.getElementById('coeur-live');
  if (live) {
    var trace = live.querySelector('.ligne');
    var aire = live.querySelector('.aire');
    var point = live.querySelector('.point');
    var halo = live.querySelector('.halo');
    var bpm = live.querySelector('.bpm-valeur');
    var chrono = live.querySelector('.chrono');
    var W = 600, H = 220, DUREE = 14, HAUT = 158, BAS = 96;
    // Une vraie forme de récupération : rapide au début, puis plus lente, avec de petites oscillations.
    function frequence(s) {
      var base = BAS + (HAUT - BAS) * Math.exp(-s / 4.2);
      return base + Math.sin(s * 2.1) * 1.6 + Math.sin(s * 5.3) * 0.8;
    }
    function y(f) { return H - 14 - (f - 80) / (170 - 80) * (H - 28); }
    function dessiner(s) {
      var pts = [], n = Math.max(2, Math.round(s / DUREE * 120));
      for (var k = 0; k <= n; k++) {
        var ss = s * k / n;
        pts.push([(ss / DUREE) * W, y(frequence(ss))]);
      }
      var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
      trace.setAttribute('d', d);
      aire.setAttribute('d', d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + H + ' L0 ' + H + ' Z');
      var der = pts[pts.length - 1];
      point.setAttribute('cx', der[0]); point.setAttribute('cy', der[1]);
      halo.setAttribute('cx', der[0]); halo.setAttribute('cy', der[1]);
      bpm.textContent = Math.round(frequence(s));
      var sec = Math.floor(s * 10); // 14 s d'animation = 2 min 20 de séance
      chrono.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }
    if (reduit) {
      dessiner(DUREE);
    } else {
      dessiner(0.01);
      quandVisible(live, function () {
        var debut = null, enCours = true;
        document.addEventListener('visibilitychange', function () { enCours = !document.hidden; if (enCours) { debut = null; requestAnimationFrame(boucle); } });
        var dejaFait = 0;
        function boucle(t) {
          if (!enCours) return;
          if (debut === null) debut = t - dejaFait * 1000;
          var s = (t - debut) / 1000;
          if (s >= DUREE + 3) { debut = t; s = 0; }
          dejaFait = s;
          dessiner(Math.min(Math.max(s, 0.01), DUREE));
          requestAnimationFrame(boucle);
        }
        requestAnimationFrame(boucle);
      }, 0.4);
    }
  }

  /* ── Fond plasma ─────────────────────────────────────────────────────── */
  document.querySelectorAll('canvas.plasma').forEach(function (canvas) {
    var gl = canvas.getContext('webgl', { antialias: false, alpha: true, powerPreference: 'low-power' });
    if (!gl) return; // le dégradé CSS du bloc reste en place
    var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var FS = [
      'precision mediump float;',
      'uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 a;uniform vec3 b;uniform vec3 c;uniform vec3 s;',
      'vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}',
      'vec3 perm(vec3 x){return m289(((x*34.)+1.)*x);}',
      'float sn(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
      'vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
      'vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=m289(i);vec3 q=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
      'vec3 mm=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);mm=mm*mm;mm=mm*mm;',
      'vec3 x=2.*fract(q*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;',
      'mm*=1.79284291400159-.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(mm,g);}',
      'float fbm(vec2 p){float tot=0.,amp=.5;mat2 ro=mat2(cos(.45),sin(.45),-sin(.45),cos(.45));',
      'for(int i=0;i<3;i++){tot+=sn(p)*amp;p=ro*p*1.9;amp*=.5;}return tot;}',
      'void main(){vec2 uv=gl_FragCoord.xy/r;float as=r.x/max(r.y,1.);vec2 p=(uv-.5)*vec2(as,1.);float tt=t*.15;',
      'vec2 mo=(m-.5)*vec2(as,1.);p+=(mo-p)*.02*smoothstep(.45,0.,length(p-mo));',
      'vec2 fl=vec2(fbm(p+vec2(tt*.2,tt*.1)),fbm(p+vec2(-tt*.1,tt*.3)));',
      'float n=fbm(p*.75+fl*.9);float rg=pow(1.-abs(sn(p*1.2+n)*1.6),4.);',
      'vec3 col=mix(a,b,smoothstep(-.5,.5,n));col=mix(col,c,smoothstep(.2,1.,n*.8+rg*.2));',
      'col+=s*pow(max(0.,sn(gl_FragCoord.xy*.2+tt*2.)),18.)*.45;',
      'col*=1.-smoothstep(.5,1.6,length(p))*.55;',
      'col+=(fract(sin(dot(gl_FragCoord.xy+tt*50.,vec2(12.9898,78.233)))*43758.5453)-.5)*.05;',
      'gl_FragColor=vec4(clamp(col,0.,1.),1.);}'
    ].join('\n');
    function sh(type, src) { var x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : null; }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['r', 't', 'm', 'a', 'b', 'c', 's'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    // Les couleurs de Replere : nuit bleue, cobalt, bleu ciel, et une étincelle jaune.
    gl.uniform3f(U.a, 0.06, 0.08, 0.22); gl.uniform3f(U.b, 0.20, 0.28, 0.62); gl.uniform3f(U.c, 0.52, 0.62, 0.90);
    gl.uniform3f(U.s, 1.0, 0.86, 0.35);
    var bloc = canvas.parentElement, souris = [0.5, 0.5], cible = [0.5, 0.5];
    function taille() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5), rc = bloc.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rc.width * dpr)); canvas.height = Math.max(1, Math.floor(rc.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(U.r, canvas.width, canvas.height);
    }
    taille();
    if ('ResizeObserver' in window) new ResizeObserver(taille).observe(bloc);
    bloc.addEventListener('pointermove', function (e) { var rc = bloc.getBoundingClientRect(); cible = [(e.clientX - rc.left) / rc.width, 1 - (e.clientY - rc.top) / rc.height]; });
    bloc.addEventListener('pointerleave', function () { cible = [0.5, 0.5]; });
    function image(sec) {
      souris[0] += (cible[0] - souris[0]) * 0.05; souris[1] += (cible[1] - souris[1]) * 0.05;
      gl.uniform1f(U.t, sec); gl.uniform2f(U.m, souris[0], souris[1]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (reduit) { image(12); canvas.classList.add('pret'); return; }
    // On ne dessine que quand le bloc est à l'écran : rien ne tourne pour rien.
    var visible = false, raf = 0, t0 = performance.now();
    function boucle(now) { image((now - t0) / 1000); raf = visible ? requestAnimationFrame(boucle) : 0; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(boucle);
      }).observe(bloc);
    } else { visible = true; raf = requestAnimationFrame(boucle); }
    image(0); canvas.classList.add('pret');
  });

  /* ── Cartes empilées : la carte recouverte recule et s'assombrit ──────── */
  (function () {
    var pile = document.querySelector('.pile');
    if (!pile) return;
    var racine = document.documentElement, entete = document.querySelector('header');
    // Les cartes collent juste sous l'en-tête, dont la hauteur change avec la largeur (menu sur deux lignes).
    function hauteur() { racine.style.setProperty('--entete', (entete ? entete.offsetHeight : 64) + 'px'); }
    hauteur();
    window.addEventListener('resize', hauteur);
    if (reduit) return;
    var cartes = [].slice.call(pile.querySelectorAll('.pile-carte'));
    var demande = false;
    function maj() {
      demande = false;
      for (var i = 0; i < cartes.length - 1; i++) {
        var moi = cartes[i].getBoundingClientRect(), suivante = cartes[i + 1].getBoundingClientRect();
        // 0 tant que la suivante n'a pas atteint le bas de la carte, 1 quand elle la recouvre.
        var k = Math.min(1, Math.max(0, (moi.bottom - suivante.top) / moi.height));
        cartes[i].style.setProperty('--recul', k.toFixed(3));
      }
    }
    window.addEventListener('scroll', function () {
      if (!demande) { demande = true; requestAnimationFrame(maj); }
    }, { passive: true });
    maj();
  })();
})();
