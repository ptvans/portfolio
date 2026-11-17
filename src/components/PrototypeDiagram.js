import React, { useEffect, useState } from 'react';
import './PrototypeDiagram.css';

// Sample data entities, laid out as a small interconnected graph.
const NODES = {
  vendors: { x: 104, y: 26 },
  customers: { x: 34, y: 84 },
  products: { x: 168, y: 94 },
  billing: { x: 70, y: 164 },
  compliance: { x: 164, y: 184 },
  workflows: { x: 34, y: 250 },
  equipment: { x: 168, y: 272 },
  projects: { x: 96, y: 314 },
};

// The pastel palette the links sweep through (same hues as the dots).
const SWEEP = ['#f9a8d4', '#fdba74', '#fde68a', '#86efac', '#7dd3fc', '#a5b4fc', '#d8b4fe', '#fca5a5', '#f9a8d4'];

const EDGES = [
  ['vendors', 'customers'],
  ['vendors', 'products'],
  ['customers', 'products'],
  ['customers', 'billing'],
  ['products', 'billing'],
  ['products', 'compliance'],
  ['vendors', 'compliance'],
  ['billing', 'compliance'],
  ['billing', 'workflows'],
  ['customers', 'workflows'],
  ['compliance', 'projects'],
  ['workflows', 'projects'],
  ['billing', 'projects'],
  ['compliance', 'equipment'],
  ['equipment', 'projects'],
  ['products', 'equipment'],
];

const PROTOTYPES = [
  {
    area: 'enterprise',
    label: 'Enterprise Tools',
    caption: 'Ops console: automation graph inspector',
    href: './protos/#/internal-ops/sops/sop-coco-dispatch/versions/3?view=graph',
    image: './images/protos/automation-graph-4x3.jpg',
    alt: 'Internal ops web app showing a large automation workflow graph',
    position: 'center',
  },
  {
    area: 'consumer',
    label: 'Mobile Apps',
    caption: 'Mobile app: operator assistant',
    href: './protos/#/brick-ops',
    image: './images/protos/brick-ops.jpg',
    alt: 'Mobile app where an AI agent explains an automation it learned',
    position: 'center top',
  },
];

function Arrow({ area }) {
  return (
    <svg className={`pd-arrow pd-arrow-${area}`} viewBox="0 0 64 22" aria-hidden="true">
      <line x1="2" y1="11" x2="58" y2="11" />
      <polyline points="49,3 59,11 49,19" />
    </svg>
  );
}

// The link animation is decoration; skip it for people who ask for less motion.
function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function PrototypeDiagram() {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <figure className="prototype-diagram">
      <div className="pd-data">
        <div className="pd-label">Your Sample Data</div>
        <svg
          className="pd-cluster"
          viewBox="0 0 200 336"
          role="img"
          aria-label="Interconnected sample data: vendors, customers, products, billing, compliance, workflows, equipment and projects"
        >
          <defs>
            {/* One gradient across the whole cluster, in user space so
                vertical links still get color; sliding it along its own
                vector (with repeat) sweeps the palette through every link.
                The vector is ~3x the cluster, so only a few hues show at once. */}
            <linearGradient id="pd-link-sweep" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="640" y2="384" spreadMethod="repeat">
              {SWEEP.map((color, i) => (
                <stop key={i} offset={i / (SWEEP.length - 1)} stopColor={color} />
              ))}
              {!reducedMotion && (
                <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="640 384" dur="16s" repeatCount="indefinite" />
              )}
            </linearGradient>
          </defs>
          {EDGES.map(([a, b]) => (
            <line
              className="pd-link"
              key={`${a}-${b}`}
              x1={NODES[a].x}
              y1={NODES[a].y}
              x2={NODES[b].x}
              y2={NODES[b].y}
            />
          ))}
          {Object.entries(NODES).map(([name, { x, y }]) => (
            <g key={name}>
              <circle className={`pd-dot-${name}`} cx={x} cy={y} r="7" />
              {/* The halo is its own copy under the label, not paint-order on
                  one element: Safari ignores paint-order here and draws the
                  page-colored stroke over the text, hiding it. */}
              <text className="pd-label-halo" x={x} y={y + 19} textAnchor="middle" aria-hidden="true">
                {name}
              </text>
              <text className="pd-label-text" x={x} y={y + 19} textAnchor="middle">
                {name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Both arrows in one column centered on the cluster, fanning out. */}
      <div className="pd-arrows">
        {PROTOTYPES.map((p) => (
          <Arrow key={p.area} area={p.area} />
        ))}
      </div>

      {PROTOTYPES.map((p) => (
        <React.Fragment key={p.area}>
          <a className={`pd-card pd-card-${p.area}`} href={p.href}>
            <div className="pd-label">{p.label}</div>
            <div className="pd-thumb">
              <img src={p.image} alt={p.alt} style={{ objectPosition: p.position }} loading="lazy" />
            </div>
            <div className="pd-caption">
              {p.caption} <span aria-hidden="true">→</span>
            </div>
          </a>
        </React.Fragment>
      ))}
    </figure>
  );
}

export default PrototypeDiagram;
