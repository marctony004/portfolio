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
    overviewPosition?: [number, number, number]; // used in overview mode (center selected) to spread projects across the sphere
    nodeType: 'center' | 'orbit' | 'project' | 'capability' | 'tool';
    parentId?: string; // set for project/tool nodes; drives constellation visibility
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
const ORBIT_ZONE: Record<string, [number, number, number]> = {
    projects:   spherePos(0,      0.85, ORBIT_R), // front-top, prominent
    cv:         spherePos(1.15,   1.05, ORBIT_R), // right-upper
    nlp:        spherePos(1.95,   1.50, ORBIT_R), // right-equator
    leadership: spherePos(-1.05,  0.80, ORBIT_R), // left-top
    education:  spherePos(-1.85,  1.25, ORBIT_R), // left-mid
    contact:    spherePos(0.15,   2.30, ORBIT_R), // front-bottom
};

// Capability nodes sit on the same shell (ORBIT_R) in back/side zones
// that are clear of the primary orbit nodes — they appear contextually,
// so minor angular proximity to orbit nodes is fine.
const CAP_ZONE: Record<string, [number, number, number]> = {
    'cap-vision':         spherePos(0.65,  0.58, ORBIT_R), // upper-right-front
    'cap-symbolic-ai':    spherePos(2.75,  1.28, ORBIT_R), // right-back
    'cap-ai-interfaces':  spherePos(-0.42, 0.62, ORBIT_R), // upper-left-front
    'cap-realtime':       spherePos(2.18,  1.92, ORBIT_R), // lower-right-back
    'cap-ai-productivity':spherePos(-2.42, 1.58, ORBIT_R), // left-back
};

const orbitPositions = orbitNodes.map((n, i) =>
    ORBIT_ZONE[n.id] ?? fibPos(i, orbitNodes.length, ORBIT_R),
);
const projectsIdx = orbitNodes.findIndex(n => n.id === 'projects');
const childPos    = childrenAroundParent(
    orbitPositions[projectsIdx],
    orbitNodes[projectsIdx].children!.length,
    CHILD_R,
);

// Maps each project to the capabilities it demonstrates
// (drives cross edges and relatedIds)
const PROJECT_CAPABILITIES: Record<string, string[]> = {
    'no-strings':         ['cap-vision', 'cap-realtime'],
    'ai-math-notes':      ['cap-vision', 'cap-symbolic-ai', 'cap-ai-interfaces'],
    'flowstate-1':        ['cap-ai-interfaces', 'cap-ai-productivity'],
    'flowstate-2':        ['cap-ai-interfaces', 'cap-ai-productivity', 'cap-realtime'],
    'smart-calendar':     ['cap-ai-interfaces', 'cap-vision'],
    'calories':           ['cap-ai-productivity'],
};

// Hand-placed spread positions for projects in overview mode (center node selected).
// Distributed across the sphere to avoid orbit/capability node zones.
const PROJECT_OVERVIEW_POSITIONS: Record<string, [number, number, number]> = {
    'ai-math-notes':  spherePos(3.14, 0.62, ORBIT_R), // pure back, slightly upper
    'no-strings':     spherePos(0.90, 1.78, ORBIT_R), // right-lower-front
    'flowstate-1':    spherePos(-3.00, 0.72, ORBIT_R), // left-far-back upper
    'flowstate-2':    spherePos(2.35,  0.48, ORBIT_R), // upper-right-back
    'smart-calendar': spherePos(-1.30, 2.05, ORBIT_R), // left-lower
    'calories':       spherePos(1.80,  2.35, ORBIT_R), // right-lower-back
};

