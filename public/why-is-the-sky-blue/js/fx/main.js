// Wires the new animations into the page and exposes them to scenes.js as window.SkyFx.
import { createMagnifier } from './magnifier.js';
import { createScatterChart } from './chart.js';
import { createSkyView } from './sky-view.js';
import { createSunlight, box } from './sunlight.js';
import { pathMiles, ATMOSPHERE_MILES, prefersReducedMotion } from './physics.js';

const $ = id => document.getElementById(id);
const MAX_MILES = pathMiles(0);

const content = $('content');
const magnifier = createMagnifier($('particle-detail'));
const bigChart = createScatterChart($('chart-holder'));
const dock = $('chart-dock');
createScatterChart($('chart-dock-holder'), { compact: true });

const skyFrame = $('sky-view');
let sky = null;
try { sky = createSkyView($('sky-canvas')); } catch (e) { console.warn('Sky view unavailable:', e); }
if (!sky) skyFrame.classList.add('no-webgl');

const sunlight = createSunlight(content, {
  sun: $('sun'), observer: $('observer'), earth: $('earth-day'), atmosphere: $('particles'),
});

const card = $('observer-card');
const cardExtra = card.querySelector('.card-extra');
const slider = $('sun-angle');
const MIN_CARD_W = 210;
let angle = 90, docked = false;

function setAngle(deg) {
  angle = deg;
  sunlight.setAngle(deg);
  if (sky) sky.render(deg);
  const set = deg < 0;
  const miles = pathMiles(deg), ratio = miles / ATMOSPHERE_MILES;
  card.classList.toggle('below-horizon', set);
  $('miles-line').textContent = set ? 'The sun is below the horizon' : 'Sunlight travels through';
  $('miles-big').innerHTML = set
    ? 'No direct sunlight'
    : `<span id="miles">${Math.round(miles).toLocaleString()}</span> miles <span class="distance-unit">of air</span>`;
  $('miles-sub').textContent = set
    ? 'but it still lights the air high above you'
    : ratio < 1.05
      ? 'the shortest path: the sun is straight overhead'
      : `${ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}× as far as when the sun is straight overhead`;
  $('miles-fill').style.width = (miles / MAX_MILES * 100).toFixed(1) + '%';
  $('sun-angle-out').textContent = Math.round(deg) + '°';
  if (+slider.value !== Math.round(deg)) slider.value = Math.round(deg);
  const where = set ? `${-Math.round(deg)} degrees below the horizon` : `${Math.round(deg)} degrees above the horizon`;
  slider.setAttribute('aria-valuetext', set
    ? `${where}: no direct sunlight reaches the observer`
    : `${where}: sunlight travels through ${Math.round(miles)} miles of air`);
  skyFrame.setAttribute('aria-label', `The observer's view of the sky with the sun ${where}`);
}

// The observer's card sits beside the observer (or below, if there's no room),
// with its pointer aimed at the observer. It's placed at its full, expanded
// height so that opening it on the sunset scene never makes it jump.
function placeCard() {
  const o = box($('observer'));
  const c = content.getBoundingClientRect();
  const gap = Math.max(14, o.w * 0.35);
  const ox = o.x + o.w / 2, oy = o.y + o.h / 2;

  // Width: the CSS width, narrowed (down to MIN_CARD_W) to fit beside the observer.
  card.style.width = '';
  card.style.transform = '';
  const cssW = box(card).w;
  const roomRight = window.innerWidth - c.left - 8 - (o.x + o.w + gap);
  const side = roomRight >= MIN_CARD_W ? 'left' : 'top';
  const w = side === 'left' ? Math.min(cssW, roomRight) : cssW;
  card.style.width = w + 'px';

  // Height when fully open.
  const expanded = card.classList.contains('expanded');
  card.classList.add('expanded');
  const h = box(card).h;
  if (!expanded) card.classList.remove('expanded');

  const minX = -c.left + 8, maxX = window.innerWidth - c.left - w - 8;
  const minY = -c.top + 8, maxY = window.innerHeight - c.top - h - 30;
  let x, y, scale = 1;
  if (side === 'left') {
    x = o.x + o.w + gap;
    y = Math.max(minY, Math.min(oy - 60, maxY));   // the sky view level with the observer
  } else {
    // Below the observer; shrink rather than ride up over them.
    x = Math.max(minX, Math.min(ox - w * 0.75, maxX));
    y = o.y + o.h + gap;
    const room = window.innerHeight - c.top - 30 - y;
    if (room < h) scale = Math.max(0.6, room / h);
  }
  card.style.left = x + 'px';
  card.style.top = y + 'px';
  card.dataset.notch = side;
  const notch = side === 'left' ? oy - y : ox - x;
  card.style.setProperty('--notch', Math.max(14, Math.min(notch, (side === 'left' ? h : w) - 14)) + 'px');
  if (scale < 1) {
    card.style.transformOrigin = `${Math.max(14, ox - x)}px 0`;
    card.style.transform = `scale(${scale.toFixed(3)})`;
  }
}

