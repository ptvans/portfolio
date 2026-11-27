// The magnified particle viewer (slides 3 and 4).
// Redraws the original particle-detail.png artwork on a canvas so the air
// particles can move like a gas, and adds the looping light beam for slide 4.
import { prefersReducedMotion } from './physics.js';

// Geometry of the original 300×500 artwork, in its own pixel units.
const ART_W = 300, ART_H = 500;
const C = { x: 150, y: 157.5 };   // center of the viewer
const INNER_R = 130;              // dark interior
const RING_R = 135, RING_W = 10;  // white rim
const SMALL = { x: 150, y: 468.5, r: 19 };
// The canvas extends to the left of the artwork so the beam can come in from outside.
const X0 = -40, X1 = 300;

const N_PARTICLES = 90;
const DOT_R = 2.6;
const BEAM = { start: -12, y: C.y, half: 17, cycle: 4.6, enter: 1.7, hold: 3.1, fade: 3.7 };
const RAY = { speed: 85, life: 1.4, len: 24, rate: 2.2 };

export function createMagnifier(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-magnifier';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const particles = Array.from({ length: N_PARTICLES }, () => {
    const r = Math.sqrt(Math.random()) * (INNER_R - 8);
    const a = Math.random() * Math.PI * 2;
    const speed = 28 + Math.random() * 42;
    const d = Math.random() * Math.PI * 2;
    return { x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a),
             vx: speed * Math.cos(d), vy: speed * Math.sin(d), cool: Math.random() };
  });
  let rays = [];
  let beamOn = false, beamT = 0;
  let raf = 0, last = 0, scale = 1, dpr = 1;

  function resize() {
    scale = host.clientWidth / ART_W || 1;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = (X1 - X0) * scale, h = ART_H * scale;
    Object.assign(canvas.style, { left: X0 * scale + 'px', top: '0px', width: w + 'px', height: h + 'px' });
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function step(dt) {
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      const dx = p.x - C.x, dy = p.y - C.y, dist = Math.hypot(dx, dy);
      const lim = INNER_R - DOT_R - 1;
      if (dist > lim) {                       // bounce off the viewer's wall
        const nx = dx / dist, ny = dy / dist, vn = p.vx * nx + p.vy * ny;
        if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
        p.x = C.x + nx * lim; p.y = C.y + ny * lim;
      }
      p.cool -= dt;
    }
    for (let i = 0; i < particles.length; i++) {   // elastic collisions, equal masses
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 > 4 * DOT_R * DOT_R * 1.4 || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel <= 0) continue;
        a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny;
      }
    }

    if (beamOn) {
      beamT = (beamT + dt) % BEAM.cycle;
      const { head, alpha } = beamState();
      if (alpha > 0.5) {
        for (const p of particles) {
          if (p.x < head && Math.abs(p.y - BEAM.y) < BEAM.half && p.cool <= 0 && Math.random() < RAY.rate * dt * 6) {
            const d = Math.random() * Math.PI * 2;
            rays.push({ x: p.x, y: p.y, dx: Math.cos(d), dy: Math.sin(d), age: 0 });
            p.cool = 0.5 + Math.random() * 0.6;
          }
        }
      }
    }
    for (const r of rays) { r.age += dt; r.x += r.dx * RAY.speed * dt; r.y += r.dy * RAY.speed * dt; }
    rays = rays.filter(r => r.age < RAY.life);
  }

  function beamState() {
    const t = beamT, left = BEAM.start, right = C.x + INNER_R;
    if (t < BEAM.enter) return { head: left + (right - left) * easeOut(t / BEAM.enter), alpha: 1 };
    if (t < BEAM.hold) return { head: right, alpha: 1 };
    if (t < BEAM.fade) return { head: right, alpha: 1 - (t - BEAM.hold) / (BEAM.fade - BEAM.hold) };
    return { head: right, alpha: 0 };
  }

  function circlePath(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = dpr * scale;
    ctx.setTransform(k, 0, 0, k, -X0 * k, 0);

    // The artwork, drawn at the same 50% strength the original image had.
    ctx.globalAlpha = 0.5;
    const cone = ctx.createLinearGradient(0, C.y + RING_R, 0, SMALL.y - SMALL.r);
    cone.addColorStop(0, 'rgba(255,255,255,0.45)');
    cone.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.save();
    ctx.beginPath();                       // the cone, kept outside the viewer's circle
    ctx.rect(X0, 0, X1 - X0, ART_H);
    ctx.arc(C.x, C.y, RING_R, 0, Math.PI * 2);
    ctx.clip('evenodd');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(C.x - 98, C.y + 96); ctx.lineTo(C.x + 98, C.y + 96);
    ctx.lineTo(SMALL.x + SMALL.r, SMALL.y); ctx.lineTo(SMALL.x - SMALL.r, SMALL.y);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    const inside = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, INNER_R);
    inside.addColorStop(0, 'rgba(255,255,255,0.34)');
    inside.addColorStop(1, 'rgba(255,255,255,0.2)');
    ctx.fillStyle = inside;
    circlePath(C.x, C.y, INNER_R); ctx.fill();

    ctx.strokeStyle = 'rgb(243,243,243)';
    ctx.lineWidth = RING_W; circlePath(C.x, C.y, RING_R); ctx.stroke();
    ctx.lineWidth = 3.5; circlePath(SMALL.x, SMALL.y, SMALL.r); ctx.stroke();
    ctx.globalAlpha = 1;

    // The beam: visible outside the viewer on the left and inside the viewer.
    if (beamOn) {
      const { head, alpha } = beamState();
      if (alpha > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(BEAM.start, 0, C.x - RING_R - BEAM.start, ART_H);
        ctx.arc(C.x, C.y, INNER_R, 0, Math.PI * 2);
        ctx.clip();
        const g = ctx.createLinearGradient(BEAM.start, 0, BEAM.start + 40, 0);
        g.addColorStop(0, `rgba(255,253,232,0)`);
        g.addColorStop(1, `rgba(255,253,232,${0.85 * alpha})`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(BEAM.start, BEAM.y - BEAM.half);
        ctx.lineTo(head - BEAM.half, BEAM.y - BEAM.half);
        ctx.quadraticCurveTo(head, BEAM.y - BEAM.half, head, BEAM.y);
        ctx.quadraticCurveTo(head, BEAM.y + BEAM.half, head - BEAM.half, BEAM.y + BEAM.half);
        ctx.lineTo(BEAM.start, BEAM.y + BEAM.half);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Scattered light: short beams leaving the particles, kept inside the viewer.
    if (rays.length) {
      ctx.save();
      circlePath(C.x, C.y, INNER_R); ctx.clip();
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255,250,215,0.8)';
      ctx.shadowBlur = 6;
      for (const r of rays) {
        const a = 1 - r.age / RAY.life;
        const len = Math.min(RAY.len, r.age * RAY.speed);
        ctx.strokeStyle = `rgba(255,252,225,${a})`;
        ctx.beginPath();
        ctx.moveTo(r.x - r.dx * len, r.y - r.dy * len);
        ctx.lineTo(r.x, r.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // The particles themselves.
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    for (const p of particles) { circlePath(p.x, p.y, DOT_R); ctx.fill(); }
  }

  function frame(now) {
    if (getComputedStyle(host).display === 'none') { raf = 0; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    resize();
    if (prefersReducedMotion()) {
      // One still frame: settle a moment of scattering, then stop.
      if (beamOn) { beamT = BEAM.enter + 0.5; for (let i = 0; i < 30; i++) step(1 / 60); }
      draw();
      return;
    }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  window.addEventListener('resize', () => { resize(); if (!raf) draw(); });

  return {
    start,
    setBeam(on) { beamOn = on; beamT = 0; if (!on) rays = []; start(); },
  };
}

const easeOut = t => 1 - Math.pow(1 - t, 2);
