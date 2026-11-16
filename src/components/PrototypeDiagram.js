import React from 'react';
import './PrototypeDiagram.css';

// Sample data entities, laid out as a small interconnected graph.
const NODES = {
  vendors: { x: 104, y: 28 },
  customers: { x: 34, y: 86 },
  products: { x: 168, y: 96 },
  billing: { x: 70, y: 164 },
  compliance: { x: 160, y: 182 },
  workflows: { x: 38, y: 246 },
  projects: { x: 140, y: 272 },
};

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
];

const PROTOTYPES = [
  {
    area: 'enterprise',
    label: 'Enterprise views',
    caption: 'Ops console: SOP graph inspector',
    href: './protos/#/internal-ops/sops/sop-coco-dispatch/versions/3?view=graph',
    image: './images/protos/coco-graph.jpg',
    alt: 'Internal ops web app showing an SOP workflow graph with a node inspector panel',
    position: 'left top',
  },
  {
    area: 'consumer',
    label: 'Consumer products',
    caption: 'Mobile app: ops agent chat',
    href: './protos/#/brick-ops',
    image: './images/protos/brick-ops.jpg',
    alt: 'Mobile app where an AI agent explains an automation it learned',
    position: 'center 18%',
  },
];

function Arrow({ area }) {
  return (
    <svg className={`pd-arrow pd-arrow-${area}`} viewBox="0 0 48 16" aria-hidden="true">
      <line x1="2" y1="8" x2="42" y2="8" />
      <polyline points="36,3 43,8 36,13" />
    </svg>
  );
}

function PrototypeDiagram() {
  return (
    <figure className="prototype-diagram">
      <div className="pd-data">
        <div className="pd-label">Your Sample Data</div>
        <svg
          className="pd-cluster"
          viewBox="0 0 200 300"
          role="img"
          aria-label="Interconnected sample data: vendors, customers, products, billing, compliance, workflows and projects"
        >
          {EDGES.map(([a, b]) => (
            <line
              key={`${a}-${b}`}
              x1={NODES[a].x}
              y1={NODES[a].y}
              x2={NODES[b].x}
              y2={NODES[b].y}
            />
          ))}
          {Object.entries(NODES).map(([name, { x, y }]) => (
            <g key={name}>
              <circle cx={x} cy={y} r="5" />
              <text x={x} y={y + 19} textAnchor="middle">
                {name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {PROTOTYPES.map((p) => (
        <React.Fragment key={p.area}>
          <Arrow area={p.area} />
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
