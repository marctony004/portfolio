import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { orbitNodes } from '../../data/brainData';
import type { ChildNodeData } from '../../data/brainData';
import type { CamState } from './SphereScene';
import { ACCENT, MUTED, TEXT } from '../../theme';

const PREFERS_REDUCED =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Playback timing ────────────────────────────────────────────────────────────
const STAGE_MS      = 1050; // each pipeline stage is highlighted for this long
const HOLD_LAST_MS  = 1400; // extra hold on the final stage before auto-reset
const PULSE_TRAVEL  = 0.62; // seconds for the pulse sphere to travel one edge

// ── Layout constants ───────────────────────────────────────────────────────────
// Camera sits at theta=0, phi=1.22 → world position ≈ (7.0, 2.6, 0), looking at origin.
// Camera "right" direction in world space = (0, 0, -1).
//   Screen-LEFT  = +Z   Screen-RIGHT = -Z   Screen-UP = +Y   Screen-BOTTOM = -Y
//
// Three spatial zones:
//   Pipeline  → upper-LEFT  (+Z, +Y)   directional chain
//   Tech      → RIGHT side  (−Z, ~Y=0) circular cluster
//   Arch      → BELOW       (−Y)       shallow arc

const PIPE_Z_FAR  = 3.1;
const PIPE_Z_NEAR = 0.7;
const PIPE_Y_TOP  = 0.9;
const PIPE_Y_BOT  = -0.65;

const TECH_CZ    = -2.6;
const TECH_MIN_R = 1.1;

const ARCH_Y     = -2.2;
const ARCH_MIN_R = 1.9;

// ── Visual constants ───────────────────────────────────────────────────────────
const LAYER_COLOR: Record<string, string> = {
    pipeline: '#3DE3FF',
    tech:     '#9AB0CC',
    arch:     '#5BBFD6',
};

const LAYER_NODE_R: Record<string, number> = {
    pipeline: 0.092,
    tech:     0.058,
    arch:     0.072,
};

// ── Types ──────────────────────────────────────────────────────────────────────
type Layer = 'pipeline' | 'tech' | 'arch';

interface FocusSubnode {
    id:        string;
    label:     string;
    detail:    string;
    tools:     string[];
    layer:     Layer;
    position:  [number, number, number];
    seqIndex?: number;
}

interface EdgeDef {
    from:  [number, number, number];
    to:    [number, number, number];
    type:  'flow' | 'spoke';
    layer: Layer;
}

// ── Layout helpers ─────────────────────────────────────────────────────────────
function pipelineChain(count: number): [number, number, number][] {
    if (count === 0) return [];
    return Array.from({ length: count }, (_, i) => {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const z = PIPE_Z_FAR - t * (PIPE_Z_FAR - PIPE_Z_NEAR);
        const y = PIPE_Y_TOP + t * (PIPE_Y_BOT - PIPE_Y_TOP);
        const x = Math.sin(t * Math.PI) * 0.25;
        return [x, y, z] as [number, number, number];
    });
}

function techCluster(count: number): [number, number, number][] {
    if (count === 0) return [];
    const R = TECH_MIN_R + count * 0.085;
    return Array.from({ length: count }, (_, i) => {
        const a = (2 * Math.PI * i) / count - Math.PI / 2;
        return [
            Math.sin(a) * R * 0.70,
            Math.cos(a) * R * 0.62,
            TECH_CZ + Math.sin(a + Math.PI / 3) * R * 0.28,
        ] as [number, number, number];
    });
}

function archArc(count: number): [number, number, number][] {
    if (count === 0) return [];
    const xR = ARCH_MIN_R + count * 0.18;
    return Array.from({ length: count }, (_, i) => {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const a = Math.PI * (-0.65 + t * 1.3);
        return [
            Math.sin(a) * xR,
            ARCH_Y,
            Math.cos(a) * 0.35 - 0.3,
        ] as [number, number, number];
    });
}

