import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ORBIT_ANGLES } from './brainMapConstants';

// ── Timing ─────────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];
const DUR = 3.2; // seconds — deliberate, cinematic pacing

// Keyframe time anchors (fractions of DUR):
const T_CONTRACT  = 0.35; // nodes fully converge at center
const T_SPHERE    = 0.70; // nodes reach sphere positions
const T_FLASH     = 0.74; // per-node arrival flash peak
const T_SETTLE    = 0.81; // node settled at sphere position
const T_PULSE_END = 0.93; // stabilization glow fades

// ── Sphere target positions ────────────────────────────────────────────────────
// Approximate 2D screen-space projections of the Brain Sphere's orbit nodes
// as seen from the default camera (theta=0, phi=1.18, distance=6.5, fov=60).
// Computed via perspective projection of each node's 3D world position.
// Expressed as fractions of `sphereR`. Order = orbitNodes array order:
// projects, cv, nlp, leadership, education, contact.
const SPHERE_FRACS: [number, number][] = [
    [ 0.00, -0.46],  // projects   — center top
    [-0.82, -0.34],  // cv         — screen left, upper  (+Z world)
    [-0.69, -0.15],  // nlp        — screen left, mid    (+Z world)
    [ 0.67, -0.55],  // leadership — screen right, upper (-Z world)
    [ 0.73, -0.31],  // education  — screen right, mid   (-Z world)
    [-0.11,  0.89],  // contact    — near bottom
];

// ── Quadratic Bezier sampler ────────────────────────────────────────────────────
// Generates n points along a quadratic Bezier from p0 through ctrl to p2.
// Using this to pre-compute arc paths so Framer Motion interpolates linearly
// between closely spaced points — producing smooth curves without CSS motion-path.
function quadBez(
    p0:   [number, number],
    ctrl: [number, number],
    p2:   [number, number],
    n:    number,
): [number, number][] {
    return Array.from({ length: n }, (_, k) => {
        const t  = k / (n - 1);
        const mt = 1 - t;
        return [
            mt * mt * p0[0] + 2 * mt * t * ctrl[0] + t * t * p2[0],
            mt * mt * p0[1] + 2 * mt * t * ctrl[1] + t * t * p2[1],
        ] as [number, number];
    });
}

