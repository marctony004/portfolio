import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Layers, Eye, Brain, Users, BookOpen, Mail, Cpu, type LucideIcon } from 'lucide-react';
import { orbitNodes, currentStatus, type Capability } from '../data/brainData';
import type { OrbitNodeData, ChildNodeData } from '../data/brainData';
import { CapabilityChips } from './CapabilityChips';

// ── constants ──────────────────────────────────────────────────────────────
const ORBIT_ANGLES      = [-90, -30, 30, 90, 150, 210];
const PROJECTS_IDX      = orbitNodes.findIndex(n => n.id === 'projects');
const PROJECTS_ANGLE    = ORBIT_ANGLES[PROJECTS_IDX] ?? -90;
const PROJECTS_CHILDREN = PROJECTS_IDX >= 0 ? (orbitNodes[PROJECTS_IDX].children ?? []) : [];

const ICONS: Record<string, LucideIcon> = {
    projects: Layers, cv: Eye, nlp: Brain, leadership: Users, education: BookOpen, contact: Mail,
};

// Which capabilities each orbit node represents (for cross-edge derivation)
const ORBIT_CAP_MAP: Record<string, string[]> = {
    cv:  ['Computer Vision', 'Real-Time'],
    nlp: ['NLP/LLMs', 'Azure'],
};

// Static constellation points (fractional coords 0–1)
const STARS = [
    { x: 0.07, y: 0.11, r: 1.1 }, { x: 0.88, y: 0.17, r: 0.9 },
    { x: 0.21, y: 0.83, r: 0.8 }, { x: 0.74, y: 0.73, r: 1.0 },
    { x: 0.47, y: 0.07, r: 0.9 }, { x: 0.92, y: 0.53, r: 1.0 },
    { x: 0.13, y: 0.47, r: 0.7 }, { x: 0.63, y: 0.92, r: 1.1 },
    { x: 0.37, y: 0.32, r: 0.8 }, { x: 0.83, y: 0.88, r: 0.7 },
    { x: 0.54, y: 0.54, r: 0.6 }, { x: 0.04, y: 0.67, r: 0.9 },
    { x: 0.94, y: 0.34, r: 0.8 }, { x: 0.31, y: 0.05, r: 1.0 },
    { x: 0.78, y: 0.43, r: 0.7 },
];

// ── geometry helpers ────────────────────────────────────────────────────────
interface Pos { x: number; y: number; }

function orbitPositions(cx: number, cy: number, r: number): Pos[] {
    return ORBIT_ANGLES.map(deg => {
        const rad = (deg * Math.PI) / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    });
}

function childPositions(px: number, py: number, angleDeg: number, count: number, r: number): Pos[] {
    if (count === 0) return [];
    const spread = 150;
    const start  = angleDeg - spread / 2;
    return Array.from({ length: count }, (_, i) => {
        const rad = ((start + (count > 1 ? (spread / (count - 1)) * i : 0)) * Math.PI) / 180;
        return { x: px + r * Math.cos(rad), y: py + r * Math.sin(rad) };
    });
}

// ── NodeCircle ───────────────────────────────────────────────────────────────
interface NodeProps {
    id: string; x: number; y: number; size: number;
    label: string;
    icon?: LucideIcon;
    isCenter?: boolean; isChild?: boolean;
    isActive: boolean; isDimmed: boolean; isHovered: boolean;
    isKbFocused?: boolean;
    isRelatedToHover?: boolean;
    expandable?: boolean; isExpanded?: boolean;
    isHinted?: boolean;
    driftIdx: number; reduced: boolean | null;
    onClick: (e: React.MouseEvent) => void;
    onHover: (on: boolean) => void;
}

const ACCENT = '#3DE3FF';
const MUTED  = '#9AB0CC';