// ── Scene builder ──────────────────────────────────────────────────────────────
function buildScene(project: ChildNodeData): { subnodes: FocusSubnode[]; edges: EdgeDef[] } {
    const pSteps = project.pipeline ?? [];
    const tItems = project.tech     ?? [];
    const aItems = (project.bullets ?? []).slice(0, 3);

    const pPos = pipelineChain(pSteps.length);
    const tPos = techCluster(tItems.length);
    const aPos = archArc(aItems.length);

    const subnodes: FocusSubnode[] = [
        ...pSteps.map((s, i) => ({
            id:       `pipeline-${i}`,
            label:    s.label,
            detail:   s.detail,
            tools:    s.tools ?? [],
            layer:    'pipeline' as Layer,
            position: pPos[i],
            seqIndex: i,
        })),
        ...tItems.map((t, i) => ({
            id:     `tech-${i}`,
            label:   t,
            detail:  '',
            tools:   [],
            layer:   'tech' as Layer,
            position: tPos[i],
        })),
        ...aItems.map((b, i) => ({
            id:      `arch-${i}`,
            label:   b.length > 44 ? b.slice(0, 41) + '…' : b,
            detail:  b,
            tools:   [],
            layer:   'arch' as Layer,
            position: aPos[i],
        })),
    ];

    const edges: EdgeDef[] = [];
    for (let i = 0; i < pSteps.length - 1; i++) {
        edges.push({ from: pPos[i], to: pPos[i + 1], type: 'flow', layer: 'pipeline' });
    }
    if (pPos.length > 0) {
        edges.push({ from: pPos[pPos.length - 1], to: [0, 0, 0], type: 'spoke', layer: 'pipeline' });
    }
    tPos.forEach(p => edges.push({ from: [0, 0, 0], to: p, type: 'spoke', layer: 'tech' }));
    aPos.forEach(p => edges.push({ from: [0, 0, 0], to: p, type: 'spoke', layer: 'arch' }));

    return { subnodes, edges };
}

// ── PipelinePulse (R3F) — traveling data-flow orb ─────────────────────────────
// Mounted with a new key each time the active stage changes so progressRef resets.
function PipelinePulse({ from, to }: { from: [number,number,number]; to: [number,number,number] }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef  = useRef<THREE.MeshBasicMaterial>(null);
    const prog    = useRef(0);

    useFrame((_, delta) => {
        if (!meshRef.current || !matRef.current) return;
        prog.current = Math.min(1, prog.current + delta / PULSE_TRAVEL);
        const t    = prog.current;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        meshRef.current.position.set(
            from[0] + (to[0] - from[0]) * ease,
            from[1] + (to[1] - from[1]) * ease,
            from[2] + (to[2] - from[2]) * ease,
        );
        // Fade in, hold, fade out along the journey
        matRef.current.opacity = Math.sin(t * Math.PI) * 0.62;
    });

    return (
        <mesh ref={meshRef} position={from}>
            <sphereGeometry args={[0.052, 8, 8]} />
            <meshBasicMaterial ref={matRef} color="#3DE3FF" transparent opacity={0} />
        </mesh>
    );
}

// ── FocusNode (R3F) ────────────────────────────────────────────────────────────
interface FocusNodeProps {
    id:               string;
    label:            string;
    layer:            Layer | 'center';
    position:         [number, number, number];
    isCenter?:        boolean;
    isSelected:       boolean;
    isVisible:        boolean;
    isPlaybackActive: boolean; // this stage is currently lit up during playback
    delay:            number;
    labelOnHover?:    boolean;
    onSelect:         (id: string) => void;
    hasDraggedRef:    React.MutableRefObject<boolean>;
}

