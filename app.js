(() => {
  'use strict';

  /* ---------------------------------------------------------------
     Simulação do sensor
     Regras idênticas ao sketch: leitura_cm é um int (truncado)
       <= 10  -> LED vermelho + buzzer
       11-20  -> LED amarelo
       >= 21  -> LED verde
  ---------------------------------------------------------------- */
  const V = 0.0343;              // velocidade do som em cm/µs (343 m/s)
  const DMIN = 2, DMAX = 50;     // faixa da simulação (cm)
  const TMAX = (2 * DMAX) / V;   // maior tempo de eco possível na simulação (µs)
  const CYCLE = 2800;            // duração de cada ciclo animado (ms)

  const $ = (s) => document.querySelector(s);
  const canvas = $('#scope');
  const ctx = canvas.getContext('2d');
  const range = $('#dist');
  const outD = $('#out-d'), outT = $('#out-t'), outF = $('#out-f');
  const soundBtn = $('#sound');
  const ledItems = document.querySelectorAll('.leds li');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const nf = new Intl.NumberFormat('pt-BR');
  let d = Number(range.value);
  let W = 0, H = 0, dpr = 1;
  let startT = performance.now();
  let running = false, visible = true;

  const zoneOf = (cm) => (cm <= 10 ? 'red' : cm <= 20 ? 'amber' : 'green');
  const echoUs = (cm) => Math.round((2 * cm) / V);

  /* ---------- painel de leitura ---------- */
  function updateReadout() {
    const t = echoUs(d);
    outD.textContent = d;
    outT.textContent = nf.format(t) + ' µs';
    outF.textContent = 'D = (0,0343 × ' + nf.format(t) + ') / 2';
    const z = zoneOf(d);
    ledItems.forEach((li) => li.setAttribute('data-on', String(li.dataset.led === z)));
    setBuzz(z === 'red');
    range.setAttribute('aria-valuetext', d + ' centímetros');
  }

  /* ---------- buzzer (Web Audio, só depois de clicar) ---------- */
  let actx = null, osc = null, gain = null, beepTimer = null, soundOn = false, wantBuzz = false;

  function setBuzz(on) {
    wantBuzz = on;
    clearInterval(beepTimer);
    beepTimer = null;
    if (gain) gain.gain.setTargetAtTime(0, actx.currentTime, 0.01);
    if (on && soundOn && actx) {
      let high = true;
      const tick = () => {
        gain.gain.setTargetAtTime(high ? 0.05 : 0, actx.currentTime, 0.008);
        high = !high;
      };
      tick();
      beepTimer = setInterval(tick, 170);
    }
  }

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.textContent = soundOn ? 'Desativar som do buzzer' : 'Ativar som do buzzer';
    if (soundOn && !actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { soundOn = false; soundBtn.disabled = true; soundBtn.textContent = 'Som indisponível neste navegador'; return; }
      actx = new AC();
      osc = actx.createOscillator();
      gain = actx.createGain();
      osc.type = 'square';
      osc.frequency.value = 2400;
      gain.gain.value = 0;
      osc.connect(gain).connect(actx.destination);
      osc.start();
    }
    if (actx && actx.state === 'suspended') actx.resume();
    setBuzz(wantBuzz);
  });

  /* ---------- canvas ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!running) draw(performance.now());
  }

  function geometry() {
    const sceneH = H - 108;
    const x0 = 64;                       // face do sensor
    const x1 = W - 34;                   // fim da escala
    const scale = (x1 - x0) / DMAX;      // px por cm
    return { sceneH, x0, x1, scale, cy: sceneH / 2 + 4 };
  }

  const MONO = '12px "JetBrains Mono", ui-monospace, monospace';

  function arc(cx, cy, r, a0, a1, color, alpha, lw) {
    if (r < 3) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function draw(now) {
    if (!W) return;
    const g = geometry();
    const { sceneH, x0, x1, scale, cy } = g;
    const ox = x0 + d * scale;           // face esquerda do obstáculo
    const t = echoUs(d);

    // posição no ciclo: 0..1 durante ida e volta, depois segura
    let p = 1;
    if (!reduce.matches) {
      const phase = ((now - startT) % CYCLE) / CYCLE;
      p = Math.min(phase / 0.72, 1);
    }

    ctx.clearRect(0, 0, W, H);

    // faixas de alerta (11 cm e 21 cm)
    const xr = x0 + 11 * scale, xa = x0 + 21 * scale;
    const zones = [
      [x0, xr, 'rgba(240,72,62,0.14)'],
      [xr, xa, 'rgba(245,182,58,0.11)'],
      [xa, x1, 'rgba(53,208,127,0.09)'],
    ];
    zones.forEach(([a, b, c]) => { ctx.fillStyle = c; ctx.fillRect(a, 8, b - a, sceneH - 8); });

    // grade
    ctx.strokeStyle = 'rgba(154,169,194,0.12)';
    ctx.lineWidth = 1;
    for (let cm = 0; cm <= DMAX; cm += 5) {
      const x = Math.round(x0 + cm * scale) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, sceneH); ctx.stroke();
    }
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(230,236,246,0.35)';
    [xr, xa].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, sceneH); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.font = MONO;
    ctx.fillStyle = 'rgba(230,236,246,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('11 cm', xr, 22);
    ctx.fillText('21 cm', xa, 22);

    // ondas
    const out = p < 0.5;
    if (p < 1) {
      if (out) {
        const front = (p / 0.5) * (ox - x0);
        for (let k = 0; k < 4; k++) arc(x0, cy, front - k * 15, -0.62, 0.62, '#5b8cff', 1 - k * 0.22, 3);
      } else {
        const back = ((p - 0.5) / 0.5) * (ox - x0);
        for (let k = 0; k < 4; k++) arc(ox, cy, back - k * 15, Math.PI - 0.62, Math.PI + 0.62, '#ff6b5e', 1 - k * 0.22, 3);
      }
    }

    // obstáculo
    ctx.fillStyle = '#d5deec';
    roundRect(ox, cy - 56, 14, 112, 4); ctx.fill();
    ctx.fillStyle = '#0b1424';
    for (let i = -1; i <= 1; i++) ctx.fillRect(ox + 4, cy - 6 + i * 12, 6, 2);

    // sensor HC-SR04 (placa azul com dois transdutores)
    ctx.fillStyle = '#1f4fb8';
    roundRect(x0 - 30, cy - 44, 30, 88, 4); ctx.fill();
    [-22, 22].forEach((dy, i) => {
      ctx.fillStyle = '#c9d3e3';
      ctx.beginPath(); ctx.arc(x0 - 15, cy + dy, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#0b1424';
      ctx.beginPath(); ctx.arc(x0 - 15, cy + dy, 7.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#9fb7ea';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(i ? 'R' : 'T', x0 - 15, cy + dy + 3.5);
    });

    // cota da distância
    const dy = cy + 72;
    ctx.strokeStyle = 'rgba(230,236,246,0.8)';
    ctx.fillStyle = 'rgba(230,236,246,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, dy); ctx.lineTo(ox, dy); ctx.stroke();
    [[x0, 1], [ox, -1]].forEach(([x, s]) => {
      ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x + s * 7, dy - 4); ctx.lineTo(x + s * 7, dy + 4); ctx.closePath(); ctx.fill();
    });
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const label = 'd = ' + d + ' cm';
    const mid = (x0 + ox) / 2;
    const tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = '#08101d';
    ctx.fillRect(mid - tw / 2, dy - 10, tw, 20);
    ctx.fillStyle = '#e6ecf6';
    ctx.fillText(label, mid, dy + 4.5);

    // ---- linhas de tempo: Trigger e Echo ----
    const laneX0 = 78, laneX1 = W - 26;
    const top = sceneH + 22;
    const laneH = 26, gap = 22;
    const y1 = top, y2 = top + laneH + gap;
    ctx.font = MONO;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(230,236,246,0.75)';
    ctx.fillText('Trigger', 16, y1 + laneH - 8);
    ctx.fillText('Echo', 16, y2 + laneH - 8);

    // trigger: pulso curto de 10 µs
    const tx = laneX0 + 8;
    ctx.strokeStyle = '#e6ecf6'; ctx.lineWidth = 2; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(laneX0, y1 + laneH); ctx.lineTo(tx, y1 + laneH); ctx.lineTo(tx, y1 + 2);
    ctx.lineTo(tx + 6, y1 + 2); ctx.lineTo(tx + 6, y1 + laneH); ctx.lineTo(laneX1, y1 + laneH);
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,236,246,0.6)';
    ctx.fillText('10 µs', tx + 14, y1 + 12);

    // echo: sobe na emissão e desce quando o eco volta; largura = tempo medido
    const ex0 = tx + 6;
    const ew = (t / TMAX) * (laneX1 - ex0 - 90);
    const cur = ex0 + ew * p;
    ctx.strokeStyle = '#5b8cff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(laneX0, y2 + laneH);
    ctx.lineTo(ex0, y2 + laneH);
    ctx.lineTo(ex0, y2 + 2);
    ctx.lineTo(cur, y2 + 2);
    if (p >= 1) { ctx.lineTo(cur, y2 + laneH); ctx.lineTo(laneX1, y2 + laneH); }
    ctx.stroke();
    if (p < 1) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255,107,94,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cur, y1 - 4); ctx.lineTo(cur, y2 + laneH + 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = '#9fb7ea';
    ctx.textAlign = 'left';
    ctx.fillText('Echo alto por ' + nf.format(t) + ' µs', Math.min(ex0 + ew + 12, laneX1 - 150), y2 + 14);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function loop(now) {
    if (!running) return;
    draw(now);
    requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduce.matches || !visible) return;
    running = true;
    requestAnimationFrame(loop);
  }
  function stop() { running = false; }

  function setDistance(v, restart) {
    d = Math.max(DMIN, Math.min(DMAX, Math.round(v)));
    range.value = d;
    updateReadout();
    if (restart) startT = performance.now();
    if (!running) draw(performance.now());
  }

  range.addEventListener('input', () => setDistance(Number(range.value), true));

  // arrastar na simulação
  let dragging = false;
  const fromPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    const { x0, scale } = geometry();
    setDistance((e.clientX - r.left - x0) / scale, true);
  };
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    if (e.clientY - r.top > H - 100) return; // só na área do cenário
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  canvas.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    visible ? start() : stop();
  }, { threshold: 0.05 }).observe(canvas);
  reduce.addEventListener('change', () => { reduce.matches ? stop() : start(); draw(performance.now()); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => draw(performance.now()));

  updateReadout();
  resize();
  start();

  /* ---------------------------------------------------------------
     Realce de sintaxe do sketch (sem dependências)
  ---------------------------------------------------------------- */
  (function highlight() {
    const el = document.getElementById('code');
    if (!el) return;
    const src = el.textContent;
    const rx = /("(?:[^"\\]|\\.)*")|(#\s*(?:include|define))|(\b\d+(?:\.\d+)?\b)|\b(void|int|long|float|if|else|return)\b|\b(Ultrasonic|Serial)\b|\b(OUTPUT|HIGH|LOW|CM)\b|\b([A-Za-z_]\w*)(?=\()/g;
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let out = '', last = 0, m;
    while ((m = rx.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'tk-s' : m[2] ? 'tk-p' : m[3] ? 'tk-n' : m[4] ? 'tk-k' : m[5] ? 'tk-t' : m[6] ? 'tk-n' : 'tk-f';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = rx.lastIndex;
    }
    out += esc(src.slice(last));
    el.innerHTML = out;
  })();

  /* ---------------------------------------------------------------
     Um vídeo por vez
  ---------------------------------------------------------------- */
  const vids = Array.from(document.querySelectorAll('video[data-v]'));
  vids.forEach((v) => v.addEventListener('play', () => vids.forEach((o) => { if (o !== v) o.pause(); })));

  /* ---------------------------------------------------------------
     Navegação: marca a seção visível
  ---------------------------------------------------------------- */
  const links = Array.from(document.querySelectorAll('.top nav a'));
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  // "Testes" (sem link próprio) pertence a Hardware e código
  const alias = { testes: 'hardware' };
  const secs = Array.from(document.querySelectorAll('main section[id]'));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = alias[en.target.id] || en.target.id;
      links.forEach((a) => a.removeAttribute('aria-current'));
      const a = map.get(id);
      if (a) {
        a.setAttribute('aria-current', 'true');
        revealLink(a);
      }
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  secs.forEach((s) => spy.observe(s));

  // Centraliza o link ativo rolando SÓ a lista do menu.
  // (scrollIntoView também rola a página de fora quando o site está
  // dentro de um iframe, como no Google Sites, e isso travava a rolagem.)
  const navList = links[0].closest('ul');
  function revealLink(a) {
    if (navList.scrollWidth <= navList.clientWidth) return;
    const left = a.getBoundingClientRect().left - navList.getBoundingClientRect().left + navList.scrollLeft;
    navList.scrollTo({ left: left - (navList.clientWidth - a.offsetWidth) / 2, behavior: 'auto' });
  }

  // Cliques no menu: rola só este documento, nunca a página que o contém.
  const header = document.querySelector('.top');
  links.forEach((a) => a.addEventListener('click', (e) => {
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - header.offsetHeight + 1;
    window.scrollTo({ top, behavior: reduce.matches ? 'auto' : 'smooth' });
    try { history.replaceState(null, '', a.getAttribute('href')); } catch (_) {}
  }));
})();