// Sunlight crossing the atmosphere to the observer (slides 7–8).
// Packets of light leave the sun in each color band. Inside the atmosphere,
// each packet may be scattered sideways, with odds set by the real physics:
// blue far more than red, and much more of everything when the path is long.
// Scattered packets leave a soft colored glow, the "sky".
import { BANDS, opticalDepthOverhead, airMass, prefersReducedMotion } from './physics.js';

const SPAWN_PER_SEC = 90;
const SPEED = 230;            // px/s along the beam
const SCATTER_SPEED = 40;
const SCATTER_LIFE = 1.8;
const HAZE_DEPTH = 0.02;      // a little extra, color-neutral scattering
// The animation scatters twice as much as real air does, so the effect is
// visible in a few seconds. The ratios between colors stay true to the physics.
const VISIBILITY = 2;

export function createSunlight(content, { sun, observer, earth, atmosphere }) {
  const canvas = document.createElement('canvas');
  canvas.id = 'sunlight-fx';
  canvas.setAttribute('aria-hidden', 'true');
  content.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  // A soft round glow for each color, drawn wherever light has just been scattered.
  const sprites = new Map(BANDS.map(b => {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const g = c.getContext('2d'), grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    grad.addColorStop(0, `rgba(${b.color},0.8)`);
    grad.addColorStop(1, `rgba(${b.color},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, 48, 48);
    return [b, c];
  }));

  let packets = [], angle = 90, raf = 0, last = 0, spawnDebt = 0, dpr = 1, running = false;

  // The canvas covers the whole window (the low sun sits out in the side
  // margin), while drawing still uses #content's coordinates.
  let offX = 0, offY = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = content.getBoundingClientRect();
    offX = c.left; offY = c.top;
    const w = window.innerWidth, h = Math.max(window.innerHeight, 600);
    Object.assign(canvas.style, { left: -offX + 'px', top: -offY + 'px', width: w + 'px', height: h + 'px' });
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }

  function geometry() {
    const s = box(sun), o = box(observer), e = box(earth), a = box(atmosphere);
    const earthR = e.w * 356.5 / 750;   // the planet's disc inside earth-day.png
    return {
      // The stream keeps the width it had with the sun at twice today's size.
      sun: { x: s.x + s.w / 2, y: s.y + s.h / 2, beam: s.w * 2 * 0.46 },
      obs: { x: o.x + o.w / 2, y: o.y + o.h * 0.55 },
      earth: { x: e.x + e.w / 2, y: e.y + e.h / 2, r: earthR },
      atmosR: a.w ? a.w / 2 : earthR * 1.37,
    };
  }

  function spawn(g) {
    const band = BANDS[Math.floor(Math.random() * BANDS.length)];
    const dx = g.obs.x - g.sun.x, dy = g.obs.y - g.sun.y, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const off = (Math.random() - 0.5) * g.sun.beam * 0.55;    // spread across the beam
    const sx = g.sun.x - uy * off, sy = g.sun.y + ux * off;

    // Where the beam enters the atmosphere (first crossing of the halo circle).
    const fx = sx - g.earth.x, fy = sy - g.earth.y;
    const b = fx * ux + fy * uy, c = fx * fx + fy * fy - g.atmosR * g.atmosR;
    const disc = b * b - c;
    const enter = disc > 0 ? Math.max(0, -b - Math.sqrt(disc)) : 0;

    // Chance of getting through, from the real optical depth along this path.
    const tau = (opticalDepthOverhead(band.nm) + HAZE_DEPTH) * airMass(angle) * VISIBILITY;
    const survive = Math.exp(-tau);
    let scatterAt = Infinity;
    const u = Math.random();
    if (u > survive) {
      // Where along the path it scatters (exponential odds, limited to this path).
      const f = Math.log(1 - Math.random() * (1 - survive)) / -tau;
      scatterAt = enter + Math.min(f, 1) * (len - enter);
    }
    packets.push({ x: sx, y: sy, ux, uy, dist: 0, len, scatterAt, band, scattered: false, age: 0 });
  }

  function step(dt, g) {
    spawnDebt += SPAWN_PER_SEC * dt;
    while (spawnDebt >= 1) { spawn(g); spawnDebt -= 1; }
    for (const p of packets) {
      if (!p.scattered) {
        p.dist += SPEED * dt;
        p.x += p.ux * SPEED * dt; p.y += p.uy * SPEED * dt;
        // Once the sun is below the horizon, the Earth blocks the direct beam:
        // light that hasn't scattered by the time it nears the ground goes no further.
        const blocked = angle < 0 && p.dist >= p.len * 0.82;
        if (p.dist >= p.scatterAt || blocked) {
          p.scattered = true;
          const d = Math.random() * Math.PI * 2;
          p.ux = Math.cos(d); p.uy = Math.sin(d);
        }
      } else {
        p.age += dt;
        p.x += p.ux * SCATTER_SPEED * dt; p.y += p.uy * SCATTER_SPEED * dt;
      }
    }
    packets = packets.filter(p => p.scattered ? p.age < SCATTER_LIFE : p.dist < p.len);
  }

  function draw(g) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, offX * dpr, offY * dpr);

    // The glow of scattered light: it swells, then fades as the light moves off.
    ctx.globalCompositeOperation = 'lighter';
    for (const p of packets) {
      if (!p.scattered) continue;
      const k = p.age / SCATTER_LIFE;
      ctx.globalAlpha = Math.min(1, k * 6) * (1 - k) * 0.75;
      const r = 12 + 14 * k;
      ctx.drawImage(sprites.get(p.band), p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // The direct beam, faint, as a guide from the sun to the observer.
    const beam = ctx.createLinearGradient(g.sun.x, g.sun.y, g.obs.x, g.obs.y);
    beam.addColorStop(0, 'rgba(255,250,210,0.16)');
    beam.addColorStop(angle < 0 ? 0.8 : 1, 'rgba(255,250,210,0.05)');
    beam.addColorStop(1, `rgba(255,250,210,${angle < 0 ? 0 : 0.05})`);
    ctx.strokeStyle = beam;
    ctx.lineWidth = g.sun.beam * 0.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.sun.x, g.sun.y); ctx.lineTo(g.obs.x, g.obs.y); ctx.stroke();

    ctx.lineWidth = 2.2;
    for (const p of packets) {
      if (p.scattered) {
        // A short arrow-like dash pointing the new way, fading out.
        const a = 0.9 * (1 - p.age / SCATTER_LIFE);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = `rgba(${p.band.color},${a})`;
        ctx.beginPath(); ctx.moveTo(p.x - p.ux * 6, p.y - p.uy * 6); ctx.lineTo(p.x, p.y); ctx.stroke();
      } else {
        // Unscattered light is drawn paler, so the beam reads as white sunlight
        // and only turns orange when the blues and greens have been removed.
        const [r, gr, b] = p.band.color;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = `rgba(${(r + 255) >> 1},${(gr + 255) >> 1},${(b + 255) >> 1},0.7)`;
        ctx.beginPath(); ctx.moveTo(p.x - p.ux * 9, p.y - p.uy * 9); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    }
  }

  function frame(now) {
    if (!running) { raf = 0; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const g = geometry();
    step(dt, g);
    draw(g);
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    setAngle(deg) { angle = deg; },
    start() {
      running = true;
      resize();
      canvas.classList.add('on');
      if (prefersReducedMotion()) {
        // A still picture: run the simulation briefly, then draw one frame.
        const g = geometry();
        packets = [];
        for (let i = 0; i < 180; i++) { step(1 / 60, g); draw(g); }
        running = false;
        return;
      }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    },
    stop() {
      running = false;
      canvas.classList.remove('on');
      packets = [];
      setTimeout(() => {
        if (running) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      }, 500);
    },
    redrawStill() { if (prefersReducedMotion() && canvas.classList.contains('on')) this.start(); },
  };
}

// Position and size of an element inside #content, even while it is hidden.
export function box(el) {
  const hidden = getComputedStyle(el).display === 'none';
  const prev = { display: el.style.display, visibility: el.style.visibility };
  if (hidden) { el.style.visibility = 'hidden'; el.style.display = 'block'; }
  const b = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  if (hidden) { el.style.display = prev.display; el.style.visibility = prev.visibility; }
  return b;
}