// ── Component ──────────────────────────────────────────────────────────────────
export function SphereTransition() {
    // Compute layout at mount time — orbitR matches BrainMap's formula exactly
    // so particles start precisely where the real 2D nodes are positioned.
    const { orbitR, sphereR, childR, cx, cy } = useMemo(() => {
        const w      = window.innerWidth;
        const h      = window.innerHeight;
        const orbitR = Math.min(w * 0.42, h * 0.38);
        return { orbitR, sphereR: orbitR * 0.58, childR: orbitR * 0.38, cx: w / 2, cy: h / 2 };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 2D start positions — mirrors BrainMap orbit layout exactly
    const startPos = useMemo(
        () => ORBIT_ANGLES.map(deg => {
            const r = (deg * Math.PI) / 180;
            return [orbitR * Math.cos(r), orbitR * Math.sin(r)] as [number, number];
        }),
        [orbitR],
    );

    // 3D-projected sphere target positions (scaled to pixels)
    const targetPos = useMemo(
        () => SPHERE_FRACS.map(([fx, fy]) => [fx * sphereR, fy * sphereR] as [number, number]),
        [sphereR],
    );

    // Child node start positions — fan arc just below projects node
    const childStartPos = useMemo(
        () => [0, 1, 2, 3, 4].map(i => {
            const a = ((15 + 37.5 * i) * Math.PI) / 180;
            return [childR * Math.cos(a), childR * Math.sin(a) - orbitR] as [number, number];
        }),
        [childR, orbitR],
    );

    // ── Pre-compute curved arc paths for each orbit node ──────────────────────
    // Each node travels:
    //   Phase 1 (contract): arc from start → center, curving clockwise
    //   Phase 2 (expand):   arc from center → sphere pos, curving clockwise
    // Result: 14 keyframe values per animated property (aligned times array).
    const orbitArcs = useMemo(() => {
        const C1 = orbitR  * 0.54;  // deeper arc during gravitational collapse
        const C2 = sphereR * 0.48;  // wider arc during sphere expansion

        return startPos.map(([sx, sy], i) => {
            const [tx, ty] = targetPos[i];

            // Phase 1 control point — clockwise perp to radial inward direction
            const r1     = Math.sqrt(sx * sx + sy * sy) || 1;
            const ctrl1: [number, number] = [
                sx * 0.5 + (sy  / r1) * C1,
                sy * 0.5 + (-sx / r1) * C1,
            ];

            // Phase 2 control point — clockwise perp to outward expansion direction
            const r2     = Math.sqrt(tx * tx + ty * ty) || 1;
            const ctrl2: [number, number] = [
                tx * 0.5 + (ty  / r2) * C2,
                ty * 0.5 + (-tx / r2) * C2,
            ];

            // 6 Bezier points per phase; share the center point → 11 unique positions
            const phase1 = quadBez([sx, sy], ctrl1, [0, 0], 6);
            const phase2 = quadBez([0, 0],   ctrl2, [tx, ty], 6);
            const combined = [...phase1, ...phase2.slice(1)]; // 11 points

            // Positions: hold at tx,ty for arrival flash + settle, then fade to 0
            const xs: number[] = [...combined.map(p => p[0]), tx, tx, tx];
            const ys: number[] = [...combined.map(p => p[1]), ty, ty, ty];

            // Gravity-biased Phase 1 times: nodes linger near orbit radius, then
            // accelerate into center (ease-in). Power < 1 bunches keyframes toward end.
            const p1Times = Array.from({ length: 6 }, (_, k) =>
                k === 0 ? 0 : Math.pow(k / 5, 0.55) * T_CONTRACT,
            );
            // Ease-out Phase 2 times: fast departure from center, settling at sphere pos.
            const p2Times = Array.from({ length: 5 }, (_, k) =>
                T_CONTRACT + Math.pow((k + 1) / 5, 0.72) * (T_SPHERE - T_CONTRACT),
            );
            const times = [...p1Times, ...p2Times, T_FLASH, T_SETTLE, 1.0];

            // Scale: shrink further toward center (more dramatic collapse), grow back,
            // flash on arrival, then fade
            const scaleP1 = Array.from({ length: 6 }, (_, k) => 1.00 - k * 0.17); // 1.0→0.15
            const scaleP2 = Array.from({ length: 5 }, (_, k) => 0.30 + k * 0.18); // 0.30→1.02
            const scaleKf = [...scaleP1, ...scaleP2, 1.22, 1.00, 0];

            // Opacity: hold strong during contraction, bright at arrival, fade out
            const opP1 = [0.90, 0.88, 0.86, 0.88, 0.92, 0.96];
            const opP2 = [0.96, 0.98, 1.00, 1.00, 1.00];
            const opacityKf = [...opP1, ...opP2, 1.00, 0.80, 0];

            // Verify: all arrays must be length 14
            // times: 6+5+3=14  xs/ys: 11+3=14  scaleKf: 6+5+3=14  opacityKf: same ✓

            return { xs, ys, times, scaleKf, opacityKf, delay: i * 0.055 };
        });
    }, [startPos, targetPos, orbitR, sphereR]);

    // ── Pre-compute curved arc paths for child nodes ───────────────────────────
    // Children only contract — no sphere expansion. 4-point bezier arc.
    const childArcs = useMemo(
        () => childStartPos.map(([sx, sy]) => {
            const r    = Math.sqrt(sx * sx + sy * sy) || 1;
            const C    = orbitR * 0.22;
            const ctrl: [number, number] = [sx * 0.5 + (sy / r) * C, sy * 0.5 + (-sx / r) * C];
            const pts  = quadBez([sx, sy], ctrl, [0, 0], 4);
            return { xs: pts.map(p => p[0]), ys: pts.map(p => p[1]) };
        }),
        [childStartPos, orbitR],
    );

    return (
        <motion.div
            className="fixed inset-0 z-[115] overflow-hidden"
            style={{ background: '#0B1220', pointerEvents: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
        >
            {/* ── Sphere wireframe ────────────────────────────────────────────── */}
            {([
                { w: sphereR * 1.90, h: sphereR * 1.90, rot: 0,  delay: 0.00 },
                { w: sphereR * 1.90, h: sphereR * 0.70, rot: 0,  delay: 0.08 },
                { w: sphereR * 0.70, h: sphereR * 1.90, rot: 18, delay: 0.16 },
            ] as const).map((e, i) => (
                <motion.div
                    key={`wire-${i}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        width:  e.w, height: e.h,
                        left:   cx - e.w / 2,
                        top:    cy - e.h / 2,
                        border: '1px solid rgba(61,227,255,0.18)',
                        rotate: e.rot,
                    }}
                    animate={{
                        // Inflate from a tight cluster as nodes converge (T_CONTRACT),
                        // reach full radius as nodes settle at sphere positions (T_SPHERE),
                        // then softly fade as BrainSphere takes over.
                        opacity: [0, 0, 0,    0.55, 0.72, 0.38, 0],
                        scale:   [0, 0, 0.08, 0.42, 1.00, 1.04, 0.96],
                    }}
                    transition={{
                        duration: DUR,
                        times:    [0, T_CONTRACT * 0.7, T_CONTRACT, T_CONTRACT + 0.12, T_SPHERE, T_SETTLE, 1.0],
                        ease:     EASE,
                        delay:    e.delay,
                    }}
                />
            ))}

            {/* ── Center singularity — concentrates as nodes arrive, then releases ── */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(61,227,255,0.70) 0%, rgba(61,227,255,0.18) 35%, rgba(61,227,255,0.04) 65%, transparent 100%)',
                }}
                animate={{
                    width:   [0, 0, sphereR * 0.5, sphereR * 0.9, sphereR * 2.6, sphereR * 1.2, 0],
                    height:  [0, 0, sphereR * 0.5, sphereR * 0.9, sphereR * 2.6, sphereR * 1.2, 0],
                    left:    [cx, cx, cx - sphereR * 0.25, cx - sphereR * 0.45, cx - sphereR * 1.30, cx - sphereR * 0.60, cx],
                    top:     [cy, cy, cy - sphereR * 0.25, cy - sphereR * 0.45, cy - sphereR * 1.30, cy - sphereR * 0.60, cy],
                    opacity: [0,  0,  0.50,                0.85,                0.32,                0.14,                0],
                }}
                transition={{
                    duration: DUR,
                    times:    [0, T_CONTRACT * 0.6, T_CONTRACT * 0.88, T_CONTRACT, 0.54, 0.74, 1.0],
                    ease:     EASE,
                }}
            />

            {/* ── Stabilization pulse rings — fire when sphere forms ──────────── */}
            {[
                { delay: 0,    opacity1: 0.38, opacity2: 0.22 },
                { delay: 0.10, opacity1: 0.22, opacity2: 0.10 },
            ].map((cfg, i) => (
                <motion.div
                    key={`pulse-ring-${i}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        left:   cx - sphereR,
                        top:    cy - sphereR,
                        width:  sphereR * 2,
                        height: sphereR * 2,
                        border: `1px solid rgba(61,227,255,${cfg.opacity1})`,
                    }}
                    animate={{
                        scale:   [0, 0, 0,       0.45, 0.88, 1.40, 1.65],
                        opacity: [0, 0, 0,       cfg.opacity2, 0.25, 0.10, 0],
                    }}
                    transition={{
                        duration: DUR,
                        times:    [0, T_SPHERE - 0.06, T_SPHERE, T_FLASH, T_SETTLE, T_PULSE_END, 1.0],
                        ease:     EASE,
                        delay:    cfg.delay,
                    }}
                />
            ))}

            {/* ── SVG: tether lines + spoke lines ─────────────────────────────── */}
            <svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height="100%"
                style={{ overflow: 'visible' }}
            >
                {/* Gravitational tethers — orbit start positions fade as nodes collapse */}
                {startPos.map(([sx, sy], i) => (
                    <motion.line
                        key={`tether-${i}`}
                        x1={cx} y1={cy}
                        x2={cx + sx} y2={cy + sy}
                        stroke="#3DE3FF"
                        strokeLinecap="round"
                        animate={{
                            opacity:     [0, 0.32, 0.22, 0.10, 0],
                            strokeWidth: [0.8, 0.8, 0.50, 0.20, 0],
                        }}
                        transition={{
                            duration: DUR * T_CONTRACT * 1.1,
                            times:    [0, 0.06, 0.45, 0.78, 1.0],
                            ease:     'easeIn',
                            delay:    i * 0.05,
                        }}
                    />
                ))}

                {/* Spoke lines — appear as nodes settle at sphere positions */}
                {targetPos.map(([tx, ty], i) => (
                    <motion.line
                        key={`spoke-${i}`}
                        x1={cx} y1={cy}
                        x2={cx + tx} y2={cy + ty}
                        stroke="#3DE3FF"
                        strokeWidth="0.6"
                        animate={{ opacity: [0, 0, 0, 0.24, 0.12, 0] }}
                        transition={{
                            duration: DUR,
                            times:    [0, 0.32, 0.52, 0.66, 0.82, 1.0],
                            ease:     EASE,
                            delay:    i * 0.035,
                        }}
                    />
                ))}
            </svg>

            {/* ── Orbit node particles — curved bezier arcs ───────────────────── */}
            {orbitArcs.map(({ xs, ys, times, scaleKf, opacityKf, delay }, i) => (
                <motion.div
                    key={`orbit-${i}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        left: cx, top: cy,
                        width: 10, height: 10,
                        marginLeft: -5, marginTop: -5,
                        background: '#3DE3FF',
                        boxShadow:  '0 0 8px rgba(61,227,255,0.70)',
                    }}
                    animate={{
                        x:       xs,
                        y:       ys,
                        scale:   scaleKf,
                        opacity: opacityKf,
                    }}
                    transition={{
                        // 'linear' between our pre-computed bezier points preserves arc shape;
                        // the bezier geometry itself supplies all the curvature.
                        duration: DUR,
                        times,
                        ease:     'linear',
                        delay,
                    }}
                />
            ))}

            {/* ── Child node particles — curved contraction ───────────────────── */}
            {childArcs.map(({ xs, ys }, i) => (
                <motion.div
                    key={`child-${i}`}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                        left: cx, top: cy,
                        width: 6, height: 6,
                        marginLeft: -3, marginTop: -3,
                        background: 'rgba(154,176,204,0.65)',
                        boxShadow:  '0 0 4px rgba(154,176,204,0.35)',
                    }}
                    animate={{
                        x:       xs,
                        y:       ys,
                        scale:   [0.8, 0.5, 0.15, 0],
                        opacity: [0.7, 0.5, 0.28, 0],
                    }}
                    transition={{
                        duration: DUR * 0.50,
                        times:    [0, 0.28, 0.65, 1.0],
                        ease:     'linear',
                        delay:    0.04 + i * 0.03,
                    }}
                />
            ))}

            {/* ── Center (Marc Smith) node — pulses then expands to nothingness ── */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    left: cx, top: cy,
                    width: 18, height: 18,
                    marginLeft: -9, marginTop: -9,
                    background: 'radial-gradient(circle, rgba(61,227,255,0.90) 0%, rgba(61,227,255,0.20) 60%, transparent 100%)',
                    boxShadow:  '0 0 14px rgba(61,227,255,0.65)',
                }}
                animate={{
                    scale:   [1, 2.2, 4.4, 2.6, 0],
                    opacity: [1, 0.9, 0.5, 0.2, 0],
                }}
                transition={{
                    duration: DUR,
                    times:    [0, 0.28, 0.50, 0.70, 1.0],
                    ease:     EASE,
                }}
            />

            {/* ── Status label ─────────────────────────────────────────────────── */}
            <motion.p
                className="absolute font-mono text-[9px] tracking-widest uppercase pointer-events-none"
                style={{
                    left:      '50%',
                    bottom:    '9%',
                    transform: 'translateX(-50%)',
                    color:     'rgba(61,227,255,0.30)',
                    whiteSpace: 'nowrap',
                }}
                animate={{ opacity: [0, 0, 0.55, 0.55, 0] }}
                transition={{ duration: DUR, times: [0, 0.36, 0.48, 0.80, 1.0], ease: EASE }}
            >
                Dimensionalizing knowledge graph…
            </motion.p>
        </motion.div>
    );
}