function FocusNode({
    id, label, layer, position, isCenter, isSelected, isVisible,
    isPlaybackActive, delay, labelOnHover, onSelect, hasDraggedRef,
}: FocusNodeProps) {
    const coreMatRef = useRef<THREE.MeshStandardMaterial>(null);
    const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const [hovered, setHovered] = useState(false);

    const timeRef   = useRef(0);
    const appearRef = useRef(PREFERS_REDUCED ? 1 : 0);
    const stateRef  = useRef({ isSelected, hovered, isVisible, isPlaybackActive });
    useEffect(() => {
        stateRef.current = { isSelected, hovered, isVisible, isPlaybackActive };
    });

    useFrame((_, delta) => {
        const core = coreMatRef.current;
        const glow = glowMatRef.current;
        if (!core || !glow) return;

        if (!PREFERS_REDUCED) {
            timeRef.current += delta;
            if (timeRef.current > delay) {
                appearRef.current = Math.min(1, appearRef.current + delta / 0.65);
            }
        }

        const { isSelected, hovered, isVisible, isPlaybackActive } = stateRef.current;
        const af  = isVisible ? appearRef.current : 0;
        const act = isSelected || hovered;

        const idleEmissive = isCenter          ? 0.60
                           : layer === 'tech'  ? 0.12
                           : layer === 'arch'  ? 0.22
                           : /* pipeline */      0.32;

        core.opacity = af;
        core.emissiveIntensity =
            (isSelected      ? 1.30
           : hovered          ? 0.80
           : isPlaybackActive ? 0.72   // calm playback highlight
           : idleEmissive) * af;

        glow.opacity =
            (act              ? (isSelected ? 0.15 : 0.08)
           : isPlaybackActive ? 0.07
           : layer === 'tech' ? 0.008
           : 0.022) * af;
    });

    const r     = isCenter ? 0.21 : (LAYER_NODE_R[layer as string] ?? 0.07);
    const color = isCenter ? '#3DE3FF' : (LAYER_COLOR[layer as string] ?? '#3DE3FF');
    const scale = isSelected ? 1.5 : hovered ? 1.2 : isPlaybackActive ? 1.25 : 1;

    const showLabel = !labelOnHover || hovered || isSelected || isPlaybackActive;

    return (
        <group position={position}>
            {/* Glow halo */}
            <mesh scale={scale * 2.5} renderOrder={0}>
                <sphereGeometry args={[r, 10, 10]} />
                <meshBasicMaterial
                    ref={glowMatRef}
                    color={color}
                    transparent
                    opacity={0.022}
                    depthWrite={false}
                />
            </mesh>

            {/* Core sphere */}
            <mesh
                scale={scale}
                onClick={e => { e.stopPropagation(); if (!hasDraggedRef.current) onSelect(id); }}
                onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
            >
                <sphereGeometry args={[r, 18, 18]} />
                <meshStandardMaterial
                    ref={coreMatRef}
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.32}
                    transparent
                    opacity={0}
                    roughness={0.22}
                    metalness={0.38}
                />
            </mesh>

            {/* Selection ring on center node */}
            {isCenter && isSelected && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[r * 2.8, r * 0.14, 8, 48]} />
                    <meshBasicMaterial color={color} transparent opacity={0.4} />
                </mesh>
            )}

            {/* Playback ring — shown on active pipeline stage */}
            {isPlaybackActive && !isCenter && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[r * 2.2, r * 0.10, 8, 48]} />
                    <meshBasicMaterial color="#3DE3FF" transparent opacity={0.35} />
                </mesh>
            )}

            {/* Label */}
            {showLabel && (
                <Html
                    position={[0, r * (isCenter ? 2.4 : 2.0), 0]}
                    center
                    distanceFactor={
                        isCenter           ? 6.5
                        : layer === 'pipeline' ? 9.0
                        : layer === 'arch'     ? 10.5
                        : 9.5
                    }
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    <div style={{
                        fontFamily:    'monospace',
                        fontSize:      isCenter ? 14 : layer === 'pipeline' ? 10 : 9,
                        fontWeight:    isCenter ? 700 : layer === 'pipeline' ? 500 : 400,
                        color: isSelected || isPlaybackActive ? '#3DE3FF'
                             : hovered    ? '#E6EEF9'
                             : layer === 'tech' ? '#9AB0CC'
                             : layer === 'arch' ? '#8AC8D8'
                             :                   '#C8E8F2',
                        background:   'rgba(11,18,32,0.88)',
                        border:       `1px solid rgba(61,227,255,${
                            isSelected || isPlaybackActive || hovered ? 0.30
                            : layer === 'pipeline' ? 0.12
                            : 0.07
                        })`,
                        borderRadius:  4,
                        padding:       isCenter ? '3px 10px' : '2px 6px',
                        whiteSpace:    'nowrap',
                        letterSpacing: '0.04em',
                        maxWidth:      layer === 'arch' ? 160 : undefined,
                        overflow:      'hidden',
                        textOverflow:  'ellipsis',
                    }}>
                        {label}
                    </div>
                </Html>
            )}
        </group>
    );
}

