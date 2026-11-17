// L'expérience « après l'effort » de Replere : on traverse une montagne au coucher du soleil en faisant
// défiler, on respire trois fois avec Souffle (doigt maintenu = inspirer), le cœur redescend, la nuit
// tombe et Souffle monte dans le ciel pour devenir la lune.
// Utilisation : un élément .xp (voir index.html) et ce module. Rien n'est enregistré, aucun micro.
import * as THREE from "three";

const root = document.querySelector(".xp");
if (root) start(root);

async function start(root) {
  const q = s => root.querySelector(s);
  const qa = s => [...root.querySelectorAll(s)];
  const base = new URL(".", import.meta.url).href;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 899px)").matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;

  // ─── État : défilement dans la section, souffle, cœur ─────────────────────────
  const S = { p: 0, pT: 0, breath: 0, hold: false, level: 0, breaths: 0, full: false, inBreath: false, calm: 0, visible: true };
  const panels = qa(".xp-panel"), breathPanel = q(".xp-breath"), shots = qa(".xp-shot");
  // Hauteur de référence stable : sur téléphone, la barre d'adresse qui apparaît ou disparaît changeait
  // innerHeight en plein défilement, et la scène sautait. On ne la remet à jour que si la largeur change.
  let VH = innerHeight, VW = innerWidth;
  addEventListener("resize", () => { if (innerWidth !== VW || Math.abs(innerHeight - VH) > 160) { VW = innerWidth; VH = innerHeight; } });
  function readScroll() {
    const r = root.getBoundingClientRect();
    const span = r.height - VH;
    S.pT = span > 0 ? clamp(-r.top / span) : 0;
    const b = breathPanel.getBoundingClientRect();
    S.inBreath = b.top < -VH * 0.3 && b.bottom > VH * 0.75;
    // Chaque écran de l'app arrive avec son moment : la séance, le bilan, la journée réussie.
    for (const f of shots) { const r = f.getBoundingClientRect(); f.classList.toggle("on", r.top < VH * .72 && r.bottom > VH * .2); }
  }
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", readScroll);
  readScroll();
  new IntersectionObserver(([e]) => { S.visible = e.isIntersecting; }, { rootMargin: "200px" }).observe(root);

  // Maintenir = inspirer, relâcher = expirer : doigt, clic ou barre d'espace, pendant les respirations.
  const control = e => e.target.closest?.("a,button,input,summary,label");
  let touch = false;
  root.addEventListener("pointerdown", e => { touch = e.pointerType === "touch"; if (S.inBreath && !control(e)) S.hold = true; });
  addEventListener("pointerup", () => { S.hold = false; });
  addEventListener("pointercancel", () => { S.hold = false; });
  addEventListener("keydown", e => { if (e.code === "Space" && S.inBreath && !control(e)) { e.preventDefault(); S.hold = true; } });
  addEventListener("keyup", e => { if (e.code === "Space") S.hold = false; });

  // ─── Le son, sur demande : une nappe et un souffle de vent qui suivent la respiration ─
  let audio = null;
  const soundBtn = q(".xp-sound");
  soundBtn?.addEventListener("click", () => {
    if (!audio) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600; lp.Q.value = .7; lp.connect(master);
      [110, 164.8, 220.5, 277.2].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = f; o.detune.value = (i - 1.5) * 6;
        const g = ctx.createGain(); g.gain.value = i ? .09 : .22; o.connect(g); g.connect(lp); o.start();
      });
      const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = .6;
      const ng = ctx.createGain(); ng.gain.value = 0; noise.connect(bp); bp.connect(ng); ng.connect(master); noise.start();
      audio = { ctx, master, lp, ng, bp, on: false, prev: 0 };
    }
    audio.on = !audio.on;
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    audio.master.gain.setTargetAtTime(audio.on ? .5 : 0, audio.ctx.currentTime, .6);
    soundBtn.classList.toggle("on", audio.on);
    soundBtn.setAttribute("aria-pressed", String(audio.on));
  });

  // ─── L'interface : cœur, zone, tracé du pouls, étapes, téléphone, guide ─────────
  // Les textes de la scène suivent la langue de la page (<html lang>).
  const EN = (document.documentElement.lang || "fr").startsWith("en");
  const T = EN ? {
    names: ["Finish line", "The way back", "Three breaths", "Heart rate down", "Night"],
    zones: ["Zone 4 · Tempo", "Zone 3 · Endurance", "Zone 2 · Recovery", "Zone 1 · Rest"],
    done: "Your heart is already slowing.", hold: "Hold the air for a moment…", inhale: "Breathe in…", exhale: "Breathe out, a little longer…", press: "Press and hold to breathe in",
    howDone: "Keep scrolling", how: "Hold your finger, click or Space: breathe in · release: breathe out"
  } : {
    names: ["Fin de sortie", "Le chemin du retour", "Trois respirations", "Redescendu", "La nuit"],
    zones: ["Zone 4 · Tempo", "Zone 3 · Endurance", "Zone 2 · Retour", "Zone 1 · Repos"],
    done: "Votre cœur ralentit déjà.", hold: "Gardez l'air un instant…", inhale: "Inspirez…", exhale: "Expirez, plus longtemps…", press: "Maintenez pour inspirer",
    howDone: "Continuez à faire défiler", how: "Doigt maintenu, clic ou Espace : inspirer · relâcher : expirer"
  };
  const names = T.names;
  const bars = qa(".xp-prog b"), dots = qa(".xp-count i"), ecg = q(".xp-tele canvas"), g = ecg.getContext("2d");
  const el = Object.fromEntries(["bpm", "tbpm", "lnum", "ldrop", "zone", "clock", "lclock", "arc", "stagename", "live", "cue", "guide", "say", "how"].map(k => [k, q(`[data-xp="${k}"]`)]));
  const texts = qa(".xp-t"), tele = q(".xp-tele");
  let last = performance.now(), sinceBeat = 0, trace = [], shown = -1, mx = 0, my = 0, bonus = 0, uiP = 0;
  addEventListener("pointermove", e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  const sizeEcg = () => { const r = devicePixelRatio || 1; ecg.width = ecg.clientWidth * r; ecg.height = ecg.clientHeight * r; trace = new Array(Math.max(10, Math.ceil(ecg.clientWidth))).fill(0); };
  addEventListener("resize", sizeEcg); sizeEcg();
  const beat = x => x < .08 ? Math.sin(x / .08 * Math.PI) * .12 : x < .14 ? -(x - .08) / .06 * .2 : x < .2 ? -.2 + (x - .14) / .06 * 1.2 : x < .27 ? 1 - (x - .2) / .07 * 1.35 : x < .33 ? -.35 + (x - .27) / .06 * .35 : x < .55 ? Math.sin((x - .33) / .22 * Math.PI) * .18 : 0;

  function ui(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    uiP += (S.pT - uiP) * (reduce ? 1 : Math.min(1, dt * 3));
    // La respiration au doigt : l'inspiration monte en ~4 s, l'expiration redescend en ~6 s.
    S.level += ((S.hold ? 1 : 0) - S.level) * Math.min(1, dt * (S.hold ? .55 : .38));
    if (S.inBreath) {
      if (S.level > .82) S.full = true;
      if (S.full && S.level < .18) { S.full = false; S.breaths = Math.min(3, S.breaths + 1); if (touch) try { navigator.vibrate?.(18); } catch (e) {} }
    }
    S.breath = S.inBreath ? S.level : (reduce ? .5 : .5 + .5 * Math.sin(now / 1000 * Math.PI / 5));
    // Chaque respiration faite au doigt fait redescendre le cœur un peu plus vite.
    bonus += ((S.breaths / 3) * .12 - bonus) * Math.min(1, dt * 1.5);
    const prog = clamp(smooth(.1, .8, uiP) + bonus);
    S.calm = smooth(.12, .74, uiP + bonus * .6);
    const bpm = Math.round(mix(165, 98, prog));

    const H = VH, pr = panels.map(s => s.getBoundingClientRect()), tr = texts.map(tx => tx.getBoundingClientRect());
    let idx = 0; pr.forEach((r, i) => { if (r.top < H * .5) idx = i; });
    if (idx !== shown) { shown = idx; el.stagename.textContent = `0${idx + 1} / 05 · ${names[idx]}`; }
    pr.forEach((r, i) => { bars[i].style.transform = `scaleX(${clamp((H * .5 - r.top) / r.height).toFixed(3)})`; });

    for (const k of ["bpm", "tbpm", "lnum"]) el[k].textContent = bpm;
    el.ldrop.textContent = bpm < 165 ? `−${165 - bpm}` : "0";
    el.bpm.style.color = bpm > 125 ? "#ffb36b" : "#D8FF85";
    const z = bpm > 150 ? [T.zones[0], "rgba(226,85,42,.92)", "#fff"] : bpm > 130 ? [T.zones[1], "rgba(240,150,60,.92)", "#2a1205"] : bpm > 110 ? [T.zones[2], "rgba(170,210,120,.92)", "#10230b"] : [T.zones[3], "#D8FF85", "#0A211F"];
    if (el.zone.textContent !== z[0]) { el.zone.textContent = z[0]; el.zone.style.background = z[1]; el.zone.style.color = z[2]; }
    const secs = Math.round(prog * 90), clk = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    el.clock.textContent = clk; el.lclock.textContent = clk;
    const warm = clamp((bpm - 98) / 67);
    el.arc.style.stroke = warm > .5 ? "#e2552a" : "#D8FF85"; el.arc.setAttribute("stroke-dashoffset", String(465 * (1 - (.2 + .8 * warm))));

    const out = smooth(.03, .13, uiP);
    el.live.style.opacity = 1 - out;
    el.live.style.transform = reduce ? "none" : `perspective(1100px) translate3d(0,${out * -80}px,0) rotateY(${-18 + mx * 12}deg) rotateX(${7 - my * 9}deg) rotateZ(${3 + out * 8}deg)`;
    el.cue.style.opacity = uiP > .9 || S.inBreath ? 0 : 1;
    // Sur téléphone, la carte du pouls laisse la place au texte d'ouverture et à l'écran de fin.
    if (small) tele.style.opacity = smooth(.03, .08, uiP) * (1 - smooth(.9, .96, uiP));
    // Un texte n'apparaît qu'au-dessus de la carte du pouls et s'efface avant le menu : plus de chevauchement.
    texts.forEach((tx, i) => { const r = tr[i];
      const o = i === texts.length - 1 ? 1 : smooth(H * .9, H * .66, r.top) * smooth(H * .1, H * .26, r.bottom);
      tx.style.opacity = o.toFixed(3); tx.style.visibility = o < .02 ? "hidden" : "visible"; });

    el.guide.style.opacity = S.inBreath ? 1 : 0;
    if (S.inBreath) {
      const done = S.breaths >= 3;
      el.say.textContent = done ? T.done : S.hold ? (S.level > .85 ? T.hold : T.inhale) : (S.level > .2 ? T.exhale : T.press);
      el.how.textContent = done ? T.howDone : T.how;
      dots.forEach((d, i) => d.classList.toggle("on", i < S.breaths));
    }

    if (audio?.on) {
      const ct = audio.ctx.currentTime, br = S.breath;
      audio.lp.frequency.setTargetAtTime(mix(380, 1300, br) * mix(1, .7, S.calm), ct, .3);
      audio.ng.gain.setTargetAtTime(Math.min(.25, Math.abs(br - audio.prev) / Math.max(dt, .001) * .35) + .006, ct, .25);
      audio.bp.frequency.setTargetAtTime(S.hold ? 1200 : 700, ct, .4);
      audio.prev = br;
    }

    if (!reduce) {
      const speed = 70, steps = Math.max(1, Math.round(dt * speed)), period = 60 / bpm;
      for (let k = 0; k < steps; k++) { sinceBeat += 1 / speed; if (sinceBeat >= period) sinceBeat -= period; trace.push(beat(sinceBeat / period)); trace.shift(); }
    }
    const w = ecg.width, h = ecg.height, r = devicePixelRatio || 1;
    g.clearRect(0, 0, w, h); g.lineWidth = 1.6 * r; g.strokeStyle = warm > .5 ? "#ffb36b" : "#D8FF85"; g.beginPath();
    trace.forEach((v, i) => { const X = i * r, Y = h * .62 - v * h * .5; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke();
    requestAnimationFrame(ui);
  }
  requestAnimationFrame(ui);

  // ─── Le relief ─────────────────────────────────────────────────────────────────
  const perm = new Uint8Array(512);
  { const a = [...Array(256).keys()]; let s = 7; for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } for (let i = 0; i < 512; i++) perm[i] = a[i & 255]; }
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (hh, x, y) => { const k = hh & 7, u = k < 4 ? x : y, v = k < 4 ? y : x; return ((k & 1) ? -u : u) + ((k & 2) ? -2 * v : 2 * v); };
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255; x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y), a = perm[X] + Y, b = perm[X + 1] + Y;
    return mix(mix(grad(perm[a], x, y), grad(perm[b], x - 1, y), u), mix(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v) * .5;
  }
  const fbm = (x, y, o = 5) => { let s = 0, a = 1, f = 1; for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); a *= .5; f *= 2.03; } return s; };
  const trailX = z => Math.sin(z * .014) * 16 + Math.sin(z * .043 + 1.3) * 5;
  // Le fond de la vallée ondule doucement : la piste et la caméra le suivent sans à-coups.
  const floorY = z => Math.sin(z * .011) * 2.2 + Math.sin(z * .027 + 2.) * .9;
  function height(x, z) {
    const ridge = 1 - Math.abs(fbm(x * .012, z * .012));
    const hgt = fbm(x * .02 + 3, z * .02) * 16 + ridge * ridge * 34 - 6;
    const d = Math.abs(x - trailX(z));
    return mix(floorY(z), hgt, smooth(6, 36, d)) + Math.max(d - 6, 0) * .05;
  }

  // ─── La scène ──────────────────────────────────────────────────────────────────
  const canvas = q(".xp-canvas");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: "high-performance" }); } catch (e) { canvas.remove(); return; }
  let dpr = Math.min(devicePixelRatio, small ? 1.25 : 1.5);
  renderer.setPixelRatio(dpr);
  let slow = 0, frames = 0;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, .5, 4000);

  const Z0 = 60, Z1 = -330;
  // Lent pendant les respirations : on s'arrête presque avec Souffle.
  const pathZ = p => mix(Z0, Z1, smooth(0, .3, p) * .55 + smooth(.62, .88, p) * .45);

  const U = {
    uSkyTop: { value: new THREE.Color() }, uSkyMid: { value: new THREE.Color() }, uSkyLow: { value: new THREE.Color() },
    uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uFog: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() }, uRock: { value: new THREE.Color() }, uGrass: { value: new THREE.Color() },
    uCloudLit: { value: new THREE.Color() }, uCloudDark: { value: new THREE.Color() },
    uStars: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 1 }, uCam: { value: new THREE.Vector3() }, uTrail: { value: new THREE.Color("#D8FF85") }
  };
  const P = {
    top: ["#2a0a1c", "#020807"], mid: ["#d2481f", "#0a2a27"], low: ["#ffb466", "#16463d"], sun: ["#ffd08a", "#cfe8d8"],
    fog: ["#b9532f", "#0c2925"], ground: ["#2a1410", "#05110e"], rock: ["#6a3024", "#12302a"], grass: ["#432616", "#0b231d"],
    cloudLit: ["#ffb27a", "#2f5a52"], cloudDark: ["#5a1f30", "#071512"]
  };
  const pal = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.map(c => new THREE.Color(c))]));
  const NOISE_GLSL = `
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y); }
    float fbm2(vec2 p){ float s = 0., a = .5; for (int i = 0; i < ${small ? 4 : 6}; i++){ s += a * vnoise(p); p = p * 2.07 + 17.1; a *= .5; } return s; }`;

  // Ciel : dégradé, soleil et sa couronne, lumière rasante à l'horizon, nuages éclairés par-dessous, étoiles
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: U,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uSkyTop,uSkyMid,uSkyLow,uSun,uSunCol,uCloudLit,uCloudDark; uniform float uStars,uTime,uGlow; varying vec3 vDir;
      ${NOISE_GLSL}
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y; vec3 sun = normalize(uSun);
        vec3 c = y > .03 ? mix(uSkyMid, uSkyTop, smoothstep(.03, .62, y)) : mix(uSkyLow, uSkyMid, smoothstep(-.18, .03, y));
        float s = max(dot(d, sun), 0.);
        float az = max(dot(normalize(d.xz + 1e-4), normalize(sun.xz + 1e-4)), 0.);
        c += uSunCol * pow(az, 5.) * exp(-abs(y) * 7.) * .55 * uGlow;
        c += uSunCol * (pow(s, 2600.) * 6. + pow(s, 220.) * .7 + pow(s, 18.) * .35);
        vec2 uv = d.xz / (y + .18);
        float n = fbm2(uv * 1.3 + vec2(uTime * .006, 0.));
        float band = smoothstep(.02, .2, y) * (1. - smoothstep(.45, .85, y));
        float cl = smoothstep(.52, .78, n) * band;
        float lit = pow(s, 6.) * 1.4 + smoothstep(.25, .0, y) * .6;
        vec3 cc = mix(uCloudDark, uCloudLit, clamp(lit, 0., 1.));
        c = mix(c, cc, cl * .9);
        vec3 gcell = floor(d * 480.); float st = step(.9978, h3(gcell)) * smoothstep(.04, .3, y) * (1. - cl);
        c += vec3(st) * uStars * (.55 + .45 * sin(uTime * 2.3 + h3(gcell) * 40.));
        gl_FragColor = vec4(c, 1.);
      }`
  })));

  // Relief : sommets roses au couchant (alpenglow), brume chaude vers le soleil, grain du sol
  function terrainMat(fogK) {
    return new THREE.ShaderMaterial({
      uniforms: { ...U, uFogK: { value: fogK } },
      vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normal; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uSun,uSunCol,uFog,uGround,uRock,uGrass,uCam,uSkyLow; uniform float uGlow,uFogK; varying vec3 vN; varying vec3 vP;
        ${NOISE_GLSL}
        void main(){
          vec3 n = normalize(vN); float slope = 1. - n.y; vec3 sun = normalize(uSun);
          float grain = vnoise(vP.xz * .55) * .5 + vnoise(vP.xz * 2.3) * .5;
          vec3 base = mix(uGrass, uRock, smoothstep(.16, .5, slope + (grain - .5) * .15));
          base *= .86 + grain * .28;
          base = mix(base, uGround, smoothstep(10., -4., vP.y) * .55);
          float diff = max(dot(n, sun), 0.);
          vec3 c = base * (.32 + diff * 1.15 * uSunCol);
          c += vec3(1., .42, .5) * smoothstep(16., 42., vP.y) * (.25 + diff) * .55 * uGlow;
          vec3 v = normalize(vP - uCam);
          c += uSkyLow * pow(1. - max(dot(n, -v), 0.), 3.) * .16;
          float fog = 1. - exp(-pow(length(uCam - vP) * uFogK, 1.6));
          vec3 fogC = mix(uFog, uSunCol * 1.15, pow(max(dot(v, sun), 0.), 6.) * .7 * uGlow);
          gl_FragColor = vec4(mix(c, fogC, fog), 1.);
        }`
    });
  }
  const W = 440, L = 540, sx = small ? 110 : 210, sz = small ? 140 : 270;
  const tg = new THREE.PlaneGeometry(W, L, sx, sz); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -L / 2 + 90);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, height(tp.getX(i), tp.getZ(i)));
  tg.computeVertexNormals();
  scene.add(new THREE.Mesh(tg, terrainMat(.0042)));

  // Une chaîne lointaine, pour la profondeur
  const fg = new THREE.PlaneGeometry(3400, 1000, small ? 160 : 300, small ? 40 : 70); fg.rotateX(-Math.PI / 2); fg.translate(0, 0, -1250);
  const fp = fg.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); const r = 1 - Math.abs(fbm(x * .0016, z * .0016, 4)); fp.setY(i, r * r * 170 - 30 + fbm(x * .006, z * .006, 3) * 18); }
  fg.computeVertexNormals();
  scene.add(new THREE.Mesh(fg, terrainMat(.00115)));

  // Forêts : des sapins en silhouette, loin du sentier et sous les crêtes
  const treeN = reduce ? 600 : (small ? 700 : 1800);
  const trees = new THREE.InstancedMesh(new THREE.LatheGeometry([[0, 2.5], [.5, 1.35], [.28, 1.35], [.8, .2], [.42, .2], [1.1, -1.15], [.16, -1.15], [.16, -2.1]].map(([x, y]) => new THREE.Vector2(x, y)), 7), new THREE.MeshBasicMaterial({ color: "#120807", fog: true }), treeN);
  { const m = new THREE.Matrix4(), qn = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(); let k = 0, guard = 0;
    while (k < treeN && guard++ < treeN * 20) {
      const z = mix(Z0 + 40, Z1 - 140, Math.random()), x = (Math.random() - .5) * 260;
      const d = Math.abs(x - trailX(z)); const y = height(x, z);
      if (d < 7 || y > 24 || fbm(x * .03, z * .03, 2) < -.05) continue;
      const s = .7 + Math.random() * .9; pos.set(x, y + 2.1 * s - .3, z); sc.set(s, s * (.9 + Math.random() * .4), s);
      m.compose(pos, qn, sc); trees.setMatrixAt(k++, m);
    }
    trees.count = k; }
  scene.add(trees);
  scene.fog = new THREE.FogExp2("#b9532f", .0048);

  let shoulderMat;
  // La piste : un ruban de tartan à trois couloirs qui suit la vallée. La nuit, les lignes luisent en anis.
  { const pos = [], uv = [], idx = []; let n = 0;
    for (let z = Z0 + 40; z >= Z1 - 90; z -= 2) {
      const cx = trailX(z), dx = (trailX(z - 1) - trailX(z + 1)) / 2, len = Math.hypot(dx, 1), nx = 1 / len, nz = dx / len;
      const hw = 3.1, y = floorY(z) + .12;
      pos.push(cx - nx * hw, y, z + nz * hw, cx + nx * hw, y, z - nz * hw); uv.push(0, z, 1, z);
      if (n) idx.push(n * 2 - 2, n * 2 - 1, n * 2, n * 2 - 1, n * 2 + 1, n * 2); n++;
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); rg.setIndex(idx);
    scene.add(new THREE.Mesh(rg, new THREE.ShaderMaterial({
      uniforms: U, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: `varying vec3 vP; varying vec2 vUv; void main(){ vP = position; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uFog,uSunCol,uSun,uCam; uniform float uGlow,uTime; varying vec3 vP; varying vec2 vUv;
        ${NOISE_GLSL}
        void main(){
          float u = vUv.x;
          float kerb = step(u, .07) + step(.93, u);
          float l = min(min(abs(u - .09), abs(u - .363)), min(abs(u - .637), abs(u - .91)));
          float line = 1. - smoothstep(.005, .011, l);
          line = max(line, (1. - smoothstep(.06, .12, abs(fract(vP.z / 50.) - .5) * 50.)) * .55 * smoothstep(8., 30., length(uCam - vP)));
          vec3 tartan = mix(vec3(.07, .17, .15), vec3(.66, .2, .12), uGlow) * (.82 + .36 * vnoise(vP.xz * 3.));
          vec3 c = tartan * (.42 + .75 * uSunCol);
          vec3 lc = mix(vec3(.85, 1., .52) * (.55 + .18 * sin(vP.z * .25 + uTime * 2.2)), vec3(.78, .72, .66), uGlow);
          c = mix(c, lc, line);
          // Les bordures : vibreurs blanc et rouge, un peu plus clairs au couchant
          vec3 kc = mix(vec3(.62, .62, .6), vec3(.7, .14, .1), step(.5, fract(vP.z / 1.6)));
          c = mix(c, kc * (.45 + .7 * uSunCol) * mix(.55, 1., uGlow), kerb);
          // La ligne d'arrivée, en damier, sous l'arche
          float fz = abs(vP.z - (${(Z0 - 16).toFixed(1)}));
          float chk = step(.5, fract(floor(u * 14.) * .5 + floor((vP.z - ${(Z0 - 16).toFixed(1)}) / .45) * .5));
          c = mix(c, mix(vec3(.08), vec3(.85), chk) * (.5 + .6 * uSunCol), (1. - step(.9, fz)) * (1. - kerb));
          vec3 v = normalize(vP - uCam);
          float fog = 1. - exp(-pow(length(uCam - vP) * .0042, 1.6));
          vec3 fogC = mix(uFog, uSunCol * 1.15, pow(max(dot(v, normalize(uSun)), 0.), 6.) * .7 * uGlow);
          gl_FragColor = vec4(mix(c, fogC, fog), 1.);
        }`
    }))); }

  // L'accotement : une bande de terre battue de part et d'autre, pour que la piste soit posée dans le paysage
  { const pos = [], idx = []; let n = 0;
    for (let z = Z0 + 40; z >= Z1 - 90; z -= 2) {
      const cx = trailX(z), dx = (trailX(z - 1) - trailX(z + 1)) / 2, len = Math.hypot(dx, 1), nx = 1 / len, nz = dx / len, hw = 4.6, y = floorY(z) + .06;
      pos.push(cx - nx * hw, y, z + nz * hw, cx + nx * hw, y, z - nz * hw);
      if (n) idx.push(n * 2 - 2, n * 2 - 1, n * 2, n * 2 - 1, n * 2 + 1, n * 2); n++;
    }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g2.setIndex(idx);
    shoulderMat = new THREE.MeshBasicMaterial({ color: "#3b2219", polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, side: THREE.DoubleSide });
    scene.add(new THREE.Mesh(g2, shoulderMat)); }

  // Le mot de l'arche, dans la langue du visiteur (celle de son navigateur).
  const finishWord = () => {
    const words = { fr: "ARRIVÉE", en: "FINISH", es: "META", de: "ZIEL", it: "ARRIVO", pt: "CHEGADA", nl: "FINISH", ca: "ARRIBADA", pl: "META", sv: "MÅL", da: "MÅL", no: "MÅL", nb: "MÅL", fi: "MAALI", cs: "CÍL", tr: "BİTİŞ", ja: "ゴール", zh: "终点", ko: "결승선", ar: "النهاية", ru: "ФИНИШ", el: "ΤΕΡΜΑΤΙΣΜΟΣ" };
    // D'abord la langue de la page (celle que la personne lit), puis celles de son navigateur.
    for (const l of [document.documentElement.lang || "", ...(navigator.languages?.length ? navigator.languages : [navigator.language || "fr"])].filter(Boolean)) { const w = words[l.toLowerCase().split("-")[0]]; if (w) return w; }
    return "FINISH";
  };
  // L'arche d'arrivée, qu'on franchit au tout début, et les plots le long de la piste
  const sportMats = [];
  { const az = Z0 - 16, ax = trailX(az), ay = floorY(az);
    const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 160; const c = cv.getContext("2d");
    c.fillStyle = "#0A211F"; c.fillRect(0, 0, 1024, 160);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? "#F7F9F2" : "#0A211F"; c.fillRect(i * 20, j * 40, 20, 40); c.fillRect(864 + i * 20, j * 40, 20, 40); }
    c.fillStyle = "#D8FF85"; { const w = finishWord(); c.font = `700 ${w.length > 9 ? 64 : 96}px Inter, system-ui, sans-serif`; } c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(finishWord(), 512, 86);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const bm = new THREE.MeshBasicMaterial({ map: tex }), pm = new THREE.MeshBasicMaterial({ color: "#F7F9F2" }); sportMats.push(bm, pm);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.2, .25), bm); banner.position.set(ax, ay + 6.6, az);
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(.3, 7.2, .3), pm), p2 = p1.clone(); p1.position.set(ax - 3.7, ay + 3.6, az); p2.position.set(ax + 3.7, ay + 3.6, az);
    scene.add(banner, p1, p2);
    const cm = new THREE.MeshBasicMaterial({ color: "#ff6a2a" }); sportMats.push(cm);
    const count = 14, cones = new THREE.InstancedMesh(new THREE.ConeGeometry(.24, .62, 12), cm, count), m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) { const z = Z0 - 70 - i * 9, sd = i % 2 ? 1 : -1, x = trailX(z) + sd * 3.6; m.makeTranslation(x, floorY(z) + .47, z); cones.setMatrixAt(i, m); }
    scene.add(cones);

    // Le chrono, posé sur l'arche
    const cc = document.createElement("canvas"); cc.width = 512; cc.height = 128; const x2 = cc.getContext("2d");
    x2.fillStyle = "#050807"; x2.fillRect(0, 0, 512, 128); x2.fillStyle = "#D8FF85"; x2.font = "700 92px ui-monospace, Menlo, monospace"; x2.textAlign = "center"; x2.textBaseline = "middle"; x2.fillText("0:46:12", 256, 68);
    const ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace;
    const clockMat = new THREE.MeshBasicMaterial({ map: ct, toneMapped: false }); sportMats.push(clockMat);
    const clock3 = new THREE.Mesh(new THREE.BoxGeometry(2.6, .65, .2), clockMat); clock3.position.set(ax, ay + 7.65, az); scene.add(clock3);

    // Les barrières de l'arrivée, habillées de banderoles Replere, sur les 90 premiers mètres
    const bc = document.createElement("canvas"); bc.width = 512; bc.height = 128; const x3 = bc.getContext("2d");
    x3.fillStyle = "#0A211F"; x3.fillRect(0, 0, 512, 128); x3.fillStyle = "#D8FF85"; x3.fillRect(0, 108, 512, 20);
    x3.fillStyle = "#F7F9F2"; x3.font = "600 64px Inter, system-ui, sans-serif"; x3.textAlign = "center"; x3.textBaseline = "middle"; x3.fillText("replere", 256, 56);
    const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 4;
    const barMat = new THREE.MeshBasicMaterial({ map: bt }); sportMats.push(barMat);
    const nb = 2 * 40, bars = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, .95, .06), barMat, nb), mb = new THREE.Matrix4(), qb = new THREE.Quaternion(), e = new THREE.Euler(), pb = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    let ib = 0;
    for (let i = 0; i < 40; i++) for (const sd of [-1, 1]) {
      const z = Z0 + 24 - i * 2.4; if (Math.abs(z - az) < 1.4) continue;
      const tx = (trailX(z - 1) - trailX(z + 1)) / 2; e.set(0, Math.atan2(1, tx), 0);
      const len = Math.hypot(tx, 1); pb.set(trailX(z) + sd * 4.25 / len, floorY(z) + .55, z - sd * 4.25 * tx / len);
      mb.compose(pb, qb.setFromEuler(e), one); bars.setMatrixAt(ib++, mb);
    }
    bars.count = ib; scene.add(bars); }

  // Les bornes lumineuses : à la nuit tombée, elles s'allument une à une le long de la piste
  const lamps = [];
  { const poleM = new THREE.MeshBasicMaterial({ color: "#0d0a09" });
    const gl = document.createElement("canvas"); gl.width = gl.height = 64;
    { const c = gl.getContext("2d"), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "#fff"); gr.addColorStop(.2, "rgba(255,255,255,.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }
    const gt = new THREE.CanvasTexture(gl);
    for (let i = 0; i < 30; i++) {
      const z = Z0 - 8 - i * 13, sd = i % 2 ? 1 : -1, x = trailX(z) + sd * 4.9, y = floorY(z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, 1.25, 6), poleM); pole.position.set(x, y + .62, z); scene.add(pole);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: "#E9FFC4", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      glow.position.set(x, y + 1.32, z); glow.scale.setScalar(.9); scene.add(glow);
      lamps.push({ glow, i });
    }
  }


  // Rochers au bord de la vallée
  const rockMat = new THREE.MeshBasicMaterial({ color: "#3a1c16" });
  { const n = small ? 160 : 420, rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockMat, n), m = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) { const z = mix(Z0 + 40, Z1 - 120, Math.random()), sd = Math.random() < .5 ? -1 : 1, x = trailX(z) + sd * (5 + Math.random() * Math.random() * 60), s0 = .25 + Math.random() * Math.random() * 1.6;
      pos.set(x, height(x, z) + s0 * .25, z); e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); sc.set(s0, s0 * (.5 + Math.random() * .4), s0 * (.7 + Math.random() * .6));
      m.compose(pos, qn.setFromEuler(e), sc); rocks.setMatrixAt(i, m); }
    scene.add(rocks); }

  // Fanions de course le long de la piste, qui flottent dans le vent
  const flagMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: { ...U, uDim: { value: 1 } },
    vertexShader: `uniform float uTime; attribute vec3 aCol; varying vec3 vC; varying vec3 vP;
      void main(){ vC = aCol; vec3 p = position; vec4 w = instanceMatrix * vec4(p, 1.);
        float fl = max(p.x, 0.); w.z += sin(uTime * 4. + w.x * .7 + w.y) * .18 * fl; w.y += sin(uTime * 3. + w.z) * .05 * fl;
        vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uFog,uCam; uniform float uDim; varying vec3 vC; varying vec3 vP;
      void main(){ float fog = 1. - exp(-pow(length(uCam - vP) * .0042, 1.6)); gl_FragColor = vec4(mix(vC * uDim, uFog, fog), 1.); }`
  });
  { const fgm = new THREE.BufferGeometry();
    // un mât fin et un fanion triangulaire
    fgm.setAttribute("position", new THREE.Float32BufferAttribute([-.03, 0, 0, .03, 0, 0, .03, 2.6, 0, -.03, 0, 0, .03, 2.6, 0, -.03, 2.6, 0, .03, 2.6, 0, .03, 1.9, 0, 1.15, 2.25, 0], 3));
    const n = 44, flags = new THREE.InstancedMesh(fgm, flagMat, n), m = new THREE.Matrix4(), cols = new Float32Array(n * 3), pal3 = [[.6, .72, .36], [.62, .62, .6], [.75, .3, .12]];
    for (let i = 0; i < n; i++) { const z = Z0 + 26 - i * 10.5, sd = i % 2 ? 1 : -1, x = trailX(z) + sd * 3.9; m.makeTranslation(x, floorY(z), z); flags.setMatrixAt(i, m); cols.set(pal3[i % 3], i * 3); }
    fgm.setAttribute("aCol", new THREE.InstancedBufferAttribute(cols, 3)); flags.frustumCulled = false; scene.add(flags); }

  // Poussière et braises autour de nous
  const N = reduce ? 0 : (small ? 500 : 1400);
  const dust = new Float32Array(N * 3), seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) { dust[i * 3] = (Math.random() - .5) * 60; dust[i * 3 + 1] = Math.random() * 30 - 4; dust[i * 3 + 2] = (Math.random() - .5) * 80; seeds[i] = Math.random(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(dust, 3));
  const dot = document.createElement("canvas"); dot.width = dot.height = 64;
  { const c = dot.getContext("2d"), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "#fff"); gr.addColorStop(.35, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }
  const dm = new THREE.PointsMaterial({ size: small ? .32 : .24, map: new THREE.CanvasTexture(dot), color: "#ffb36b", transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const motes = new THREE.Points(dg, dm); scene.add(motes);
  const warmC = new THREE.Color("#ffb36b"), coolC = new THREE.Color("#D8FF85");

  // Souffle, son aura, l'anneau du souffle ; à la fin, elle monte et devient la lune
  const loader = new THREE.TextureLoader();
  const texCalm = loader.load(base + "souffle.png"), texMoon = loader.load(base + "souffle-lune.png");
  texCalm.colorSpace = texMoon.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group(); scene.add(grp);
  const spriteMat = o => new THREE.SpriteMaterial({ map: o, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, color: new THREE.Color(.84, .84, .84), fog: false });
  const souffle = new THREE.Sprite(spriteMat(texCalm)), moon = new THREE.Sprite(spriteMat(texMoon));
  const auraMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    uniforms: { uO: { value: 0 }, uC: { value: new THREE.Color("#D8FF85") } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uO; uniform vec3 uC; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1. - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(uC * f * .9, f * uO); }`
  });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), auraMat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .012, 8, 160), new THREE.MeshBasicMaterial({ color: "#D8FF85", transparent: true, opacity: 0, fog: false }));
  aura.renderOrder = 1; ring.renderOrder = 2; souffle.renderOrder = 3; moon.renderOrder = 3;
  grp.add(aura, ring, souffle, moon);

  // Halo lumineux, sur ordinateur
  let composer = null, bloom = null;
  if (!small && !reduce) {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import("three/addons/postprocessing/EffectComposer.js"), import("three/addons/postprocessing/RenderPass.js"),
        import("three/addons/postprocessing/UnrealBloomPass.js"), import("three/addons/postprocessing/OutputPass.js")]);
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .6, .5, .86);
      const bs = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => bs(Math.round(w / 2), Math.round(h / 2));
      composer.addPass(bloom); composer.addPass(new OutputPass());
    } catch (e) { composer = null; }
  }

  const stage = q(".xp-stage");
  let lastW = 0, lastH = 0;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w === lastW && Math.abs(h - lastH) < 160) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false); composer?.setSize(w, h);
    camera.aspect = w / h; camera.fov = w / h < .8 ? 72 : 58; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  const look = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const lerpU = (u, k, t) => u.value.copy(pal[k][0]).lerp(pal[k][1], t);
  const COLORS = Object.entries({ top: "uSkyTop", mid: "uSkyMid", low: "uSkyLow", sun: "uSunCol", fog: "uFog", ground: "uGround", rock: "uRock", grass: "uGrass", cloudLit: "uCloudLit", cloudDark: "uCloudDark" });
  const clock = new THREE.Clock();
  let moving = 0, stridePhase = 0;
  function frame() {
    requestAnimationFrame(frame);
    const raw = clock.getDelta(), dt = Math.min(raw, .05);
    if (!S.visible) return;
    // Si les images arrivent trop lentement (moins de ~40 par seconde), on baisse la finesse un cran.
    if (++frames > 30) { slow = slow * .9 + (raw > .026 ? .1 : 0); if (slow > .5 && dpr > .9) { dpr = Math.max(.85, dpr - .2); renderer.setPixelRatio(dpr); composer?.setPixelRatio?.(dpr); lastW = 0; resize(); slow = 0; } }                       // rien à dessiner hors de l'écran : la batterie dit merci
    const t = clock.elapsedTime;
    S.p += (S.pT - S.p) * (reduce ? 1 : Math.min(1, dt * 3));
    const p = S.p, k = S.calm, end = smooth(.8, .97, p);
    U.uTime.value = t;

    for (const [key, u] of COLORS) lerpU(U[u], key, k);
    U.uSunCol.value.multiplyScalar(mix(1, .22, k));
    U.uGlow.value = 1 - smooth(.25, .7, k);
    U.uSun.value.set(-.32, mix(.14, -.14, smooth(0, .62, p)), -1).normalize();
    U.uStars.value = smooth(.35, .75, p);
    scene.fog.color.copy(U.uFog.value);
    trees.material.color.copy(U.uGround.value).multiplyScalar(.42);
    shoulderMat.color.set("#3b2219").lerp(new THREE.Color("#0b1513"), k);
    for (const L of lamps) { const on = smooth(.45 + L.i * .006, .5 + L.i * .006, k); L.glow.material.opacity = on * (.75 + .1 * Math.sin(t * 1.3 + L.i)); L.glow.scale.setScalar(.6 + on * .9); }
    rockMat.color.copy(U.uRock.value).multiplyScalar(.5); flagMat.uniforms.uDim.value = mix(1, .35, k);
    { const v = mix(.6, .22, k); for (const mt of sportMats) mt.color.setScalar(1).multiplyScalar(v); sportMats[2].color.set("#ff6a2a").multiplyScalar(v); sportMats[3].color.setScalar(mix(1, .8, k)); }

    // Caméra : elle suit la piste sans à-coups. La foulée s'éteint avec le calme ; à la fin, elle lève les yeux.
    // La foulée n'existe que pendant qu'on avance : à l'arrêt (pendant qu'on lit), l'image reste parfaitement immobile.
    moving += (Math.min(1, Math.abs(S.pT - S.p) * 60) - moving) * Math.min(1, dt * 4);
    stridePhase += dt * 5.2 * moving;
    const z = pathZ(p), bob = reduce ? 0 : (1 - k) * moving;
    const stride = Math.sin(stridePhase);
    camera.position.set(trailX(z) + Math.sin(stridePhase / 2) * .04 * bob, floorY(z) + 3.3 + stride * stride * .07 * bob, z);
    const lx = (trailX(z - 14) + trailX(z - 24) + trailX(z - 34)) / 3;
    look.set(lx, floorY(z - 24) + 2.7 + k * 1.2 + end * 26, z - 24);
    camera.lookAt(look);
    U.uCam.value.copy(camera.position);

    // Souffle : devant nous, puis elle s'élève loin dans le ciel et devient la lune
    camera.getWorldDirection(fwd); right.crossVectors(fwd, up).normalize();
    const appear = smooth(.17, .27, p);
    const side = 0;
    const dist = mix(11, 90, end);
    const wide = stage.clientWidth / stage.clientHeight > 1.1;
    grp.position.copy(camera.position).addScaledVector(fwd, dist).addScaledVector(right, side + end * (wide ? 46 : 0));
    grp.position.y += .9 + Math.sin(t * .5) * .03 + end * (wide ? 22 : 44);
    grp.quaternion.copy(camera.quaternion);
    const b = S.breath, sc = mix(1.55, 2.05, b) * mix(.6, 1, appear) * mix(1, 7.5, end);
    souffle.scale.set(sc, sc, 1); moon.scale.set(sc * 1.05, sc * 1.05, 1);
    souffle.material.opacity = appear * (1 - smooth(.86, .93, p));
    moon.material.opacity = smooth(.86, .93, p);
    aura.scale.setScalar(mix(1.5, 2.3, b) * mix(1, 7, end)); auraMat.uniforms.uO.value = appear * mix(.25, .6, b) * mix(1, .45, end);
    ring.scale.setScalar(mix(1.7, 2.6, b)); ring.material.opacity = appear * (S.inBreath ? .9 : .35) * (1 - smooth(.78, .82, p));
    ring.visible = ring.material.opacity > .01;

    if (N) {
      const a = dg.attributes.position.array, sp = mix(3.2, .25, k), jit = mix(.08, .004, k);
      for (let i = 0; i < N; i++) { const j = i * 3; a[j + 1] += dt * sp * (.4 + seeds[i]); a[j] += Math.sin(t * 3 + seeds[i] * 50) * jit; if (a[j + 1] > 26) a[j + 1] = -4; }
      dg.attributes.position.needsUpdate = true;
      motes.position.set(camera.position.x, camera.position.y - 6, camera.position.z - 20);
      dm.color.copy(warmC).lerp(coolC, k); dm.opacity = mix(.8, .5, k) * (1 - end * .6);
    }

    if (bloom) bloom.strength = mix(.45, .75, k);
    composer ? composer.render() : renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
}
