// Placeholder "field photos" for seeding the prototype. Real uploads happen in
// the mobile app's local session and don't persist to the web NO app, so the
// dashboard uses these inline SVG data URIs (offline-safe, no assets needed).

interface Palette {
  floor: string;
  box: string;
  boxDark: string;
  box2: string;
  box2Dark: string;
}

const PALETTES: Palette[] = [
  { floor: "#cbd5e1", box: "#d9a066", boxDark: "#a86b32", box2: "#e0b877", box2Dark: "#b07d3a" },
  { floor: "#c7d2df", box: "#c98b52", boxDark: "#8f5c26", box2: "#d7ad6b", box2Dark: "#9c6f31" },
  { floor: "#d2d8e0", box: "#e0b877", boxDark: "#b07d3a", box2: "#cf9a5c", box2Dark: "#9c6329" },
];

function boxPhoto(label: string, seed: number): string {
  const p = PALETTES[seed % PALETTES.length];
  const h1 = 120 + (seed % 3) * 12;
  const h2 = 150 + ((seed + 1) % 3) * 16;
  const y1 = 310 - h1;
  const y2 = 310 - h2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#eef2f7"/>
  <rect y="290" width="400" height="110" fill="${p.floor}"/>
  <g>
    <rect x="52" y="${y1}" width="140" height="${h1}" fill="${p.box}" stroke="${p.boxDark}" stroke-width="3"/>
    <rect x="52" y="${y1 + 34}" width="140" height="15" fill="${p.boxDark}" opacity="0.45"/>
    <line x1="122" y1="${y1}" x2="122" y2="310" stroke="${p.boxDark}" stroke-width="5" opacity="0.45"/>
  </g>
  <g>
    <rect x="212" y="${y2}" width="150" height="${h2}" fill="${p.box2}" stroke="${p.box2Dark}" stroke-width="3"/>
    <rect x="212" y="${y2 + 40}" width="150" height="15" fill="${p.box2Dark}" opacity="0.45"/>
    <line x1="287" y1="${y2}" x2="287" y2="310" stroke="${p.box2Dark}" stroke-width="5" opacity="0.45"/>
  </g>
  <rect x="12" y="356" width="156" height="30" rx="4" fill="#0f172a" opacity="0.55"/>
  <text x="22" y="377" font-family="monospace" font-size="18" fill="#ffffff">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// A small pool of sample photos; seed issues slice from this.
export const SAMPLE_FIELD_PHOTOS: string[] = [
  boxPhoto("IMG_4821.JPG", 0),
  boxPhoto("IMG_4822.JPG", 1),
  boxPhoto("IMG_4823.JPG", 2),
  boxPhoto("IMG_4824.JPG", 3),
];