// ── Capability nodes ───────────────────────────────────────────────────────────
// Positioned at ORBIT_R (same shell as orbit nodes).
// NOT permanently visible — they appear contextually when a related node is selected.
const capabilityNodes: SphereNodeData[] = [
    {
        id: 'cap-vision',
        label: 'Computer Vision',
        category: 'Capability',
        summary: 'Real-time visual understanding through gesture tracking and multi-modal OCR pipelines.',
        bullets: [
            'MediaPipe 21-point hand landmark detection at 30fps in No Strings Attached',
            'Dual-model OCR ensemble: TrOCR for handwriting + Google ML Kit for print in AI Math Notes',
            'Sub-50ms gesture-to-audio latency pipeline',
        ],
        relatedIds: ['marc-smith', 'cv', 'no-strings', 'ai-math-notes', 'smart-calendar', 'tool-mediapipe', 'tool-opencv'],
        position: CAP_ZONE['cap-vision'],
        nodeType: 'capability',
    },
    {
        id: 'cap-symbolic-ai',
        label: 'Symbolic AI',
        category: 'Capability',
        summary: 'Formal reasoning and mathematical computation — converting natural input into symbolic expressions for solving and explanation.',
        bullets: [
            'SymPy converts handwritten math into solvable symbolic expressions in AI Math Notes',
            'Bridges OCR output and GPT-4 Turbo explanation generation in AI Math Notes',
            'Enables step-by-step symbolic solutions from natural handwritten input',
        ],
        relatedIds: ['marc-smith', 'ai-math-notes', 'tool-sympy'],
        position: CAP_ZONE['cap-symbolic-ai'],
        nodeType: 'capability',
    },
    {
        id: 'cap-ai-interfaces',
        label: 'AI Interfaces',
        category: 'Capability',
        summary: 'User-facing AI systems — voice agents, mobile apps, and intelligent UI that make AI accessible and interactive.',
        bullets: [
            'Vapi + Gemini 1.5 voice AI agent with RAG in FlowState 2.0',
            'Flutter mobile interface for AI Math Notes (cross-platform OCR app)',
            'ADHD-aware coaching interface in FlowState 1.0 Chrome extension',
        ],
        relatedIds: ['marc-smith', 'nlp', 'ai-math-notes', 'flowstate-1', 'flowstate-2', 'smart-calendar', 'tool-flutter', 'tool-python'],
        position: CAP_ZONE['cap-ai-interfaces'],
        nodeType: 'capability',
    },
    {
        id: 'cap-realtime',
        label: 'Real-Time Systems',
        category: 'Capability',
        summary: 'Low-latency event-driven systems for audio synthesis, live data, and real-time sync.',
        bullets: [
            'Tone.js custom synthesis engine with sub-50ms gesture-to-audio latency in No Strings Attached',
            'Supabase Edge Functions for real-time workspace sync in FlowState 2.0',
            'MediaPipe gesture stream at 30fps driving live audio parameters',
        ],
        relatedIds: ['marc-smith', 'no-strings', 'flowstate-2', 'tool-tonejs'],
        position: CAP_ZONE['cap-realtime'],
        nodeType: 'capability',
    },
    {
        id: 'cap-ai-productivity',
        label: 'AI Productivity',
        category: 'Capability',
        summary: 'AI systems that enhance focus, workflow, and task completion — from voice-driven task parsing to intelligent scheduling.',
        bullets: [
            'Custom NLP task parser that converts voice input to structured tasks in FlowState 2.0',
            'FastAPI backend powering AI workspace logic and data pipelines',
            'Syllabus OCR → conflict-free auto-scheduling engine in Smart Calendar (JavaFX)',
        ],
        relatedIds: ['marc-smith', 'flowstate-1', 'flowstate-2', 'calories', 'tool-fastapi'],
        position: CAP_ZONE['cap-ai-productivity'],
        nodeType: 'capability',
    },
];