// ── FocusScene (R3F) ───────────────────────────────────────────────────────────
interface FocusSceneProps {
    subnodes:          FocusSubnode[];
    edges:             EdgeDef[];
    activeLayers:      Set<Layer>;
    selectedSubnodeId: string | null;
    playbackActiveIdx: number;         // -1 = idle; index into pipelinePositions
    pipelinePositions: [number,number,number][];
    onSelectSubnode:   (id: string) => void;
    camRef:            React.MutableRefObject<CamState>;
    hasDraggedRef:     React.MutableRefObject<boolean>;
    projectLabel:      string;
}

function FocusScene({
    subnodes, edges, activeLayers, selectedSubnodeId,
    playbackActiveIdx, pipelinePositions,
    onSelectSubnode, camRef, hasDraggedRef, projectLabel,
}: FocusSceneProps) {
    useFrame(({ camera }) => {
        const s = camRef.current;
        const L = 0.065;
        s.theta    += (s.targetTheta    - s.theta)    * L;
        s.phi      += (s.targetPhi      - s.phi)      * L;
        s.distance += (s.targetDistance - s.distance) * L;
        const sp = Math.sin(s.phi), cp = Math.cos(s.phi);
        const st = Math.sin(s.theta), ct = Math.cos(s.theta);
        camera.position.set(s.distance * sp * ct, s.distance * cp, s.distance * sp * st);
        camera.lookAt(0, 0, 0);
    });

    const pipeCount = useMemo(
        () => subnodes.filter(n => n.layer === 'pipeline').length,
        [subnodes],
    );
    const techCount = useMemo(
        () => subnodes.filter(n => n.layer === 'tech').length,
        [subnodes],
    );
    const layerIndexOf = useMemo(() => {
        const counters: Record<Layer, number> = { pipeline: 0, tech: 0, arch: 0 };
        const map = new Map<string, number>();
        subnodes.forEach(n => { map.set(n.id, counters[n.layer]++); });
        return map;
    }, [subnodes]);

    // Flow edges sorted by pipeline order — used to find pulse targets
    const flowEdges = useMemo(
        () => edges.filter(e => e.type === 'flow' && e.layer === 'pipeline'),
        [edges],
    );

    return (
        <>
            <ambientLight intensity={0.18} color="#9AB0CC" />
            <pointLight position={[0, 0, 0]}   intensity={0.85} color="#3DE3FF" distance={9}  decay={2} />
            <pointLight position={[4, 3, -2]}  intensity={0.26} color="#E6EEF9" distance={20} decay={2} />
            <pointLight position={[-2, -2, 2]} intensity={0.10} color="#3DE3FF" distance={14} decay={2} />

            {/* ── Static edges ───────────────────────────────────────────── */}
            {edges
                .filter(e => activeLayers.has(e.layer))
                .map((e, i) => {
                    const isFlow      = e.type === 'flow';
                    const isPipeSpoke = e.type === 'spoke' && e.layer === 'pipeline';
                    // Brighten the active flow edge during playback
                    const isActiveEdge =
                        isFlow && playbackActiveIdx >= 0 &&
                        flowEdges[playbackActiveIdx] === e;
                    return (
                        <Line
                            key={i}
                            points={[e.from, e.to]}
                            color={LAYER_COLOR[e.layer] ?? '#3DE3FF'}
                            lineWidth={isFlow ? (isActiveEdge ? 0.95 : 0.80) : isPipeSpoke ? 0.28 : 0.18}
                            opacity={isFlow   ? (isActiveEdge ? 0.50 : 0.38) : isPipeSpoke ? 0.14 : 0.06}
                            transparent
                        />
                    );
                })}

            {/* ── Traveling pulse orb ────────────────────────────────────── */}
            {!PREFERS_REDUCED &&
             playbackActiveIdx >= 0 &&
             playbackActiveIdx < pipelinePositions.length - 1 && (
                <PipelinePulse
                    key={`pulse-${playbackActiveIdx}`}
                    from={pipelinePositions[playbackActiveIdx]}
                    to={pipelinePositions[playbackActiveIdx + 1]}
                />
            )}

            {/* ── Center anchor ──────────────────────────────────────────── */}
            <FocusNode
                id="center"
                label={projectLabel}
                layer="center"
                position={[0, 0, 0]}
                isCenter
                isSelected={false}
                isVisible
                isPlaybackActive={false}
                delay={0}
                onSelect={() => {}}
                hasDraggedRef={hasDraggedRef}
            />

            {/* ── Subnodes ───────────────────────────────────────────────── */}
            {subnodes
                .filter(n => activeLayers.has(n.layer))
                .map(n => {
                    const li = layerIndexOf.get(n.id) ?? 0;
                    const delay =
                        n.layer === 'pipeline'
                            ? 0.30 + (n.seqIndex ?? li) * 0.15
                            : n.layer === 'tech'
                            ? 0.30 + pipeCount * 0.15 + 0.45 + li * 0.08
                            : 0.30 + pipeCount * 0.15 + 0.45 + techCount * 0.08 + 0.30 + li * 0.10;

                    const isPlaybackActive =
                        n.layer === 'pipeline' && (n.seqIndex ?? -1) === playbackActiveIdx;

                    return (
                        <FocusNode
                            key={n.id}
                            id={n.id}
                            label={n.label}
                            layer={n.layer}
                            position={n.position}
                            isSelected={selectedSubnodeId === n.id}
                            isVisible={activeLayers.has(n.layer)}
                            isPlaybackActive={isPlaybackActive}
                            delay={delay}
                            labelOnHover={n.layer === 'tech'}
                            onSelect={onSelectSubnode}
                            hasDraggedRef={hasDraggedRef}
                        />
                    );
                })}
        </>
    );
}