// The docked chart goes in the left margin when there's room, otherwise bottom-left.
function placeDock() {
  // Read the text column's position from CSS, since its scene may be hidden.
  const cs = getComputedStyle($('daylight-text'));
  const c = content.getBoundingClientRect();
  const textLeft = c.left + parseFloat(cs.left);
  const w = dock.offsetWidth || 250;
  dock.classList.toggle('in-margin', textLeft - 32 >= w);
  if (dock.classList.contains('in-margin')) {
    dock.style.top = Math.max(16, c.top + parseFloat(cs.top)) + 'px';
  } else {
    dock.style.top = '';
  }
}

function layout() {
  placeCard();
  placeDock();
  if (sky) sky.render(angle);   // the view may have changed size
}
window.addEventListener('resize', layout);

function showDock() {
  if (docked) return;
  docked = true;
  dock.style.display = 'block';
  placeDock();
  const from = bigChart.el.getBoundingClientRect();
  const toSvg = dock.querySelector('svg').getBoundingClientRect();
  const D = dock.getBoundingClientRect();
  if (!from.width || prefersReducedMotion()) {
    dock.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
    return;
  }
  // Shrink the big chart into the docked one (FLIP).
  const s = from.width / toSvg.width;
  const tx = from.left - (D.left + s * (toSvg.left - D.left));
  const ty = from.top - (D.top + s * (toSvg.top - D.top));
  dock.animate([
    { transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${s})`, opacity: 0.4 },
    { transformOrigin: '0 0', transform: 'none', opacity: 1 },
  ], { duration: 1100, easing: 'cubic-bezier(.25,.8,.25,1)' });
}

function hideDock() {
  if (!docked) return;
  docked = false;
  const a = dock.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
  a.onfinish = () => { if (!docked) dock.style.display = 'none'; };
}

function fade(el, show, ms = 600) {
  if (show) {
    if (getComputedStyle(el).display !== 'none') return;
    el.style.display = 'block';
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms });
  } else if (getComputedStyle(el).display !== 'none') {
    const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms });
    a.onfinish = () => { el.style.display = 'none'; };
  }
}

window.SkyFx = {
  box,
  magnifier,
  setAngle,
  startSky() {
    placeCard();
    fade(card, true);
    setAngle(angle);
    sunlight.start();
  },
  stopSky() { sunlight.stop(); fade(card, false, 400); },
  showDock,
  hideDock,
  // Open the slider and distance readout under the observer's view.
  showControl() {
    if (card.classList.contains('expanded')) return;
    card.classList.add('expanded');
    placeCard();
    if (prefersReducedMotion()) return;
    const h = cardExtra.offsetHeight;
    cardExtra.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }],
      { duration: 700, easing: 'cubic-bezier(.25,.8,.25,1)' });
  },
  hideControl() {
    if (!card.classList.contains('expanded')) return;
    const done = () => card.classList.remove('expanded');
    if (prefersReducedMotion() || getComputedStyle(card).display === 'none') return done();
    const h = cardExtra.offsetHeight;
    cardExtra.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
      { duration: 400, easing: 'ease-in' }).onfinish = done;
  },
  layout,
};
