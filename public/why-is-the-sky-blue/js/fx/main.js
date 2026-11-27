// Wires the new animations into the page and exposes them to scenes.js as window.SkyFx.
import { createMagnifier } from './magnifier.js';
import { createScatterChart } from './chart.js';
import { createSkyView } from './sky-view.js';
import { createSunlight, box } from './sunlight.js';
import { createAtmosphere } from './atmosphere.js';
import { pathMiles, ATMOSPHERE_MILES, prefersReducedMotion } from './physics.js';

const $ = id => document.getElementById(id);
const MAX_MILES = pathMiles(0);

const content = $('content');
createAtmosphere($('particles'), $('earth-day'));
const magnifier = createMagnifier($('particle-detail'));
const bigChart = createScatterChart($('chart-holder'));
const dock = $('chart-dock');
const dockToggle = dock.querySelector('.dock-title');
createScatterChart($('chart-dock-holder'), { compact: true });

const skyFrame = $('sky-view');
let sky = null;
try { sky = createSkyView($('sky-canvas')); } catch (e) { console.warn('Sky view unavailable:', e); }
if (!sky) skyFrame.classList.add('no-webgl');

const sunlight = createSunlight(content, {
  sun: $('sun'), observer: $('observer'), earth: $('earth-day'), atmosphere: $('particles'),
});

const card = $('observer-card');
const slider = $('sun-angle');
const MIN_CARD_W = 210;
const MIN_DOCK_W = 200;

// On scenes 7–8 the Earth turns so that the observer's horizon makes the true
// sun angle with the light reaching them: 30° counterclockwise with the sun
// overhead, turning back clockwise as it sets, to the turn that puts the low
// sun's spot exactly on the observer's horizon.
const TURN_OVERHEAD = 30;
let home = null;     // the observer's spot before any turn, and the Earth's center
let turn = 0;
let turningTimer = 0;
let angle = 90, docked = false;
let cardBox = null;   // where placeCard() put the card, in #content coordinates, at full height