// ── Tool nodes (constellation children of capabilities, hidden until parent expanded) ──
const toolNodes: SphereNodeData[] = [
    // cap-vision tools
    {
        id: 'tool-mediapipe',
        label: 'MediaPipe',
        category: 'Tool',
        summary: 'Google ML framework for real-time hand and body landmark detection. Powers gesture-to-music control in No Strings Attached.',
        bullets: ['21-point hand landmark model at 30fps', 'Drives gesture-to-audio synthesis in No Strings Attached'],
        relatedIds: ['cap-vision', 'no-strings'],
        position: [0, 0, 0], // overridden by constellation at runtime
        nodeType: 'tool',
        parentId: 'cap-vision',
    },
    {
        id: 'tool-opencv',
        label: 'OpenCV',
        category: 'Tool',
        summary: 'Computer vision library for image preprocessing and visual processing pipelines in AI Math Notes.',
        bullets: ['Image preprocessing for handwriting recognition pipeline', 'Used in AI Math Notes dual-model OCR ensemble'],
        relatedIds: ['cap-vision', 'ai-math-notes'],
        position: [0, 0, 0],
        nodeType: 'tool',
        parentId: 'cap-vision',
    },
    // cap-symbolic-ai tools
    {
        id: 'tool-sympy',
        label: 'SymPy',
        category: 'Tool',
        summary: 'Python symbolic mathematics library. Converts OCR-extracted expressions into solvable form and generates step-by-step solutions in AI Math Notes.',
        bullets: ['Converts handwritten math into symbolic expressions', 'Drives GPT-4 Turbo explanation generation in AI Math Notes'],
        relatedIds: ['cap-symbolic-ai', 'ai-math-notes'],
        position: [0, 0, 0],
        nodeType: 'tool',
        parentId: 'cap-symbolic-ai',
    },
    // cap-ai-interfaces tools
    {
        id: 'tool-flutter',
        label: 'Flutter',
        category: 'Tool',
        summary: 'Google\'s cross-platform UI framework used for the AI Math Notes mobile app (Android/iOS), integrating camera OCR and real-time AI feedback.',
        bullets: ['Cross-platform mobile app for AI Math Notes', 'Integrates camera, OCR pipeline, and AI tutor in one app'],
        relatedIds: ['cap-ai-interfaces', 'ai-math-notes'],
        position: [0, 0, 0],
        nodeType: 'tool',
        parentId: 'cap-ai-interfaces',
    },
    {
        id: 'tool-python',
        label: 'Python',
        category: 'Tool',
        summary: 'Primary language for ML pipelines, backend APIs, data processing, and AI model development across all projects.',
        bullets: ['ML model development and data pipelines', 'FastAPI, SymPy, Scikit-learn, and OpenCV integrations'],
        relatedIds: ['cap-ai-interfaces', 'ai-math-notes', 'flowstate-2', 'calories'],
        position: [0, 0, 0],
        nodeType: 'tool',
        parentId: 'cap-ai-interfaces',
    },
    // cap-realtime tools
    {
        id: 'tool-tonejs',
        label: 'Tone.js',
        category: 'Tool',
        summary: 'Web audio framework used in No Strings Attached to build a custom synthesis engine that maps hand gestures to musical parameters in real time.',
        bullets: ['Custom synthesis engine with sub-50ms latency', 'Maps 21 hand landmark parameters to audio in No Strings Attached'],
        relatedIds: ['cap-realtime', 'no-strings'],
        position: [0, 0, 0],
        nodeType: 'tool',
        parentId: 'cap-realtime',
    },
    // cap-ai-productivity tools
    {
        id: 'tool-fastapi',
        label: 'FastAPI',
        category: 'Tool',
        summary: 'Python async web framework powering the backend API in FlowState 2.0 — handles AI task parsing, workspace data, and integration with Supabase.',
        bullets: ['Async REST API backend for FlowState 2.0', 'Integrates NLP task parser, Supabase, and AI agent routing'],
        relatedIds: ['cap-ai-productivity', 'flowstate-2'],
        position: [0, 0, 0],
        nodeType: 'tool',
        parentId: 'cap-ai-productivity',
    },
];

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
            email:    'mailto:marc.tonysmith@gmail.com',
            github:   'https://github.com/marctony004',
            linkedin: 'https://www.linkedin.com/in/marc-smith-786685336',
        },
        relatedIds: [
            ...orbitNodes.map(n => n.id),
            ...capabilityNodes.map(n => n.id),
        ],
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
        relatedIds: [
            'marc-smith',
            ...(n.children?.map(c => c.id) ?? []),
            // Domain → capability cross-links for dimming awareness
            ...(n.id === 'cv'  ? ['cap-vision']                              : []),
            ...(n.id === 'nlp' ? ['cap-symbolic-ai', 'cap-ai-interfaces']    : []),
        ],
        position: orbitPositions[i],
        nodeType: 'orbit',
    })),
    // ── Project nodes (children of 'projects' orbit) ──────────────────────────
    ...orbitNodes[projectsIdx].children!.map((child, i): SphereNodeData => ({
        id: child.id,
        label: child.label,
        category: 'Project',
        summary: child.summary,
        tech: child.tech,
        bullets: child.bullets,
        links: child.links,
        relatedIds: [
            'projects',
            ...(PROJECT_CAPABILITIES[child.id] ?? []),
        ],
        position: childPos[i], // placeholder; overridden by constellation at runtime
        overviewPosition: PROJECT_OVERVIEW_POSITIONS[child.id],
        nodeType: 'project',
        parentId: 'projects',
    })),
    // ── Capability nodes (contextual — appear when related node is selected) ──
    ...capabilityNodes,
    // ── Tool nodes (children of capabilities, constellation-placed at runtime) ─
    ...toolNodes,
];

// Set of node ids that have expandable children
export const EXPANDABLE_IDS = new Set(
    sphereNodes.filter(n => n.parentId).map(n => n.parentId!),
);

export const sphereEdges: SphereEdgeData[] = [
    // Center → orbit (6 primary spokes)
    ...orbitNodes.map(n => ({ source: 'marc-smith', target: n.id, type: 'primary' as const })),
    // Orbit 'projects' → project nodes (child edges)
    ...orbitNodes[projectsIdx].children!.map(c => ({ source: 'projects', target: c.id, type: 'child' as const })),
    // Capability → tool nodes (child edges — used for constellation expansion)
    ...toolNodes.map(t => ({ source: t.parentId!, target: t.id, type: 'child' as const })),
    // Project → capability cross edges (knowledge graph relationships)
    ...orbitNodes[projectsIdx].children!.flatMap(child =>
        (PROJECT_CAPABILITIES[child.id] ?? []).map(capId => ({
            source: child.id, target: capId, type: 'cross' as const,
        }))
    ),
    // Domain orbit → related capability cross edges
    { source: 'cv',  target: 'cap-vision',         type: 'cross' as const },
    { source: 'nlp', target: 'cap-symbolic-ai',    type: 'cross' as const },
    { source: 'nlp', target: 'cap-ai-interfaces',  type: 'cross' as const },
];
