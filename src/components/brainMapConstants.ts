import { Layers, Eye, Brain, Users, BookOpen, Mail, type LucideIcon } from 'lucide-react';
import { orbitNodes } from '../data/brainData';

// ── Layout & indexing ────────────────────────────────────────────────────────
export const ORBIT_ANGLES      = [-90, -30, 30, 90, 150, 210];
export const PROJECTS_IDX      = orbitNodes.findIndex(n => n.id === 'projects');
export const PROJECTS_ANGLE    = ORBIT_ANGLES[PROJECTS_IDX] ?? -90;
export const PROJECTS_CHILDREN = PROJECTS_IDX >= 0 ? (orbitNodes[PROJECTS_IDX].children ?? []) : [];

export const ICONS: Record<string, LucideIcon> = {
    projects: Layers, cv: Eye, nlp: Brain, leadership: Users, education: BookOpen, contact: Mail,
};

// Which capabilities each orbit node represents (for cross-edge derivation)
export const ORBIT_CAP_MAP: Record<string, string[]> = {
    cv:  ['Computer Vision', 'Real-Time'],
    nlp: ['NLP/LLMs', 'Azure'],
};

// ── Orbital physics ──────────────────────────────────────────────────────────
// Tight, cinematic drift (≤4.5 px) with fully independent X/Y periods.
// Irrational omega ratios prevent synchronization; organic phases avoid clustering.
const BASE_OMEGA = (2 * Math.PI) / 18000; // 18 s reference — slower feels weightier

export const ORBITAL_PARAMS = [
    //          amplX  amplY  omegaX (≈period)       omegaY (≈period)       phaseX  phaseY
    /* 0 -90° */ { amplX: 2.8, amplY: 3.8, omegaX: BASE_OMEGA * 0.794, omegaY: BASE_OMEGA * 1.183, phaseX: 0.00, phaseY: 0.91 },
    /* 1 -30° */ { amplX: 3.5, amplY: 2.4, omegaX: BASE_OMEGA * 1.137, omegaY: BASE_OMEGA * 0.681, phaseX: 1.07, phaseY: 1.73 },
    /* 2  30° */ { amplX: 3.1, amplY: 3.6, omegaX: BASE_OMEGA * 0.863, omegaY: BASE_OMEGA * 1.072, phaseX: 2.33, phaseY: 0.44 },
    /* 3  90° */ { amplX: 3.8, amplY: 2.7, omegaX: BASE_OMEGA * 0.711, omegaY: BASE_OMEGA * 1.214, phaseX: 3.58, phaseY: 2.61 },
    /* 4 150° */ { amplX: 2.5, amplY: 3.4, omegaX: BASE_OMEGA * 1.209, omegaY: BASE_OMEGA * 0.743, phaseX: 4.44, phaseY: 3.82 },
    /* 5 210° */ { amplX: 3.3, amplY: 2.9, omegaX: BASE_OMEGA * 0.958, omegaY: BASE_OMEGA * 0.877, phaseX: 5.67, phaseY: 1.19 },
]; // Periods ~14.9–25.3 s; irrational ratios ensure no two nodes ever repeat in sync

// Depth scale per orbit node — 1.0 = full presence, lower = softer visual weight.
export const ORBIT_DEPTHS = [0.96, 0.81, 0.77, 1.00, 0.74, 0.88];

// ── Stars ────────────────────────────────────────────────────────────────────
export const STARS = [
    { x: 0.07, y: 0.11, r: 1.1 }, { x: 0.88, y: 0.17, r: 0.9 },
    { x: 0.21, y: 0.83, r: 0.8 }, { x: 0.74, y: 0.73, r: 1.0 },
    { x: 0.47, y: 0.07, r: 0.9 }, { x: 0.92, y: 0.53, r: 1.0 },
    { x: 0.13, y: 0.47, r: 0.7 }, { x: 0.63, y: 0.92, r: 1.1 },
    { x: 0.37, y: 0.32, r: 0.8 }, { x: 0.83, y: 0.88, r: 0.7 },
    { x: 0.54, y: 0.54, r: 0.6 }, { x: 0.04, y: 0.67, r: 0.9 },
    { x: 0.94, y: 0.34, r: 0.8 }, { x: 0.31, y: 0.05, r: 1.0 },
    { x: 0.78, y: 0.43, r: 0.7 },
];

// ── Edge styling ─────────────────────────────────────────────────────────────
export const EDGE_C = {
    primary: { base: 'rgba(61,227,255,0.19)', hover: 'rgba(61,227,255,0.38)', active: 'rgba(61,227,255,0.54)' },
    child:   { base: 'rgba(154,176,204,0.11)', hover: 'rgba(61,227,255,0.26)', active: 'rgba(61,227,255,0.42)' },
    cross:   { base: 'rgba(61,227,255,0.08)', hover: 'rgba(61,227,255,0.28)', active: 'rgba(61,227,255,0.44)' },
};
export const EDGE_W = {
    primary: { base: 1.0, hover: 1.15, active: 1.45 },
    child:   { base: 0.7, hover: 0.95, active: 1.1  },
    cross:   { base: 0.5, hover: 0.85, active: 1.0  },
};

// ── Geometry helpers ─────────────────────────────────────────────────────────
export interface Pos { x: number; y: number; }

export function orbitPositions(cx: number, cy: number, r: number): Pos[] {
    return ORBIT_ANGLES.map(deg => {
        const rad = (deg * Math.PI) / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    });
}

export function childPositions(px: number, py: number, angleDeg: number, count: number, r: number): Pos[] {
    if (count === 0) return [];
    const spread = 150;
    const start  = angleDeg - spread / 2;
    return Array.from({ length: count }, (_, i) => {
        const rad = ((start + (count > 1 ? (spread / (count - 1)) * i : 0)) * Math.PI) / 180;
        return { x: px + r * Math.cos(rad), y: py + r * Math.sin(rad) };
    });
}