// ── StageCard — per-stage info overlay during playback ────────────────────────
function StageCard({ label, detail, stageNum, total }: {
    label:    string;
    detail:   string;
    stageNum: number;
    total:    number;
}) {
    return (
        <motion.div
            className="absolute top-4 left-1/2 z-20 pointer-events-none"
            style={{
                transform:            'translateX(-50%)',
                background:           'rgba(11,18,32,0.92)',
                border:               '1px solid rgba(61,227,255,0.18)',
                borderRadius:         8,
                backdropFilter:       'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                maxWidth:             380,
                width:                'calc(100vw - 3rem)',
                boxShadow:            '0 4px 24px rgba(0,0,0,0.45)',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(61,227,255,0.28), transparent)' }} />
            <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-[8px] uppercase tracking-widest"
                        style={{ color: 'rgba(61,227,255,0.5)' }}>
                        Pipeline · Stage {stageNum} of {total}
                    </p>
                </div>
                <p className="font-sans font-semibold text-sm leading-snug mb-1" style={{ color: TEXT }}>
                    {label}
                </p>
                {detail && (
                    <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{detail}</p>
                )}
            </div>
        </motion.div>
    );
}

// ── Detail card (HTML overlay) ─────────────────────────────────────────────────
interface DetailInfo {
    label:  string;
    detail: string;
    tools:  string[];
    layer:  Layer;
}

function FocusDetailCard({ label, detail, tools, layer, onClose }: DetailInfo & { onClose: () => void }) {
    return (
        <motion.div
            className="absolute bottom-4 left-1/2 z-20"
            style={{
                transform:            'translateX(-50%)',
                background:           'rgba(13,20,38,0.96)',
                border:               '1px solid rgba(61,227,255,0.14)',
                borderRadius:         10,
                backdropFilter:       'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maxWidth:             440,
                width:                'calc(100vw - 2rem)',
                boxShadow:            '0 8px 32px rgba(0,0,0,0.5)',
            }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            <div className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(61,227,255,0.18), transparent)' }} />
            <div className="px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest mb-0.5"
                            style={{ color: `${LAYER_COLOR[layer] ?? ACCENT}99` }}>
                            {layer}
                        </p>
                        <h3 className="font-sans font-semibold text-sm leading-snug" style={{ color: TEXT }}>
                            {label}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-3 mt-0.5 p-1.5 rounded shrink-0"
                        style={{ color: 'rgba(154,176,204,0.4)', background: 'rgba(154,176,204,0.06)' }}
                    >
                        ✕
                    </button>
                </div>
                {detail && (
                    <p className="text-xs leading-relaxed mb-3" style={{ color: MUTED }}>{detail}</p>
                )}
                {tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {tools.map(t => (
                            <span key={t} className="font-mono text-[9px] px-2 py-0.5 rounded"
                                style={{
                                    background: 'rgba(61,227,255,0.06)',
                                    border:     '1px solid rgba(61,227,255,0.15)',
                                    color:      'rgba(61,227,255,0.7)',
                                }}>
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ── FocusMode (main export) ────────────────────────────────────────────────────
interface FocusModeProps {
    projectId: string;
    onExit:    () => void;
    camRef:    React.MutableRefObject<CamState>;  // lifted to parent so gesture layer can control it
}


const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const LAYER_LABELS: Record<Layer, string> = {
    pipeline: 'Pipeline',
    tech:     'Tech Stack',
    arch:     'Architecture',
};

export function FocusMode({ projectId, onExit, camRef }: FocusModeProps) {
    const project = useMemo(() => {
        const projectsOrbit = orbitNodes.find(n => n.id === 'projects');
        return projectsOrbit?.children?.find(c => c.id === projectId) ?? null;
    }, [projectId]);

    const { subnodes, edges } = useMemo(
        () => (project ? buildScene(project) : { subnodes: [], edges: [] }),
        [project],
    );

    // Sorted pipeline nodes — used for playback sequencing
    const pipelineNodes = useMemo(
        () => subnodes
            .filter(n => n.layer === 'pipeline')
            .sort((a, b) => (a.seqIndex ?? 0) - (b.seqIndex ?? 0)),
        [subnodes],
    );
    const pipelinePositions = useMemo(
        () => pipelineNodes.map(n => n.position),
        [pipelineNodes],
    );

    const [activeLayers,      setActiveLayers]      = useState<Set<Layer>>(new Set<Layer>(['pipeline', 'tech']));
    const [selectedSubnodeId, setSelectedSubnodeId] = useState<string | null>(null);
    const [detailCard,        setDetailCard]         = useState<DetailInfo | null>(null);

    // ── Playback state ────────────────────────────────────────────────────────
    type PlaybackStatus = 'idle' | 'playing';
    const [playbackStatus,  setPlaybackStatus]  = useState<PlaybackStatus>('idle');
    const [activeStageIdx,  setActiveStageIdx]  = useState(-1);
    const [stageCard,       setStageCard]       = useState<{ label: string; detail: string; idx: number } | null>(null);

    const playbackTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const playbackStatusRef = useRef<PlaybackStatus>('idle');
    // scheduleStageRef is re-assigned each render so callbacks always see fresh pipelineNodes
    const scheduleStageRef  = useRef<((idx: number) => void) | null>(null);

    scheduleStageRef.current = (idx: number) => {
        if (playbackStatusRef.current !== 'playing') return;

        if (idx >= pipelineNodes.length) {
            // All stages done — hold briefly then reset
            playbackTimerRef.current = setTimeout(() => {
                setPlaybackStatus('idle');
                setActiveStageIdx(-1);
                setStageCard(null);
                playbackStatusRef.current = 'idle';
            }, HOLD_LAST_MS);
            return;
        }

        setActiveStageIdx(idx);
        const node = pipelineNodes[idx];
        setStageCard(node ? { label: node.label, detail: node.detail, idx } : null);

        playbackTimerRef.current = setTimeout(() => {
            scheduleStageRef.current?.(idx + 1);
        }, STAGE_MS);
    };

    const stopPlayback = useCallback(() => {
        if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
        playbackStatusRef.current = 'idle';
        setPlaybackStatus('idle');
        setActiveStageIdx(-1);
        setStageCard(null);
    }, []);

    const startPlayback = useCallback(() => {
        if (pipelineNodes.length === 0) return;
        if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
        playbackStatusRef.current = 'playing';
        setPlaybackStatus('playing');
        setActiveStageIdx(-1);
        setStageCard(null);
        // Small delay so React can flush the 'playing' state before first stage
        playbackTimerRef.current = setTimeout(() => {
            scheduleStageRef.current?.(0);
        }, 180);
    }, [pipelineNodes.length]);

    // Clean up timer on unmount or project change
    useEffect(() => {
        return () => {
            if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
        };
    }, [projectId]);

    // ── Node interaction ──────────────────────────────────────────────────────
    const handleSelectSubnode = useCallback((id: string) => {
        // Interrupt playback if running
        if (playbackStatusRef.current === 'playing') stopPlayback();

        if (selectedSubnodeId === id) {
            setSelectedSubnodeId(null);
            setDetailCard(null);
            return;
        }
        const node = subnodes.find(n => n.id === id);
        if (!node) return;
        setSelectedSubnodeId(id);
        setDetailCard({ label: node.label.replace(/…$/, ''), detail: node.detail, tools: node.tools, layer: node.layer });
    }, [subnodes, selectedSubnodeId, stopPlayback]);

    const closeDetail = useCallback(() => {
        setSelectedSubnodeId(null);
        setDetailCard(null);
    }, []);

    const toggleLayer = useCallback((layer: Layer) => {
        setActiveLayers(prev => {
            const next = new Set(prev);
            if (next.has(layer)) {
                if (next.size > 1) next.delete(layer);
            } else {
                next.add(layer);
            }
            return next;
        });
    }, []);

    // ── Pointer controls ───────────────────────────────────────────────────────
    const hasDraggedRef = useRef(false);
    const isDraggingRef = useRef(false);
    const lastPtrRef    = useRef({ x: 0, y: 0 });

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        lastPtrRef.current    = { x: e.clientX, y: e.clientY };
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - lastPtrRef.current.x;
        const dy = e.clientY - lastPtrRef.current.y;
        lastPtrRef.current = { x: e.clientX, y: e.clientY };
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            hasDraggedRef.current = true;
            const el = e.currentTarget as HTMLElement;
            if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
        }
        const c = camRef.current;
        c.targetTheta -= dx * 0.005;
        c.targetPhi    = clamp(c.targetPhi - dy * 0.005, 0.15, Math.PI - 0.15);
    }, []);

    const onPointerUp = useCallback(() => { isDraggingRef.current = false; }, []);

    const onWheel = useCallback((e: React.WheelEvent) => {
        camRef.current.targetDistance = clamp(camRef.current.targetDistance + e.deltaY * 0.006, 3.5, 10);
    }, []);

    // ── Keyboard ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (playbackStatus === 'playing') { stopPlayback(); return; }
            if (selectedSubnodeId) closeDetail();
            else onExit();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [playbackStatus, selectedSubnodeId, stopPlayback, closeDetail, onExit]);

    if (!project) return null;

    const isPlaying = playbackStatus === 'playing';

    return (
        <motion.div
            className="fixed inset-0 z-[120] flex flex-col"
            style={{ background: '#0B1220' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
                style={{
                    background:     'rgba(11,18,32,0.88)',
                    borderBottom:   '1px solid rgba(61,227,255,0.1)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                {/* Left: back button + title + play control */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onExit}
                        className="font-mono text-[10px] px-3 py-1.5 rounded-full transition-colors"
                        style={{ border: '1px solid rgba(61,227,255,0.18)', color: MUTED, background: 'rgba(61,227,255,0.04)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                        onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
                    >
                        ← Return to Brain Sphere
                    </button>

                    <div>
                        <p className="font-mono text-[9px] uppercase tracking-widest"
                            style={{ color: 'rgba(61,227,255,0.45)' }}>
                            Project Focus Mode
                        </p>
                        <p className="font-sans font-semibold text-sm" style={{ color: TEXT }}>
                            {project.label}
                        </p>
                    </div>

                    {/* ── Play Flow control ────────────────────────────────── */}
                    {pipelineNodes.length > 0 && (
                        <button
                            onClick={isPlaying ? stopPlayback : startPlayback}
                            className="font-mono text-[9px] px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all"
                            style={{
                                background:  isPlaying ? 'rgba(61,227,255,0.12)' : 'rgba(61,227,255,0.04)',
                                border:      `1px solid ${isPlaying ? 'rgba(61,227,255,0.38)' : 'rgba(61,227,255,0.18)'}`,
                                color:       isPlaying ? ACCENT : MUTED,
                                boxShadow:   isPlaying ? '0 0 12px rgba(61,227,255,0.12)' : 'none',
                            }}
                            onMouseEnter={e => { if (!isPlaying) e.currentTarget.style.color = ACCENT; }}
                            onMouseLeave={e => { if (!isPlaying) e.currentTarget.style.color = MUTED; }}
                            title={isPlaying ? 'Stop playback (Esc)' : 'Simulate data flow through the pipeline'}
                        >
                            {isPlaying ? '■ Stop' : '▶ Play Flow'}
                        </button>
                    )}
                </div>

                {/* Right: layer filter chips */}
                <div className="flex items-center gap-2">
                    {(['pipeline', 'tech', 'arch'] as Layer[]).map(layer => (
                        <button
                            key={layer}
                            onClick={() => toggleLayer(layer)}
                            className="font-mono text-[9px] px-3 py-1.5 rounded-full transition-all"
                            style={{
                                background: activeLayers.has(layer) ? 'rgba(61,227,255,0.10)' : 'rgba(61,227,255,0.03)',
                                border:     `1px solid ${activeLayers.has(layer) ? 'rgba(61,227,255,0.28)' : 'rgba(61,227,255,0.10)'}`,
                                color:      activeLayers.has(layer) ? '#3DE3FF' : 'rgba(154,176,204,0.4)',
                            }}
                        >
                            {LAYER_LABELS[layer]}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 3D canvas ────────────────────────────────────────────────── */}
            <div
                className="flex-1 relative overflow-hidden"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onWheel={onWheel}
                style={{ cursor: 'grab', background: '#0B1220' }}
            >
                <Canvas
                    camera={{ fov: 55, near: 0.1, far: 100, position: [7.0, 2.6, 0] }}
                    gl={{ antialias: true, alpha: true }}
                    style={{ position: 'absolute', inset: 0, background: 'transparent' }}
                    onPointerMissed={() => {
                        if (!hasDraggedRef.current) closeDetail();
                    }}
                >
                    <FocusScene
                        subnodes={subnodes}
                        edges={edges}
                        activeLayers={activeLayers}
                        selectedSubnodeId={selectedSubnodeId}
                        playbackActiveIdx={activeStageIdx}
                        pipelinePositions={pipelinePositions}
                        onSelectSubnode={handleSelectSubnode}
                        camRef={camRef}
                        hasDraggedRef={hasDraggedRef}
                        projectLabel={project.label}
                    />
                </Canvas>

                {/* ── Stage card (playback) ─────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {stageCard && (
                        <StageCard
                            key={`stage-${stageCard.idx}`}
                            label={stageCard.label}
                            detail={stageCard.detail}
                            stageNum={stageCard.idx + 1}
                            total={pipelineNodes.length}
                        />
                    )}
                </AnimatePresence>

                {/* ── Click-to-inspect detail card ─────────────────────── */}
                <AnimatePresence>
                    {detailCard && (
                        <FocusDetailCard
                            key={selectedSubnodeId}
                            {...detailCard}
                            onClose={closeDetail}
                        />
                    )}
                </AnimatePresence>

                <div className="absolute bottom-4 right-4 pointer-events-none">
                    <p className="font-mono text-[9px]" style={{ color: 'rgba(154,176,204,0.18)' }}>
                        drag · scroll · click nodes
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
