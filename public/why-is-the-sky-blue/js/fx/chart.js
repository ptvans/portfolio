// Interactive scattering chart (slide 6, and docked on slides 7–8).
// Plots how many times more each wavelength is scattered than red light.
import { scatterVsRed, wavelengthRGB, colorName, RED_NM } from './physics.js';

const SVG = 'http://www.w3.org/2000/svg';
const MIN_NM = 400, MAX_NM = 700, MAX_Y = 7;

const LAYOUTS = {
  full:    { W: 560, H: 300, ml: 58, mr: 22, mt: 30, mb: 66, fs: 15, xStep: 50, yTicks: [1, 2, 3, 4, 5, 6, 7] },
  compact: { W: 300, H: 196, ml: 34, mr: 10, mt: 26, mb: 40, fs: 13, xStep: 100, yTicks: [1, 3, 5, 7] },
};

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(SVG, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

const fmt = v => (Math.abs(v - 1) < 0.05 ? '1' : v.toFixed(1)) + '×';

let uid = 0;

export function createScatterChart(container, { compact = false, initialNm = 450 } = {}) {
  const L = compact ? LAYOUTS.compact : LAYOUTS.full;
  const id = 'scatter-grad-' + (++uid);
  const x = nm => L.ml + (nm - MIN_NM) / (MAX_NM - MIN_NM) * (L.W - L.ml - L.mr);
  const y = v => L.H - L.mb - v / MAX_Y * (L.H - L.mt - L.mb);
  const nmAt = px => MIN_NM + (px - L.ml) / (L.W - L.ml - L.mr) * (MAX_NM - MIN_NM);

  const svg = el('svg', {
    viewBox: `0 0 ${L.W} ${L.H}`, class: 'scatter-chart' + (compact ? ' compact' : ''),
    role: 'slider', tabindex: '0', 'aria-valuemin': MIN_NM, 'aria-valuemax': MAX_NM,
    'aria-label': 'Scattering of each color compared with red light, sun directly overhead',
  });
  svg.style.fontSize = L.fs + 'px';

  const grad = el('linearGradient', { id, x1: '0', x2: '1', y1: '0', y2: '0' }, el('defs', {}, svg));
  for (let nm = MIN_NM; nm <= MAX_NM; nm += 10) {
    el('stop', { offset: (nm - MIN_NM) / (MAX_NM - MIN_NM), 'stop-color': `rgb(${wavelengthRGB(nm)})` }, grad);
  }

  // Grid and y labels ("1×", "2×", …)
  for (const t of L.yTicks) {
    el('line', { x1: L.ml, x2: L.W - L.mr, y1: y(t), y2: y(t), class: 'grid' }, svg);
    el('text', { x: L.ml - 8, y: y(t) + L.fs * 0.35, class: 'tick', 'text-anchor': 'end' }, svg).textContent = t + '×';
  }
  el('text', { x: L.ml - 8, y: L.mt - 12, class: 'axis-title', 'text-anchor': 'start' }, svg)
    .textContent = 'multiple of red scattering';

  // The curve, filled with the spectrum
  let d = '';
  for (let nm = MIN_NM; nm <= MAX_NM; nm += 2) d += (d ? 'L' : 'M') + x(nm).toFixed(1) + ',' + y(scatterVsRed(nm)).toFixed(1);
  el('path', { d: d + `L${x(MAX_NM)},${y(0)}L${x(MIN_NM)},${y(0)}Z`, fill: `url(#${id})`, class: 'area' }, svg);
  el('path', { d, class: 'curve' }, svg);

  // Red reference line at 1×
  el('line', { x1: L.ml, x2: L.W - L.mr, y1: y(1), y2: y(1), class: 'ref' }, svg);

  // x axis
  el('line', { x1: L.ml, x2: L.W - L.mr, y1: y(0), y2: y(0), class: 'axis' }, svg);
  for (let nm = MIN_NM; nm <= MAX_NM; nm += L.xStep) {
    el('text', { x: x(nm), y: y(0) + L.fs * 1.3, class: 'tick', 'text-anchor': 'middle' }, svg).textContent = nm;
  }
  if (!compact) {
    // The grey "wavelength" pill from the original chart
    const pillW = 170, pillH = 28, px = (L.ml + L.W - L.mr) / 2 - pillW / 2, py = L.H - pillH - 4;
    el('rect', { x: px, y: py, width: pillW, height: pillH, rx: 3, class: 'pill' }, svg);
    el('text', { x: px + pillW / 2, y: py + pillH / 2 + 6, class: 'pill-text', 'text-anchor': 'middle' }, svg).textContent = 'wavelength (nm)';
  }

  // The movable marker
  const marker = el('g', { class: 'marker' }, svg);
  const mLine = el('line', { class: 'marker-line' }, marker);
  const mDot = el('circle', { r: compact ? 4 : 6, class: 'marker-dot' }, marker);
  const mBox = el('rect', { rx: 3, class: 'marker-box' }, marker);
  const mText = el('text', { class: 'marker-text', 'text-anchor': 'middle' }, marker);
  const mName = el('tspan', { class: 'marker-name' }, mText);
  const mSmall = el('tspan', { class: 'marker-small' }, mText);
  const mBig = el('tspan', { class: 'marker-big' }, mText);

  let current = initialNm;
  function setNm(nm) {
    current = Math.round(Math.min(MAX_NM, Math.max(MIN_NM, nm)) / 5) * 5;
    const v = scatterVsRed(current), px = x(current), py = y(v);
    mLine.setAttribute('x1', px); mLine.setAttribute('x2', px);
    mLine.setAttribute('y1', y(0)); mLine.setAttribute('y2', py);
    mDot.setAttribute('cx', px); mDot.setAttribute('cy', py);
    mDot.setAttribute('fill', `rgb(${wavelengthRGB(current)})`);

    const name = colorName(current);
    // Reads "blue, 4.4×"; the large chart adds the wavelength: "blue 450 nm, 4.4×".
    mName.textContent = compact ? `${name}, ` : `${name} `;
    mSmall.textContent = compact ? '' : `${current} nm, `;
    mBig.textContent = fmt(v);
    const boxW = compact ? 92 : 168, boxH = L.fs * 1.9;
    const bx = Math.min(L.W - L.mr - boxW, Math.max(L.ml, px - boxW / 2));
    let by = py - boxH - 10;
    if (by < 2) by = py + 12;
    mBox.setAttribute('x', bx); mBox.setAttribute('y', by);
    mBox.setAttribute('width', boxW); mBox.setAttribute('height', boxH);
    mText.setAttribute('x', bx + boxW / 2); mText.setAttribute('y', by + boxH / 2 + L.fs * 0.38);

    svg.setAttribute('aria-valuenow', current);
    svg.setAttribute('aria-valuetext',
      `${current} nanometers, ${name}: scattered ${current === RED_NM ? 'the same as' : v.toFixed(1) + ' times as much as'} red light`);
  }

  function fromPointer(e) {
    const r = svg.getBoundingClientRect();
    setNm(nmAt((e.clientX - r.left) / r.width * L.W));
  }
  svg.addEventListener('pointermove', fromPointer);
  svg.addEventListener('pointerdown', e => { fromPointer(e); svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('keydown', e => {
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -25, PageUp: 25 }[e.key];
    if (e.key === 'Home') setNm(MIN_NM);
    else if (e.key === 'End') setNm(MAX_NM);
    else if (step) setNm(current + step);
    else return;
    e.preventDefault();
    e.stopPropagation();   // keep arrow keys from changing the scene
  });

  container.appendChild(svg);
  setNm(initialNm);
  return { el: svg, setNm };
}