function setAngle(deg) {
  angle = deg;
  setTurn(turnFor(deg));
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
// with its pointer aimed at the observer, clear of the scene text above.
function placeCard() {
  // Clear the observer's rightmost spot (lowest sun), so the card can stay put while they move.
  const o = observerAt(turnFor(-6)).box;
  const c = content.getBoundingClientRect();
  const gap = Math.max(14, o.w * 0.35);
  const ox = o.x + o.w / 2, oy = o.y + o.h / 2;

  // Width: the CSS width, narrowed (down to MIN_CARD_W) to fit beside the observer.
  card.style.width = '';
  card.style.transform = '';
  skyFrame.style.height = '';
  skyFrame.style.aspectRatio = '';
  const cssW = box(card).w;
  const roomRight = window.innerWidth - c.left - 8 - (o.x + o.w + gap);
  const side = roomRight >= MIN_CARD_W ? 'left' : 'top';
  const w = side === 'left' ? Math.min(cssW, roomRight) : cssW;
  card.style.width = w + 'px';
  const minX = -c.left + 8, maxX = window.innerWidth - c.left - w - 8;
  const x = side === 'left' ? o.x + o.w + gap : Math.max(minX, Math.min(ox - w * 0.75, maxX));

  // Vertical room: from below any scene text the card would sit under, to the window's bottom.
  const bottomY = window.innerHeight - c.top - 30;
  let topY = -c.top + 8;
  for (const id of ['daylight-text', 'sunset-text']) {
    const t = textBox($(id));
    if (t.w && x < t.x + t.w && x + w > t.x) topY = Math.max(topY, t.y + t.h + 12);
  }
  // A wide card would be tall; cap the sky view's height so the whole card fits.
  let h = box(card).h;
  if (side === 'left' && h > bottomY - topY) {
    skyFrame.style.aspectRatio = 'auto';   // keep the full width; just shorter
    skyFrame.style.height = '0px';
    const others = box(card).h;            // everything in the card but the view
    skyFrame.style.height = Math.max(110, bottomY - topY - others) + 'px';
    h = box(card).h;
  }

  let y, scale = 1;
  if (side === 'left') {
    y = Math.max(topY, Math.min(oy - 60, bottomY - h));   // the sky view level with the observer
  } else {
    // Below the observer; shrink rather than ride up over them.
    y = o.y + o.h + gap;
    const room = bottomY - y;
    if (room < h) scale = Math.max(0.6, room / h);
  }
  card.style.left = x + 'px';
  card.style.top = y + 'px';
  card.dataset.notch = side;
  if (scale < 1) {
    card.style.transformOrigin = `${Math.max(14, ox - x)}px 0`;
    card.style.transform = `scale(${scale.toFixed(3)})`;
  }
  cardBox = { x, y, w: w * scale, h: h * scale, side, innerW: w, innerH: h };
  updateNotch();
}

// Aim the card's pointer at wherever the observer stands now.
function updateNotch() {
  if (!cardBox || !home) return;
  const o = observerAt(turn);
  const left = cardBox.side === 'left';
  const n = left ? o.y - cardBox.y : o.x - cardBox.x;
  card.style.setProperty('--notch', Math.max(14, Math.min(n, (left ? cardBox.innerH : cardBox.innerW) - 14)) + 'px');
}

// A scene's text box, measured even while its scene is hidden.
function textBox(el) {
  const stage = el.parentElement;
  const hidden = getComputedStyle(stage).display === 'none';
  const saved = stage.style.cssText;
  if (hidden) { stage.style.display = 'block'; stage.style.visibility = 'hidden'; }
  const b = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  if (hidden) stage.style.cssText = saved;
  return b;
}

// The docked chart sits on the Earth, left of the observer, level with the
// card's bottom and above the progress dots. It is as wide as its CSS allows
// (narrower only if the window has no room); on short windows it may overlap
// the end of the sunlight's path into the observer.
function placeDock() {
  if (!cardBox) placeCard();
  const c = content.getBoundingClientRect();
  const o = observerAt(turnFor(90)).box;   // the observer's leftmost spot (sun overhead)
  const gap = 14;
  const right = c.left + Math.min(cardBox.x, o.x) - gap;
  const bottom = Math.min(c.top + cardBox.y + cardBox.h, window.innerHeight - 60);
  dock.style.width = '';
  const w = Math.max(MIN_DOCK_W, Math.min(box(dock).w, right - 8));
  dock.style.width = w + 'px';
  const h = box(dock).h;
  dock.style.left = (right - w) + 'px';
  dock.style.top = Math.max(8, bottom - h) + 'px';
}

// The observer's spot as drawn in the CSS, before the Earth turns.
function measureHome() {
  const obs = $('observer');
  obs.style.left = obs.style.top = obs.style.right = '';
  const o = box(obs), e = box($('earth-day'));
  const ex = e.x + e.w / 2, ey = e.y + e.h / 2, ox = o.x + o.w / 2, oy = o.y + o.h / 2;
  home = { ex, ey, ox, oy, w: o.w, h: o.h, r: Math.hypot(ox - ex, oy - ey) };
}

const rad = d => d * Math.PI / 180;

// Where the observer stands once the Earth has turned T degrees counterclockwise.
function observerAt(T) {
  const a = rad(-T), dx = home.ox - home.ex, dy = home.oy - home.ey;
  const x = home.ex + dx * Math.cos(a) - dy * Math.sin(a);
  const y = home.ey + dx * Math.sin(a) + dy * Math.cos(a);
  return { x, y, box: { x: x - home.w / 2, y: y - home.h / 2, w: home.w, h: home.h } };
}

// The sun's overhead and low spots as drawn for the original layout (scenes.js supplies them).
function sunAnchors() {
  return window.SkyFx && window.SkyFx.sunAnchorCenters ? window.SkyFx.sunAnchorCenters() : null;
}

// How far the Earth turns for a sun angle: TURN_OVERHEAD at 90°, easing back
// to the turn that puts the low sun's spot on the observer's horizon at 0°.
function turnFor(deg) {
  const a = sunAnchors();
  let atHorizon = 22;
  if (a) {
    const homeUp = Math.atan2(home.ox - home.ex, -(home.oy - home.ey));   // clockwise from straight up
    const toSun = Math.atan2(a.down.x - home.ox, -(a.down.y - home.oy));
    atHorizon = (homeUp - toSun) * 180 / Math.PI - 90;
  }
  return atHorizon + (TURN_OVERHEAD - atHorizon) * deg / 90;
}

// Turn the Earth (the CSS rotation) and move the observer with it.
function setTurn(T) {
  turn = T;
  document.documentElement.style.setProperty('--earth-turn', `${-T}deg`);
  const o = observerAt(T), obs = $('observer');
  obs.style.right = 'auto';
  obs.style.left = o.box.x + 'px';
  obs.style.top = o.box.y + 'px';
  updateNotch();
}

// Where the sun sits for a given angle: in the direction that makes exactly
// that angle with the observer's horizon, at a distance between its overhead
// and low spots.
function sunCenter(deg) {
  const o = observerAt(turnFor(deg));
  const ux = (o.x - home.ex) / home.r, uy = (o.y - home.ey) / home.r;   // the observer's "up"
  const b = rad(90 - deg);                                                // tipped toward the left
  const dx = ux * Math.cos(b) + uy * Math.sin(b);
  const dy = -ux * Math.sin(b) + uy * Math.cos(b);
  let r = 400;
  const a = sunAnchors();
  if (a) {
    const rUp = Math.hypot(a.up.x - home.ox, a.up.y - home.oy);
    const rDown = Math.hypot(a.down.x - home.ox, a.down.y - home.oy);
    r = rDown + (rUp - rDown) * Math.max(-0.1, Math.min(1, deg / 90));
  }
  return { x: o.x + dx * r, y: o.y + dy * r };
}

// The chart's title bar collapses it to just the bar, or expands it again.
// It stays as the viewer left it while they move between scenes.
dockToggle.addEventListener('click', () => {
  const collapsed = dock.classList.toggle('collapsed');
  dockToggle.setAttribute('aria-expanded', String(!collapsed));
  dockToggle.title = collapsed ? 'Show the chart' : 'Hide the chart';
  placeDock();
});
dockToggle.title = 'Hide the chart';

function layout() {
  measureHome();
  setTurn(turnFor(angle));
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
  if (dock.classList.contains('collapsed')) {   // nothing to shrink into; just appear
    dock.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
    return;
  }
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

measureHome();
setTurn(turnFor(angle));

window.SkyFx = {
  box,
  sunCenter,
  // Turn the Earth for scenes 7–8 (true) or back (false), animating the change.
  turnEarth(on) {
    content.classList.toggle('earth-turned', on);
    content.classList.add('earth-turning');
    clearTimeout(turningTimer);
    turningTimer = setTimeout(() => content.classList.remove('earth-turning'), 1700);
  },
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
  layout,
};
