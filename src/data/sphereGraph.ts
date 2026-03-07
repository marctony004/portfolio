import { orbitNodes } from './brainData';

export interface SphereNodeData {
    id: string;
    label: string;
    category: string;
    summary: string;
    tech?: string[];
    bullets: string[];
    links?: { github?: string; demo?: string; email?: string; linkedin?: string };
    relatedIds: string[];
    position: [number, number, number];
    nodeType: 'center' | 'orbit' | 'child';
    parentId?: string; // set for child nodes; drives constellation visibility
}

export interface SphereEdgeData {
    source: string;
    target: string;
    type: 'primary' | 'child' | 'cross';
}

// Spherical coords → cartesian
function spherePos(theta: number, phi: number, r: number): [number, number, number] {
    const sp = Math.sin(phi), cp = Math.cos(phi);
    return [r * sp * Math.cos(theta), r * cp, r * sp * Math.sin(theta)];
}

// Fibonacci sphere — fallback for unlisted nodes
function fibPos(i: number, total: number, r: number): [number, number, number] {
    if (total === 1) return [0, r, 0];
    const golden = Math.PI * (Math.sqrt(5) - 1);
    const y   = 1 - (i / (total - 1)) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    const t   = golden * i;
    return [Math.cos(t) * rad * r, y * r, Math.sin(t) * rad * r];
}

// Distribute children in a cone around a parent position vector
function childrenAroundParent(
    parentPos: [number, number, number],
    count: number,
    r: number,
): [number, number, number][] {
    const [px, py, pz] = parentPos;
    const pLen = Math.sqrt(px * px + py * py + pz * pz) || 1;
    const ux = px / pLen, uy = py / pLen, uz = pz / pLen;

    // Build orthonormal basis perpendicular to parent direction
    const useAlt = Math.abs(uy) >= 0.85;
    const ax = useAlt ? 1 : 0, ay = 0, az = useAlt ? 0 : 1;
    const dot = ux * ax + uy * ay + uz * az;
    let vx = ax - dot * ux, vy = ay - dot * uy, vz = az - dot * uz;
    const vl = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
    vx /= vl; vy /= vl; vz /= vl;
    const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx;

    const cone = 0.52;
    const cc = Math.cos(cone), sc = Math.sin(cone);

    return Array.from({ length: count }, (_, i) => {
        const ring = (2 * Math.PI * i) / count;
        const cr = Math.cos(ring), sr = Math.sin(ring);
        return [
            (ux * cc + (vx * cr + wx * sr) * sc) * r,
            (uy * cc + (vy * cr + wy * sr) * sc) * r,
            (uz * cc + (vz * cr + wz * sr) * sc) * r,
        ] as [number, number, number];
    });
}

const ORBIT_CATEGORY: Record<string, string> = {
    projects:   'Portfolio',
    cv:         'AI / ML Skill',
    nlp:        'AI / ML Skill',
    leadership: 'Experience',
    education:  'Education',
    contact:    'Connect',
};

const ORBIT_R = 2.5;
const CHILD_R = 3.85;

// Intentional zone layout — semantic grouping for spatial readability.
// Tech/AI skills cluster on the right hemisphere (+z), leadership/education on the left (-z),
// projects prominent at front-top, contact tucked at front-bottom.
const ORBIT_ZONE: Record<string, [number, number, number]> = {
    projects:   spherePos(0,      0.85, ORBIT_R), // front-top, prominent
    cv:         spherePos(1.15,   1.05, ORBIT_R), // right-upper (tech skills)
    nlp:        spherePos(1.95,   1.50, ORBIT_R), // right-equator (AI / NLP)
    leadership: spherePos(-1.05,  0.80, ORBIT_R), // left-top (leadership)
    education:  spherePos(-1.85,  1.25, ORBIT_R), // left-mid (education)
    contact:    spherePos(0.15,   2.30, ORBIT_R), // front-bottom
};

const orbitPositions = orbitNodes.map((n, i) =>
    ORBIT_ZONE[n.id] ?? fibPos(i, orbitNodes.length, ORBIT_R),
);
const projectsIdx    = orbitNodes.findIndex(n => n.id === 'projects');
const childPos       = childrenAroundParent(
    orbitPositions[projectsIdx],
    orbitNodes[projectsIdx].children!.length,
    CHILD_R,
);

export const sphereNodes: SphereNodeData[] = [
    // ── Center identity node ──────────────────────────────────────────────────
    {
        id: 'marc-smith',
        label: 'Marc Smith',
        category: 'Identity',
        summary: 'AI/ML Engineer & Full-Stack Developer based in Miami, FL. Building real-world AI tools across computer vision, NLP/LLMs, and full-stack systems.',
        bullets: [
            'Pursuing B.S. Applied Artificial Intelligence at Miami Dade College',
            '10+ years in leadership and operations at Apple and Zumiez',
            'Open to full-time AI/ML and full-stack engineering roles',
        ],
        links: {
            email: 'mailto:marc.tonysmith@gmail.com',
            github: 'https://github.com/marctony004',
            linkedin: 'https://www.linkedin.com/in/marc-smith-786685336',
        },
        relatedIds: orbitNodes.map(n => n.id),
        position: [0, 0, 0],
        nodeType: 'center',
    },
    // ── Orbit nodes ───────────────────────────────────────────────────────────
    ...orbitNodes.map((n, i): SphereNodeData => ({
        id: n.id,
        label: n.label,
        category: ORBIT_CATEGORY[n.id] ?? n.label,
        summary: n.summary,
        tech: n.tech,
        bullets: n.bullets,
        links: n.links,
        relatedIds: ['marc-smith', ...(n.children?.map(c => c.id) ?? [])],
        position: orbitPositions[i],
        nodeType: 'orbit',
    })),
    // ── Project children ──────────────────────────────────────────────────────
    ...orbitNodes[projectsIdx].children!.map((child, i): SphereNodeData => ({
        id: child.id,
        label: child.label,
        category: 'Project',
        summary: child.summary,
        tech: child.tech,
        bullets: child.bullets,
        links: child.links,
        relatedIds: ['projects'],
        position: childPos[i], // placeholder; overridden by constellation layout at runtime
        nodeType: 'child',
        parentId: 'projects',
    })),
];

// Set of node ids that have expandable children
export const EXPANDABLE_IDS = new Set(
    sphereNodes.filter(n => n.parentId).map(n => n.parentId!),
);

export const sphereEdges: SphereEdgeData[] = [
    ...orbitNodes.map(n => ({ source: 'marc-smith', target: n.id, type: 'primary' as const })),
    ...orbitNodes[projectsIdx].children!.map(c => ({ source: 'projects', target: c.id, type: 'child' as const })),
    { source: 'cv',  target: 'no-strings',   type: 'cross' },
    { source: 'cv',  target: 'ai-math-notes', type: 'cross' },
    { source: 'nlp', target: 'flowstate-1',  type: 'cross' },
    { source: 'nlp', target: 'flowstate-2',  type: 'cross' },
];
