// The Brick tile (public/logo.svg) drawn inline so its squares can move: an
// 8 x 8 grid of pixels, some lit to make the B and the rest dimmed. On load
// the squares pop in from the top left, then a soft glow sweeps across the
// lit ones on the diagonal. The motion lives in index.css (.pixel-logo) and
// stops for visitors who ask for reduced motion.

import type { CSSProperties } from "react";

// "#" is a lit square, "." a dimmed one.
export const GRID = [
  ".#####..",
  ".######.",
  ".#....#.",
  ".#####..",
  ".#####..",
  ".#....#.",
  ".######.",
  ".#####..",
];

const SQUARES = GRID.flatMap((row, r) => [...row].map((cell, c) => ({ r, c, lit: cell === "#" })));

export function PixelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 360" className={`pixel-logo ${className ?? ""}`} role="img" aria-label="Build" xmlns="http://www.w3.org/2000/svg">
      <rect width="360" height="360" rx="80" fill="#3D38B8" />
      {SQUARES.map(({ r, c, lit }) => (
        <rect
          key={`${r}-${c}`}
          className={lit ? "pixel pixel-lit" : "pixel"}
          x={63 + c * 30}
          y={63 + r * 30}
          width="24"
          height="24"
          rx="4"
          fill="#E9E9FF"
          style={
            {
              opacity: lit ? 1 : 0.1,
              "--o": lit ? 1 : 0.1,
              "--in": `${(r + c) * 45}ms`,
              "--glow": `${1200 + (r + c) * 180}ms`,
            } as CSSProperties
          }
        />
      ))}
    </svg>
  );
}
