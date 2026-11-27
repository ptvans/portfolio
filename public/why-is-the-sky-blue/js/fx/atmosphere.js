// The atmosphere around the Earth: a cloud of air particles that is densest at
// the ground and thins out with height (as real air does), over a faint glow
// at the planet's edge. Two layers drift slowly in opposite directions, so the
// gas seems alive. Replaces the flat particles.png ring, in the same footprint.
import { prefersReducedMotion } from './physics.js';
import { box } from './sunlight.js';

const EARTH_DISC = 356.5 / 750;   // the planet's radius inside earth-day.png, as a share of its width
const SCALE_HEIGHT = 0.42;        // how quickly the air thins, as a share of the atmosphere's depth
const SPACING = 7.5;              // closest spacing of particles at the ground, in px (desktop size)

export function createAtmosphere(host, earth) {
  const layers = [0, 1].map(i => {
    const c = document.createElement('canvas');
    c.className = 'fx-atmosphere layer-' + i;
    c.setAttribute('aria-hidden', 'true');
    host.appendChild(c);
    return c;
  });

  function draw() {
    const h = box(host), e = box(earth);
    if (!h.w || !e.w) return;
    // Everything is centered on the Earth, which sits a few px off the old ring's center.
    const cx = e.x + e.w / 2 - h.x, cy = e.y + e.h / 2 - h.y;
    const earthR = e.w * EARTH_DISC;
    const outerR = h.w / 2;
    const depth = outerR - earthR;
    const size = Math.ceil(outerR * 2 + 4);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = h.w / 1000;                      // relative to the desktop layout
    const minGap = SPACING * Math.max(k, 0.55);

    // Particles: dart-throwing with a minimum gap that grows with height,
    // so they stay evenly spread (like the original halftone dots) but thin out.
    const pts = [];
    const cell = minGap, grid = new Map();
    const key = (x, y) => (Math.floor(x / cell) << 16) ^ Math.floor(y / cell);
    const target = Math.round(Math.PI * (outerR * outerR - earthR * earthR) / (minGap * minGap) * 0.55);
    for (let tries = 0; tries < target * 12 && pts.length < target; tries++) {
      const r = earthR - 4 + Math.random() * (depth + 4);
      const a = Math.random() * Math.PI * 2;
      const alt = Math.max(0, (r - earthR) / depth);         // 0 at the ground, 1 at the top
      const density = Math.exp(-alt / SCALE_HEIGHT);
      if (Math.random() > 0.18 + 0.82 * density) continue;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      const gap = minGap / Math.sqrt(0.18 + 0.82 * density);
      let ok = true;
      const reach = Math.ceil(gap / cell);
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
      for (let i = -reach; i <= reach && ok; i++) {
        for (let j = -reach; j <= reach && ok; j++) {
          const list = grid.get(((gx + i) << 16) ^ (gy + j));
          if (list) for (const p of list) if ((p.x - x) ** 2 + (p.y - y) ** 2 < gap * gap) { ok = false; break; }
        }
      }
      if (!ok) continue;
      const p = { x, y, alt };
      pts.push(p);
      const kk = key(x, y);
      (grid.get(kk) || grid.set(kk, []).get(kk)).push(p);
    }

    layers.forEach((c, li) => {
      c.width = c.height = Math.round(size * dpr);
      Object.assign(c.style, {
        width: size + 'px', height: size + 'px',
        left: (cx - size / 2) + 'px', top: (cy - size / 2) + 'px',
      });
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, size / 2 * dpr - cx * dpr, size / 2 * dpr - cy * dpr);

      if (li === 0) {
        // The glow: brightest at the planet's edge, fading out with height.
        const g = ctx.createRadialGradient(cx, cy, earthR - 6, cx, cy, outerR);
        g.addColorStop(0, 'rgba(150,205,240,0.34)');
        g.addColorStop(0.08, 'rgba(130,190,235,0.16)');
        g.addColorStop(0.45, 'rgba(110,170,225,0.06)');
        g.addColorStop(1, 'rgba(110,170,225,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.fill();
      }

      // Every other particle goes on each layer.
      for (let i = li; i < pts.length; i += 2) {
        const p = pts[i];
        const near = Math.exp(-p.alt / SCALE_HEIGHT);
        const r = (0.55 + 0.75 * Math.random() * (0.5 + 0.5 * near)) * Math.max(k, 0.6) * 1.15;
        ctx.fillStyle = `rgba(255,255,255,${(0.28 + 0.6 * near) * (0.75 + 0.25 * Math.random())})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      }
    });

    host.classList.toggle('still', prefersReducedMotion());
  }

  let pending = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(draw);
  });
  draw();
  return { draw };
}