const NodeCircle = ({ x, y, size, label, icon: Icon, isCenter, isChild, isActive, isDimmed, isHovered, isKbFocused, isRelatedToHover, expandable, isExpanded, isHinted, driftIdx, reduced, onClick, onHover }: NodeProps) => {
    const dx  = Math.sin(driftIdx * 2.31) * 3;
    const dy  = Math.cos(driftIdx * 1.73) * 3;
    const dur = 7 + driftIdx * 1.3;

    const borderColor = isActive          ? 'rgba(61,227,255,0.85)'
        : isKbFocused                     ? 'rgba(61,227,255,0.70)'
        : isHinted                        ? 'rgba(61,227,255,0.55)'
        : isHovered                       ? 'rgba(61,227,255,0.50)'
        : isRelatedToHover                ? 'rgba(61,227,255,0.42)'
        :                                   'rgba(61,227,255,0.18)';

    const glow = isActive                 ? '0 0 40px rgba(61,227,255,0.30)'
        : isKbFocused                     ? '0 0 28px rgba(61,227,255,0.24)'
        : isHinted                        ? '0 0 28px rgba(61,227,255,0.22)'
        : isHovered                       ? '0 0 24px rgba(61,227,255,0.20)'
        : isRelatedToHover                ? '0 0 22px rgba(61,227,255,0.16)'
        :                                   '0 0 14px rgba(61,227,255,0.07)';

    const borderStyle = isKbFocused ? 'dashed' : 'solid';
    const iconColor   = isActive || isHovered || isHinted || isKbFocused ? ACCENT : MUTED;
    const iconSize    = isCenter ? 16 : isChild ? 12 : 14;

    return (
        <motion.div
            className="absolute cursor-pointer select-none"
            style={{ left: x - size / 2, top: y - size / 2, width: size, height: size, pointerEvents: 'auto' }}
            animate={reduced ? {} : { x: [0, dx, 0, -dx * 0.6, 0], y: [0, dy, 0, -dy * 0.6, 0] }}
            transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
            onClick={onClick}
            onHoverStart={() => onHover(true)}
            onHoverEnd={() => onHover(false)}
        >
            {/* Hint pulse ring */}
            {isHinted && (
                <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ border: '1px solid rgba(61,227,255,0.4)' }}
                    animate={{ scale: [1, 1.55, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Circle */}
            <motion.div
                className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                animate={{ opacity: isDimmed ? 0.22 : 1, scale: isActive ? 1.12 : isHovered ? 1.06 : 1 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                style={{
                    background: isCenter ? 'rgba(17,26,46,0.97)' : 'rgba(17,26,46,0.88)',
                    border: `1.5px ${borderStyle} ${borderColor}`,
                    boxShadow: glow,
                }}
            >
                <div className="absolute inset-[4px] rounded-full pointer-events-none"
                    style={{ border: '1px solid rgba(61,227,255,0.07)' }} />

                {Icon && <Icon size={iconSize} color={iconColor} />}

                {isCenter && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Cpu size={14} color={isHovered ? ACCENT : MUTED} />
                        <span className="text-[8px] font-mono mt-0.5 leading-none text-center" style={{ color: isHovered ? ACCENT : MUTED }}>
                            MARC<br />SMITH
                        </span>
                    </div>
                )}
            </motion.div>

            {/* Label */}
            {!isCenter && (
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none">
                    <span className="font-mono leading-none" style={{
                        fontSize: isChild ? 9 : 10,
                        color: isActive ? ACCENT : isDimmed ? 'rgba(154,176,204,0.25)' : MUTED,
                    }}>
                        {label}
                        {expandable && (
                            <span style={{ marginLeft: 4, color: ACCENT, opacity: 0.65, fontSize: 9 }}>
                                {isExpanded ? '−' : '+'}
                            </span>
                        )}
                    </span>
                </div>
            )}
        </motion.div>
    );
};

// ── Tooltip ──────────────────────────────────────────────────────────────────
const Tooltip = ({ x, y, label, tip, containerW }: { x: number; y: number; label: string; tip: string; containerW: number }) => {
    const left = x > containerW * 0.7 ? x - 180 : x + 20;
    const top  = Math.max(56, y - 32);
    return (
        <motion.div
            className="fixed z-30 pointer-events-none"
            style={{ left, top, maxWidth: 180 }}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
        >
            <div className="rounded-md px-3 py-2"
                style={{ background: 'rgba(17,26,46,0.95)', border: '1px solid rgba(61,227,255,0.2)', backdropFilter: 'blur(8px)' }}>
                <p className="font-sans font-medium text-[12px] leading-tight" style={{ color: '#E6EEF9' }}>{label}</p>
                <p className="font-mono text-[10px] leading-tight mt-0.5" style={{ color: MUTED }}>{tip}</p>
            </div>
        </motion.div>
    );
};

// ── BrainMap ──────────────────────────────────────────────────────────────────
type AnyNodeData = OrbitNodeData | ChildNodeData;
type SelectedNode = AnyNodeData & { id: string };

interface Props {
    onSelect: (node: SelectedNode | null) => void;
    selectedId: string | null;
    jumpTo?: string | null;
    onJumpDone?: () => void;
    paletteOpen?: boolean;
}

export const BrainMap = ({ onSelect, selectedId, jumpTo, onJumpDone, paletteOpen }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims]       = useState({ w: 800, h: 600 });
    const [hovered, setHovered] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; tip: string } | null>(null);
    const [expanded, setExpanded]   = useState(false);
    const [camera, setCamera]       = useState({ x: 0, y: 0, scale: 1 });
    const [activeFilter, setActiveFilter] = useState<Capability | null>(null);
    const [kbFocus, setKbFocus]     = useState<string | null>(null);
    // Smart defaults
    const [showHint, setShowHint]             = useState(false);
    const [projectsHinted, setProjectsHinted] = useState(false);
    const [centerPulse, setCenterPulse]       = useState(false);
    const [hasInteracted, setHasInteracted]   = useState(false);
    const [linesVisible, setLinesVisible]     = useState(false);
    const reduced = useReducedMotion();

    // Random orbit node reveal order — shuffled once per mount
    const orbitRevealOrder = useMemo(() => {
        const indices = orbitNodes.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        // result[nodeIdx] = position in reveal sequence (0 = first to appear)
        const result = new Array(orbitNodes.length).fill(0);
        indices.forEach((nodeIdx, pos) => { result[nodeIdx] = pos; });
        return result;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Stable refs for callbacks
    const onSelectRef    = useRef(onSelect);
    const onJumpDoneRef  = useRef(onJumpDone);
    const paletteOpenRef = useRef(paletteOpen);
    useEffect(() => { onSelectRef.current = onSelect; });
    useEffect(() => { onJumpDoneRef.current = onJumpDone; });
    useEffect(() => { paletteOpenRef.current = paletteOpen; }, [paletteOpen]);

    // Smart defaults on load
    useEffect(() => {
        if (reduced) { setLinesVisible(true); return; }
        // Lines appear after all orbit nodes have had time to animate in
        // center: 0.1s delay + 0.45s anim = ~0.55s
        // last orbit node: 0.3s + 5*0.13s stagger + 0.4s anim = ~1.35s
        const tLines = setTimeout(() => setLinesVisible(true), 1500);
        const t1 = setTimeout(() => setCenterPulse(true),  800);
        const t2 = setTimeout(() => setCenterPulse(false), 2600);
        const t3 = setTimeout(() => { setShowHint(true); setProjectsHinted(true); }, 1800);
        const t4 = setTimeout(() => setShowHint(false),    5000);
        const t5 = setTimeout(() => setProjectsHinted(false), 4200);
        return () => [tLines, t1, t2, t3, t4, t5].forEach(clearTimeout);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Responsive dims
    useEffect(() => {
        const update = () => {
            if (containerRef.current)
                setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
        };
        update();
        const ro = new ResizeObserver(update);
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // Reset camera when selection cleared
    useEffect(() => {
        if (selectedId === null) setCamera({ x: 0, y: 0, scale: 1 });
    }, [selectedId]);

    const cx = dims.w * 0.5;
    const cy = dims.h * 0.5;
    const orbitR      = Math.min(dims.w * 0.42, dims.h * 0.38);
    const childR      = orbitR * 0.38;
    const CENTER_SIZE = Math.min(88, orbitR * 0.42);
    const NODE_SIZE   = Math.min(64, orbitR * 0.30);
    const CHILD_SIZE  = Math.min(50, orbitR * 0.24);

    const positions   = useMemo(() => orbitPositions(cx, cy, orbitR), [cx, cy, orbitR]);
    const projectsPos = positions[PROJECTS_IDX >= 0 ? PROJECTS_IDX : 0];

    const childPos = useMemo(
        () => childPositions(projectsPos.x, projectsPos.y, PROJECTS_ANGLE + 180, PROJECTS_CHILDREN.length, childR),
        [projectsPos.x, projectsPos.y, childR]
    );

    const allNodes = useMemo(() => {
        const map: Record<string, { data: AnyNodeData; x: number; y: number }> = {};
        orbitNodes.forEach((n, i) => { map[n.id] = { data: n, x: positions[i].x, y: positions[i].y }; });
        PROJECTS_CHILDREN.forEach((c, i) => { if (childPos[i]) map[c.id] = { data: c, x: childPos[i].x, y: childPos[i].y }; });
        return map;
    }, [positions, childPos]);

    // Cross-edges: project children → skill orbit nodes (derived from capabilities)
    const crossEdges = useMemo(() => {
        if (!expanded) return [];
        const edges: Array<{ childId: string; orbitId: string; childIdx: number; orbitIdx: number }> = [];
        PROJECTS_CHILDREN.forEach((child, ci) => {
            const childCaps = child.capabilities ?? [];
            orbitNodes.forEach((orbit, oi) => {
                const oCaps = ORBIT_CAP_MAP[orbit.id] ?? [];
                if (childCaps.some(c => oCaps.includes(c)))
                    edges.push({ childId: child.id, orbitId: orbit.id, childIdx: ci, orbitIdx: oi });
            });
        });
        return edges;
    }, [expanded]);

    // Which node IDs are related to the currently hovered node
    const hoveredRelatedIds = useMemo(() => {
        if (!hovered) return new Set<string>();
        const related = new Set<string>();
        const oCaps = ORBIT_CAP_MAP[hovered];
        if (oCaps && expanded) {
            PROJECTS_CHILDREN.forEach(child => {
                if ((child.capabilities ?? []).some(c => oCaps.includes(c)))
                    related.add(child.id);
            });
        }
        const hoveredChild = PROJECTS_CHILDREN.find(c => c.id === hovered);
        if (hoveredChild) {
            const childCaps = hoveredChild.capabilities ?? [];
            orbitNodes.forEach(orbit => {
                if (childCaps.some(c => (ORBIT_CAP_MAP[orbit.id] ?? []).includes(c)))
                    related.add(orbit.id);
            });
        }
        return related;
    }, [hovered, expanded]);

    // Keyboard navigation order
    const navOrder = useMemo(() => {
        const ids = orbitNodes.map(n => n.id);
        if (expanded) {
            const pi = ids.indexOf('projects');
            return [...ids.slice(0, pi + 1), ...PROJECTS_CHILDREN.map(c => c.id), ...ids.slice(pi + 1)];
        }
        return ids;
    }, [expanded]);

    // Stable refs for keyboard handler
    const kbFocusRef  = useRef(kbFocus);
    const navOrderRef = useRef(navOrder);
    const expandedRef = useRef(expanded);
    const allNodesRef = useRef(allNodes);
    useEffect(() => { kbFocusRef.current  = kbFocus; },   [kbFocus]);
    useEffect(() => { navOrderRef.current = navOrder; },  [navOrder]);
    useEffect(() => { expandedRef.current = expanded; },  [expanded]);
    useEffect(() => { allNodesRef.current = allNodes; },  [allNodes]);

    const moveCamera = useCallback((nx: number, ny: number) => {
        const dx = (nx - cx) * 0.12;
        const dy = (ny - cy) * 0.12;
        setCamera({ x: -dx, y: -dy, scale: 1.04 });
    }, [cx, cy]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (paletteOpenRef.current) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'];
            if (!KEYS.includes(e.key)) return;
            e.preventDefault();

            const order   = navOrderRef.current;
            const current = kbFocusRef.current;
            const idx     = current ? order.indexOf(current) : -1;

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                setKbFocus(order[idx < 0 ? 0 : (idx + 1) % order.length]);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                setKbFocus(order[idx <= 0 ? order.length - 1 : idx - 1]);
            } else if (e.key === 'Enter' && current) {
                const entry = allNodesRef.current[current];
                if (!entry) return;
                if (current === 'projects') setExpanded(p => !p);
                moveCamera(entry.x, entry.y);
                setTimeout(() => onSelectRef.current({ ...entry.data, id: current } as SelectedNode), 350);
                setKbFocus(null);
                setHasInteracted(true);
            } else if (e.key === 'Escape') {
                setKbFocus(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [moveCamera]);

    // Handle external jumpTo
    useEffect(() => {
        if (!jumpTo) return;
        const entry = allNodes[jumpTo];
        if (!entry) return;
        const isChild = PROJECTS_CHILDREN.some(c => c.id === jumpTo);
        if (isChild) setExpanded(true);
        moveCamera(entry.x, entry.y);
        setTimeout(() => {
            onSelectRef.current({ ...entry.data, id: jumpTo } as SelectedNode);
            onJumpDoneRef.current?.();
        }, 350);
    }, [jumpTo, allNodes, moveCamera]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNodeClick = (id: string, x: number, y: number, data: AnyNodeData, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasInteracted) setHasInteracted(true);
        setKbFocus(null);
        if (id === 'projects') setExpanded(p => !p);
        moveCamera(x, y);
        setTimeout(() => onSelect({ ...data, id } as SelectedNode), 350);
    };

    const handleBgClick = () => {
        onSelect(null);
        setCamera({ x: 0, y: 0, scale: 1 });
        setExpanded(false);
        setKbFocus(null);
    };

    const handleHover = (id: string, x: number, y: number, label: string, tip: string, on: boolean) => {
        setHovered(on ? id : null);
        setTooltip(on ? { x, y, label, tip } : null);
    };

    // Dimming logic
    const isChildSelected = PROJECTS_CHILDREN.some(c => c.id === selectedId);

    const orbitNodeDimmed = (node: OrbitNodeData): boolean => {
        if (activeFilter) {
            const matches = node.id === 'projects'
                ? PROJECTS_CHILDREN.some(c => c.capabilities?.includes(activeFilter))
                : (node.capabilities?.includes(activeFilter) ?? false);
            return !matches && selectedId !== node.id;
        }
        return !!selectedId && selectedId !== node.id && !isChildSelected;
    };

    const childNodeDimmed = (child: ChildNodeData): boolean => {
        if (activeFilter) return !(child.capabilities?.includes(activeFilter)) && selectedId !== child.id;
        return !!selectedId && selectedId !== child.id;
    };

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden" onClick={handleBgClick}>

            {/* Capability filter chips */}
            <CapabilityChips active={activeFilter} onToggle={(cap) => { setActiveFilter(cap); onSelect(null); }} />

            {/* Keyboard nav hint */}
            <AnimatePresence>
                {kbFocus && (
                    <motion.div
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none z-10"
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <p className="font-mono text-[10px] tracking-widest" style={{ color: 'rgba(61,227,255,0.45)' }}>
                            ↑↓ navigate · <span style={{ color: 'rgba(61,227,255,0.7)' }}>↵</span> select · esc to cancel
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Camera wrapper */}
            <motion.div
                className="absolute inset-0"
                animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ transformOrigin: 'center' }}
            >
                <svg className="absolute inset-0 pointer-events-none overflow-visible" width={dims.w} height={dims.h}>
                    <defs>
                        <radialGradient id="cglow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="rgba(61,227,255,0.16)" />
                            <stop offset="100%" stopColor="transparent" />
                        </radialGradient>
                    </defs>

                    {/* Constellation background */}
                    {STARS.map((s, i) => (
                        <circle key={i} cx={s.x * dims.w} cy={s.y * dims.h} r={s.r}
                            fill="rgba(154,176,204,0.16)" />
                    ))}

                    <ellipse cx={cx} cy={cy} rx={orbitR * 0.78} ry={orbitR * 0.78} fill="url(#cglow)" />

                    {/* Orbit connection lines — appear after nodes are in */}
                    <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: linesVisible ? 1 : 0 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                    >
                        {/* Focus lens glow on active path */}
                        <AnimatePresence>
                            {positions.map((pos, i) => {
                                const node   = orbitNodes[i];
                                const active = selectedId === node.id || (node.id === 'projects' && isChildSelected);
                                if (!active) return null;
                                const dx = pos.x - cx, dy = pos.y - cy, len = Math.hypot(dx, dy);
                                const gs = CENTER_SIZE / 2, ge = NODE_SIZE / 2;
                                return (
                                    <motion.line key={`lens-${node.id}`}
                                        x1={cx + dx * (gs / len)} y1={cy + dy * (gs / len)}
                                        x2={cx + dx * ((len - ge) / len)} y2={cy + dy * ((len - ge) / len)}
                                        stroke={ACCENT} strokeWidth={7} strokeLinecap="round"
                                        initial={{ opacity: 0 }} animate={{ opacity: 0.09 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                    />
                                );
                            })}
                        </AnimatePresence>

                        {/* Orbit connections */}
                        {positions.map((pos, i) => {
                            const node   = orbitNodes[i];
                            const active = selectedId === node.id || (node.id === 'projects' && isChildSelected);
                            const dx = pos.x - cx, dy = pos.y - cy, len = Math.hypot(dx, dy);
                            const gapStart = CENTER_SIZE / 2 + 4, gapEnd = NODE_SIZE / 2 + 4;
                            return (
                                <motion.line key={node.id}
                                    x1={cx + dx * (gapStart / len)} y1={cy + dy * (gapStart / len)}
                                    x2={cx + dx * ((len - gapEnd) / len)} y2={cy + dy * ((len - gapEnd) / len)}
                                    stroke={active ? ACCENT : 'rgba(154,176,204,0.2)'}
                                    strokeWidth={active ? 1.5 : 1}
                                    strokeDasharray={active ? '5 5' : undefined}
                                    animate={active ? { strokeDashoffset: [0, -10] } : {}}
                                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                                />
                            );
                        })}
                    </motion.g>

                    {/* Child connections */}
                    <AnimatePresence>
                        {expanded && childPos.map((pos, i) => {
                            const child  = PROJECTS_CHILDREN[i];
                            if (!child) return null;
                            const active = selectedId === child.id;
                            const dx = pos.x - projectsPos.x, dy = pos.y - projectsPos.y, len = Math.hypot(dx, dy);
                            const g1 = NODE_SIZE / 2 + 3, g2 = CHILD_SIZE / 2 + 3;
                            return (
                                <motion.line key={child.id}
                                    x1={projectsPos.x + dx * (g1 / len)} y1={projectsPos.y + dy * (g1 / len)}
                                    x2={projectsPos.x + dx * ((len - g2) / len)} y2={projectsPos.y + dy * ((len - g2) / len)}
                                    stroke={active ? ACCENT : 'rgba(154,176,204,0.12)'}
                                    strokeWidth={active ? 1.2 : 0.75}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    transition={{ duration: 0.25, delay: i * 0.04 }}
                                />
                            );
                        })}
                    </AnimatePresence>

                    {/* Cross-edges: project children → skill orbit nodes */}
                    <AnimatePresence>
                        {crossEdges.map((edge, ei) => {
                            const cPos = childPos[edge.childIdx];
                            const oPos = positions[edge.orbitIdx];
                            if (!cPos || !oPos) return null;
                            const isActive = selectedId === edge.childId || selectedId === edge.orbitId
                                || hovered === edge.childId || hovered === edge.orbitId;
                            const dx = oPos.x - cPos.x, dy = oPos.y - cPos.y, len = Math.hypot(dx, dy);
                            const g1 = CHILD_SIZE / 2 + 2, g2 = NODE_SIZE / 2 + 2;
                            const x1 = cPos.x + dx * (g1 / len), y1 = cPos.y + dy * (g1 / len);
                            const x2 = cPos.x + dx * ((len - g2) / len), y2 = cPos.y + dy * ((len - g2) / len);
                            return (
                                <motion.path
                                    key={`cross-${edge.childId}-${edge.orbitId}`}
                                    d={`M ${x1} ${y1} L ${x2} ${y2}`}
                                    fill="none"
                                    strokeWidth={isActive ? 1 : 0.55}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{
                                        pathLength: 1,
                                        opacity: 1,
                                        stroke: isActive ? 'rgba(61,227,255,0.50)' : 'rgba(61,227,255,0.10)',
                                    }}
                                    exit={{ pathLength: 0, opacity: 0 }}
                                    transition={{ duration: 0.55, delay: ei * 0.045, ease: 'easeOut' }}
                                />
                            );
                        })}
                    </AnimatePresence>
                </svg>

                {/* Center pulse ring (fires once on load) */}
                {centerPulse && !reduced && (
                    <motion.div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            left: cx - CENTER_SIZE / 2 - 10,
                            top:  cy - CENTER_SIZE / 2 - 10,
                            width: CENTER_SIZE + 20,
                            height: CENTER_SIZE + 20,
                            border: '1.5px solid rgba(61,227,255,0.45)',
                        }}
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 1.9, opacity: 0 }}
                        transition={{ duration: 1.6, ease: 'easeOut' }}
                    />
                )}

                {/* Center node */}
                <motion.div
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    initial={reduced ? {} : { opacity: 0, scale: 0.55 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={reduced ? {} : { duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                    <NodeCircle
                        id="center" x={cx} y={cy} size={CENTER_SIZE} label="Marc Smith" isCenter
                        isActive={!selectedId} isDimmed={false} isHovered={hovered === 'center'}
                        driftIdx={-1} reduced={reduced}
                        onClick={(e) => { e.stopPropagation(); onSelect(null); setCamera({ x: 0, y: 0, scale: 1 }); setKbFocus(null); }}
                        onHover={(on) => handleHover('center', cx, cy, 'Marc Smith', 'AI/ML Engineer & Full-Stack Developer', on)}
                    />
                </motion.div>

                {/* Currently building status — below center node */}
                <div
                    className="absolute pointer-events-none text-center"
                    style={{ left: cx - 80, top: cy + CENTER_SIZE / 2 + 10, width: 160 }}
                >
                    <span className="font-mono text-[8px] tracking-wide" style={{ color: 'rgba(61,227,255,0.32)' }}>
                        ▸ {currentStatus}
                    </span>
                </div>

                {/* Orbit nodes — appear in random order */}
                {orbitNodes.map((node, i) => {
                    const pos       = positions[i];
                    const Icon      = ICONS[node.id];
                    const entryDelay = 0.3 + orbitRevealOrder[i] * 0.13;
                    return (
                        <motion.div
                            key={`${node.id}-entrance`}
                            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                            initial={reduced ? {} : { opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={reduced ? {} : { duration: 0.4, delay: entryDelay, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <NodeCircle
                                id={node.id} x={pos.x} y={pos.y} size={NODE_SIZE} label={node.label} icon={Icon}
                                isActive={selectedId === node.id || (node.id === 'projects' && isChildSelected)}
                                isDimmed={orbitNodeDimmed(node)}
                                isHovered={hovered === node.id}
                                isKbFocused={kbFocus === node.id}
                                isRelatedToHover={hoveredRelatedIds.has(node.id)}
                                expandable={node.id === 'projects'}
                                isExpanded={expanded && node.id === 'projects'}
                                isHinted={node.id === 'projects' && projectsHinted && !hasInteracted}
                                driftIdx={i} reduced={reduced}
                                onClick={(e) => handleNodeClick(node.id, pos.x, pos.y, node, e)}
                                onHover={(on) => handleHover(node.id, pos.x, pos.y, node.label, node.tooltip, on)}
                            />
                        </motion.div>
                    );
                })}

                {/* Project child nodes */}
                <AnimatePresence>
                    {expanded && childPos.map((pos, i) => {
                        const child = PROJECTS_CHILDREN[i];
                        if (!child) return null;
                        return (
                            <motion.div key={child.id} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                transition={{ duration: 0.25, delay: i * 0.05 }}
                            >
                                <NodeCircle
                                    id={child.id} x={pos.x} y={pos.y} size={CHILD_SIZE} label={child.label} isChild
                                    isActive={selectedId === child.id}
                                    isDimmed={childNodeDimmed(child)}
                                    isHovered={hovered === child.id}
                                    isKbFocused={kbFocus === child.id}
                                    isRelatedToHover={hoveredRelatedIds.has(child.id)}
                                    driftIdx={i + 10} reduced={reduced}
                                    onClick={(e) => handleNodeClick(child.id, pos.x, pos.y, child, e)}
                                    onHover={(on) => handleHover(child.id, pos.x, pos.y, child.label, child.tooltip, on)}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>

            {/* Tooltip */}
            <AnimatePresence>
                {tooltip && hovered && (
                    <Tooltip
                        key={hovered}
                        x={tooltip.x + camera.x}
                        y={tooltip.y + camera.y}
                        label={tooltip.label}
                        tip={tooltip.tip}
                        containerW={dims.w}
                    />
                )}
            </AnimatePresence>

            {/* First-visit hint */}
            <AnimatePresence>
                {showHint && !hasInteracted && (
                    <motion.div
                        className="absolute pointer-events-none z-20"
                        style={{ left: cx + CENTER_SIZE / 2 + 14, top: cy - 18 }}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.35 }}
                    >
                        <div className="rounded-md px-3 py-1.5"
                            style={{ background: 'rgba(17,26,46,0.92)', border: '1px solid rgba(61,227,255,0.18)', backdropFilter: 'blur(8px)' }}>
                            <p className="font-mono text-[10px] whitespace-nowrap" style={{ color: 'rgba(61,227,255,0.7)' }}>
                                Click any node to explore →
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom hint */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none">
                <p className="font-mono text-[10px] text-muted/35 tracking-widest">
                    click · <span style={{ color: 'rgba(61,227,255,0.4)' }}>↑↓</span> keys · press <span className="text-accent/50">/</span> to search
                </p>
            </div>
        </div>
    );
};
