// Shared numbers for the animations. Everything visual is derived from these,
// so the chart, the sunlight animation and the observer's view agree.

export const RED_NM = 650;            // the "1×" reference on the chart
export const EARTH_MILES = 3959;      // Earth's radius
export const ATMOSPHERE_MILES = 62;   // about 100 km, the conventional edge of space

// Rayleigh scattering grows as 1/wavelength⁴.
export const scatterVsRed = nm => Math.pow(RED_NM / nm, 4);

// How much light of this wavelength the air scatters out of a beam coming
// straight down (optical depth). Standard fit for clean air at sea level.
export const opticalDepthOverhead = nm => 0.0088 * Math.pow(nm / 1000, -4.05);

// Kasten & Young (1989): how many "overhead atmospheres" of air the sunlight
// crosses at this elevation. Used for the physics, not the on-screen numbers.
export function airMass(deg) {
  const h = Math.max(deg, 0);
  return 1 / (Math.sin(h * Math.PI / 180) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
}

// Straight-line distance from the ground to the top of the atmosphere along
// the sun's direction, in miles.
export function pathMiles(deg) {
  const e = Math.max(deg, 0) * Math.PI / 180;
  const R = EARTH_MILES, top = EARTH_MILES + ATMOSPHERE_MILES;
  const c = R * Math.cos(e);
  return Math.sqrt(top * top - c * c) - R * Math.sin(e);
}

// The bands of color the sunlight animation draws.
export const BANDS = [
  { nm: 450, name: 'blue',   color: [90, 168, 255] },
  { nm: 530, name: 'green',  color: [120, 222, 120] },
  { nm: 575, name: 'yellow', color: [255, 226, 90] },
  { nm: 610, name: 'orange', color: [255, 165, 75] },
  { nm: 660, name: 'red',    color: [255, 92, 80] },
];

export function colorName(nm) {
  if (nm < 440) return 'violet';
  if (nm < 485) return 'blue';
  if (nm < 500) return 'cyan';
  if (nm < 565) return 'green';
  if (nm < 590) return 'yellow';
  if (nm < 625) return 'orange';
  return 'red';
}

// Approximate on-screen color of a wavelength (after Dan Bruton's mapping).
export function wavelengthRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440)      { r = (440 - nm) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
  else               { r = 1; }
  let f = 1;
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
  else if (nm > 680) f = 0.3 + 0.7 * (750 - nm) / 70;
  return [r, g, b].map(v => Math.round(255 * Math.pow(v * f, 0.8)));
}

export const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
