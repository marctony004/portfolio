import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useMapGestures } from '../hooks/useMapGestures';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useAnimationFrame, useAnimation } from 'framer-motion';
import { orbitNodes, currentStatus, type Capability } from '../data/brainData';
import type { OrbitNodeData, ChildNodeData } from '../data/brainData';
import { CapabilityChips } from './CapabilityChips';
import { ACCENT } from '../theme';
import { EdgeLine } from './EdgeLine';
import { NodeCircle } from './NodeCircle';
import {
    PROJECTS_IDX, PROJECTS_ANGLE, PROJECTS_CHILDREN,
    ICONS, ORBIT_CAP_MAP, ORBITAL_PARAMS, ORBIT_DEPTHS, STARS,
    orbitPositions, childPositions,
} from './brainMapConstants';

// ── Tooltip ───────────────────────────────────────────────────────────────────
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
                <p className="font-mono text-[10px] leading-tight mt-0.5" style={{ color: '#9AB0CC' }}>{tip}</p>
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
    contracting?: boolean;      // true during the BrainSphere morph transition
    tourActive?: boolean;       // true while guided tour controls navigation
    tourSpotlightId?: string | null; // node the tour is currently narrating
    tourHighlightNodeIds?: string[]; // orbit node ids whose center-edge should glow briefly
    isTourBooting?: boolean;    // true during the 1.8s boot phase before step 1
    isMobile?: boolean;
}

export const BrainMap = ({ onSelect, selectedId, jumpTo, onJumpDone, paletteOpen, contracting = false, tourActive = false, tourSpotlightId = null, tourHighlightNodeIds, isTourBooting = false, isMobile = false }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims]       = useState({ w: 800, h: 600 });
    const [hovered, setHovered] = useState<string | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; tip: string } | null>(null);
    const [expanded, setExpanded]   = useState(false);
    const cameraControls = useAnimation();
    // Tracks the settled camera position so arc animations know where to start from
    const cameraRef      = useRef({ x: 0, y: 0, scale: 1 });
    // Mirrors tourActive prop for use inside stable callbacks
    const tourActiveRef  = useRef(tourActive);
    useEffect(() => { tourActiveRef.current = tourActive; }, [tourActive]);
    const [activeFilter, setActiveFilter] = useState<Capability | null>(null);
    const [kbFocus, setKbFocus]     = useState<string | null>(null);
    const [showHint, setShowHint]             = useState(false);
    const [projectsHinted, setProjectsHinted] = useState(false);
    const [centerPulse, setCenterPulse]       = useState(false);
    const [hasInteracted, setHasInteracted]   = useState(false);
    const [pulseSourceId, setPulseSourceId]   = useState<string | null>(null);
    const [bootRipple, setBootRipple]         = useState(false);
    const [bootEdgePulse, setBootEdgePulse]   = useState(false);
    const reduced = useReducedMotion();

    // Boot neural-activation effects
    const prevBootingRef = useRef(false);
    useEffect(() => {
        if (isTourBooting && !prevBootingRef.current) {
            prevBootingRef.current = true;
            // Edge pulse wave fires when "Loading nodes..." text appears (~0.85s)
            const t1 = setTimeout(() => setBootEdgePulse(true),  850);
            const t2 = setTimeout(() => setBootEdgePulse(false), 1060);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
        if (!isTourBooting && prevBootingRef.current) {
            prevBootingRef.current = false;
            // Ripple fires as boot ends
            setBootRipple(true);
            const t = setTimeout(() => setBootRipple(false), 2200);
            return () => clearTimeout(t);
        }
    }, [isTourBooting]);

    // Orbital physics — one x/y MotionValue pair per orbit node (hooks can't be in loops)
    const nx0 = useMotionValue(0), ny0 = useMotionValue(0);
    const nx1 = useMotionValue(0), ny1 = useMotionValue(0);
    const nx2 = useMotionValue(0), ny2 = useMotionValue(0);
    const nx3 = useMotionValue(0), ny3 = useMotionValue(0);
    const nx4 = useMotionValue(0), ny4 = useMotionValue(0);
    const nx5 = useMotionValue(0), ny5 = useMotionValue(0);
    const nodeMotionX = [nx0, nx1, nx2, nx3, nx4, nx5];
    const nodeMotionY = [ny0, ny1, ny2, ny3, ny4, ny5];

    const scaleCurrents = useRef([1, 1, 1, 1, 1, 1]);
    const scaleTargets  = useRef([1, 1, 1, 1, 1, 1]);
    const mountTimeRef    = useRef<number | null>(null);
    const hoveredRef      = useRef<string | null>(null);
    const selectedIdRef   = useRef<string | null>(null);
    const contractingRef  = useRef(contracting);
    useEffect(() => { contractingRef.current = contracting; }, [contracting]);

    // Random orbit node reveal order — shuffled once per mount
    const orbitRevealOrder = useMemo(() => {
        const indices = orbitNodes.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
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
        if (reduced) return;
        const t1 = setTimeout(() => setCenterPulse(true),  700);
        const t2 = setTimeout(() => setCenterPulse(false), 2400);
        const t3 = setTimeout(() => { setShowHint(true); setProjectsHinted(true); }, 2400);
        const t4 = setTimeout(() => setShowHint(false),    5200);
        const t5 = setTimeout(() => setProjectsHinted(false), 4400);
        return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { hoveredRef.current    = hovered; },    [hovered]);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

    // Orbital physics loop — 60 fps, mutates MotionValues directly (zero React re-renders)
    useAnimationFrame((t) => {
        if (reduced || contractingRef.current) return;
        if (mountTimeRef.current === null) mountTimeRef.current = t;
        const elapsed = t - mountTimeRef.current;
        if (elapsed < 2000) return;

        orbitNodes.forEach((node, i) => {
            const p     = ORBITAL_PARAMS[i];
            const isHov = hoveredRef.current    === node.id;
            const isSel = selectedIdRef.current === node.id;
            scaleTargets.current[i]   = isSel ? 0.02 : isHov ? 0.18 : 1;
            scaleCurrents.current[i] += (scaleTargets.current[i] - scaleCurrents.current[i]) * 0.025;
            const s = scaleCurrents.current[i];
            nodeMotionX[i].set(Math.sin(p.omegaX * elapsed + p.phaseX) * p.amplX * s);
            nodeMotionY[i].set(Math.sin(p.omegaY * elapsed + p.phaseY) * p.amplY * s);
        });
    });

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

    useEffect(() => {
        if (selectedId === null) {
            cameraRef.current = { x: 0, y: 0, scale: 1 };
            cameraControls.start({ x: 0, y: 0, scale: 1, opacity: 1,
                transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] } });
        }
    }, [selectedId, cameraControls]);

    // Contracting (BrainSphere morph) — fire animation imperatively so we can restore after
    useEffect(() => {
        if (contracting) {
            cameraControls.start({ x: 0, y: 0, scale: 0.35, opacity: 0,
                transition: { duration: 0.90, ease: [0.55, 0, 1, 0.45] } });
        } else {
            const c = cameraRef.current;
            cameraControls.start({ x: c.x, y: c.y, scale: c.scale, opacity: 1,
                transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } });
        }
    }, [contracting, cameraControls]);

    const cx = dims.w * 0.5;
    const cy = dims.h * 0.5;
    const orbitR      = Math.min(dims.w * 0.42, dims.h * 0.38);
    const childR      = orbitR * 0.38;
    const tapMul      = isMobile ? 1.18 : 1;
    const CENTER_SIZE = Math.min(88, orbitR * 0.42);
    const NODE_SIZE   = Math.min(64, orbitR * 0.30) * tapMul;
    const CHILD_SIZE  = Math.min(50, orbitR * 0.24) * tapMul;

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

    // Cross-edges: project children → skill orbit nodes
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

    const kbFocusRef  = useRef(kbFocus);
    const navOrderRef = useRef(navOrder);
    const expandedRef = useRef(expanded);
    const allNodesRef = useRef(allNodes);
    useEffect(() => { kbFocusRef.current  = kbFocus; },   [kbFocus]);
    useEffect(() => { navOrderRef.current = navOrder; },  [navOrder]);
    useEffect(() => { expandedRef.current = expanded; },  [expanded]);
    useEffect(() => { allNodesRef.current = allNodes; },  [allNodes]);

    const moveCamera = useCallback((nx: number, ny: number, cinematic = false) => {
        // Tour uses a deeper pan + more zoom; normal clicks stay subtle
        const panFactor   = cinematic ? 0.38 : 0.12;
        const targetScale = cinematic ? 1.18 : 1.04;

        const targetX = -(nx - cx) * panFactor;
        const targetY = -(ny - cy) * panFactor;

        // Always animate as flat targets so Framer Motion interpolates from its
        // current rendered position — no keyframe snapping, no bounce.
        cameraControls.start({
            x: targetX, y: targetY,
            scale: targetScale, opacity: 1,
            transition: {
                duration: cinematic ? 1.0 : 0.60,
                ease: cinematic ? [0.4, 0.0, 0.2, 1.0] : [0.25, 0.46, 0.45, 0.94],
            },
        });

        cameraRef.current = { x: targetX, y: targetY, scale: targetScale };
    }, [cx, cy, cameraControls]);

    // Mobile pan/pinch
    const handlePan = useCallback((dx: number, dy: number) => {
        const LIMIT = orbitR * 1.6;
        const newX  = Math.max(-LIMIT, Math.min(LIMIT, cameraRef.current.x + dx));
        const newY  = Math.max(-LIMIT, Math.min(LIMIT, cameraRef.current.y + dy));
        cameraRef.current = { ...cameraRef.current, x: newX, y: newY };
        cameraControls.start({ x: newX, y: newY, transition: { duration: 0 } });
    }, [cameraControls, orbitR]);

    const handlePinch = useCallback((scaleDelta: number) => {
        const newScale = Math.max(0.45, Math.min(2.4, cameraRef.current.scale * scaleDelta));
        cameraRef.current = { ...cameraRef.current, scale: newScale };
        cameraControls.start({ scale: newScale, transition: { duration: 0 } });
    }, [cameraControls]);

    const { isPanningRef } = useMapGestures(containerRef, {
        onPan:   handlePan,
        onPinch: handlePinch,
        enabled: isMobile,
    });

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
        moveCamera(entry.x, entry.y, tourActiveRef.current);
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
        setPulseSourceId(id);
        setTimeout(() => setPulseSourceId(null), 1400);
        setTimeout(() => onSelect({ ...data, id } as SelectedNode), 350);
    };

    const handleBgClick = () => {
        if (tourActive) return;
        if (isMobile && isPanningRef.current) return; // pan gesture ended — don't deselect
        onSelect(null);
        setExpanded(false);
        setKbFocus(null);
    };

    const handleHover = (id: string, x: number, y: number, label: string, tip: string, on: boolean) => {
        setHovered(on ? id : null);
        setTooltip(on ? { x, y, label, tip } : null);
    };

    // Dimming logic
    const isChildSelected = PROJECTS_CHILDREN.some(c => c.id === selectedId);

    // Tour spotlight geometry — position & radius of the spotlighted node
    const spotlightIsChild = tourSpotlightId ? PROJECTS_CHILDREN.some(c => c.id === tourSpotlightId) : false;
    const spotlightPos     = tourSpotlightId ? allNodes[tourSpotlightId] : null;
    const spotlightR       = spotlightIsChild ? CHILD_SIZE / 2 : NODE_SIZE / 2;

    const orbitNodeDimmed = (node: OrbitNodeData): boolean => {
        if (activeFilter) {
            const matches = node.id === 'projects'
                ? PROJECTS_CHILDREN.some(c => c.capabilities?.includes(activeFilter))
                : (node.capabilities?.includes(activeFilter) ?? false);
            return !matches && selectedId !== node.id;
        }
        if (tourActive) return false; // tour uses softer isTourDimmed instead
        return !!selectedId && selectedId !== node.id && !isChildSelected;
    };

    const childNodeDimmed = (child: ChildNodeData): boolean => {
        if (activeFilter) return !(child.capabilities?.includes(activeFilter)) && selectedId !== child.id;
        if (tourActive) return false; // tour uses softer isTourDimmed instead
        return !!selectedId && selectedId !== child.id;
    };

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden" onClick={handleBgClick}>

            {/* Capability filter chips — desktop only */}
            {!isMobile && <CapabilityChips active={activeFilter} onToggle={(cap) => setActiveFilter(cap)} />}

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

            {/* Camera wrapper — transitions fired imperatively via cameraControls */}
            <motion.div
                className="absolute inset-0"
                animate={cameraControls}
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

                    {/* Focus lens glow */}
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
                                    initial={{ opacity: 0 }} animate={{ opacity: 0.07 }} exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                />
                            );
                        })}
                    </AnimatePresence>

                    {/* Primary orbit routes */}
                    {positions.map((pos, i) => {
                        const node      = orbitNodes[i];
                        const active    = selectedId === node.id || (node.id === 'projects' && isChildSelected);
                        const dx = pos.x - cx, dy = pos.y - cy, len = Math.hypot(dx, dy);
                        const gS = CENTER_SIZE / 2 + 4, gE = NODE_SIZE / 2 + 4;
                        const drawDelay = 0.55 + orbitRevealOrder[i] * 0.13;
                        return (
                            <EdgeLine
                                key={node.id}
                                x1={cx + dx * (gS / len)} y1={cy + dy * (gS / len)}
                                x2={cx + dx * ((len - gE) / len)} y2={cy + dy * ((len - gE) / len)}
                                type="primary"
                                drawDelay={drawDelay}
                                drawDuration={0.78}
                                isActive={active}
                                isEdgeHovered={hovered === node.id}
                                isPulsing={pulseSourceId === node.id || bootEdgePulse}
                                reduced={reduced}
                                tourHighlightEdge={!!tourHighlightNodeIds?.includes(node.id)}
                            />
                        );
                    })}

                    {/* Child routes */}
                    <AnimatePresence>
                        {expanded && childPos.map((pos, i) => {
                            const child = PROJECTS_CHILDREN[i];
                            if (!child) return null;
                            const dx = pos.x - projectsPos.x, dy = pos.y - projectsPos.y, len = Math.hypot(dx, dy);
                            const g1 = NODE_SIZE / 2 + 3, g2 = CHILD_SIZE / 2 + 3;
                            return (
                                <EdgeLine
                                    key={child.id}
                                    x1={projectsPos.x + dx * (g1 / len)} y1={projectsPos.y + dy * (g1 / len)}
                                    x2={projectsPos.x + dx * ((len - g2) / len)} y2={projectsPos.y + dy * ((len - g2) / len)}
                                    type="child"
                                    drawDelay={i * 0.07}
                                    drawDuration={0.38}
                                    isActive={selectedId === child.id}
                                    isEdgeHovered={hovered === child.id}
                                    isPulsing={pulseSourceId === child.id || pulseSourceId === 'projects'}
                                    reduced={reduced}
                                />
                            );
                        })}
                    </AnimatePresence>

                    {/* Tour spotlight rings — motion.g owns opacity so AnimatePresence
                        can exit cleanly; plain circle children have no repeat animation
                        that could block the exit sequence and leave ghost rings. */}
                    <AnimatePresence>
                        {tourSpotlightId && spotlightPos && (!spotlightIsChild || expanded) && (
                            <motion.g
                                key={`spotlight-${tourSpotlightId}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            >
                                {/* Inner halo */}
                                <circle
                                    cx={spotlightPos.x} cy={spotlightPos.y}
                                    r={spotlightR + 11}
                                    fill="none"
                                    stroke="rgba(61,227,255,0.42)"
                                    strokeWidth={1.5}
                                />
                                {/* Outer soft glow ring */}
                                <circle
                                    cx={spotlightPos.x} cy={spotlightPos.y}
                                    r={spotlightR + 26}
                                    fill="none"
                                    stroke="rgba(61,227,255,0.11)"
                                    strokeWidth={1}
                                />
                            </motion.g>
                        )}
                    </AnimatePresence>

                    {/* Cross-routes */}
                    <AnimatePresence>
                        {crossEdges.map((edge, ei) => {
                            const cPos = childPos[edge.childIdx];
                            const oPos = positions[edge.orbitIdx];
                            if (!cPos || !oPos) return null;
                            const isActive = selectedId === edge.childId || selectedId === edge.orbitId;
                            const isHov    = hovered === edge.childId || hovered === edge.orbitId;
                            const dx = oPos.x - cPos.x, dy = oPos.y - cPos.y, len = Math.hypot(dx, dy);
                            const g1 = CHILD_SIZE / 2 + 2, g2 = NODE_SIZE / 2 + 2;
                            return (
                                <EdgeLine
                                    key={`cross-${edge.childId}-${edge.orbitId}`}
                                    x1={cPos.x + dx * (g1 / len)} y1={cPos.y + dy * (g1 / len)}
                                    x2={cPos.x + dx * ((len - g2) / len)} y2={cPos.y + dy * ((len - g2) / len)}
                                    type="cross"
                                    drawDelay={ei * 0.055}
                                    drawDuration={0.5}
                                    isActive={isActive || isHov}
                                    isEdgeHovered={isHov}
                                    isPulsing={pulseSourceId === edge.childId || pulseSourceId === edge.orbitId}
                                    reduced={reduced}
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

                {/* Boot neural-activation: strengthened center glow during boot phase */}
                {isTourBooting && !reduced && (
                    <motion.div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            left: cx - CENTER_SIZE / 2 - 10,
                            top:  cy - CENTER_SIZE / 2 - 10,
                            width: CENTER_SIZE + 20,
                            height: CENTER_SIZE + 20,
                            border: '1px solid rgba(61,227,255,0.38)',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ scale: [1, 1.08, 1, 1.08, 1], opacity: [0, 0.48, 0.18, 0.52, 0] }}
                        transition={{ duration: 1.8, ease: 'easeInOut', times: [0, 0.22, 0.5, 0.72, 1] }}
                    />
                )}

                {/* Boot end-ripple: expands outward from center as step 1 begins */}
                {bootRipple && !reduced && (
                    <motion.div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            left: cx - CENTER_SIZE / 2 - 16,
                            top:  cy - CENTER_SIZE / 2 - 16,
                            width: CENTER_SIZE + 32,
                            height: CENTER_SIZE + 32,
                            border: '1px solid rgba(61,227,255,0.30)',
                        }}
                        initial={{ scale: 1, opacity: 0.42 }}
                        animate={{ scale: 3.4, opacity: 0 }}
                        transition={{ duration: 2.0, ease: [0.18, 0, 0.38, 1] }}
                    />
                )}

                {/* Center node */}
                <motion.div
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                    initial={reduced ? {} : { opacity: 0, scale: 0.55 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={reduced ? {} : { duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                    {!reduced && (
                        <motion.div
                            className="absolute rounded-full pointer-events-none"
                            style={{
                                left: cx - CENTER_SIZE / 2 - 6,
                                top:  cy - CENTER_SIZE / 2 - 6,
                                width: CENTER_SIZE + 12,
                                height: CENTER_SIZE + 12,
                                border: '1px solid rgba(61,227,255,0.28)',
                            }}
                            animate={{ scale: [1, 1.09, 1], opacity: [0.5, 0.08, 0.5] }}
                            transition={{ duration: 5.0, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
                        />
                    )}
                    <NodeCircle
                        id="center" x={cx} y={cy} size={CENTER_SIZE} label="Marc Smith" isCenter
                        isActive={!selectedId} isDimmed={false} isHovered={hovered === 'center'}
                        disableInternalDrift
                        driftIdx={-1} reduced={reduced}
                        onClick={(e) => { e.stopPropagation(); onSelect(null); setKbFocus(null); }}
                        onHover={(on) => handleHover('center', cx, cy, 'Marc Smith', 'AI/ML Engineer & Full-Stack Developer', on)}
                    />
                </motion.div>

                {/* Currently building status */}
                <div
                    className="absolute pointer-events-none text-center"
                    style={{ left: cx - 80, top: cy + CENTER_SIZE / 2 + 10, width: 160 }}
                >
                    <span className="font-mono text-[8px] tracking-wide" style={{ color: 'rgba(61,227,255,0.32)' }}>
                        ▸ {currentStatus}
                    </span>
                </div>

                {/* Orbit nodes */}
                {orbitNodes.map((node, i) => {
                    const pos        = positions[i];
                    const Icon       = ICONS[node.id];
                    const entryDelay = 0.3 + orbitRevealOrder[i] * 0.13;
                    return (
                        <motion.div
                            key={`${node.id}-entrance`}
                            style={{
                                position: 'absolute', inset: 0, pointerEvents: 'none',
                                x: nodeMotionX[i], y: nodeMotionY[i],
                            }}
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
                                disableInternalDrift
                                depthScale={ORBIT_DEPTHS[i]}
                                driftIdx={i} reduced={reduced}
                                isTourDimmed={tourActive && !!tourSpotlightId && node.id !== tourSpotlightId}
                                isBootActivating={isTourBooting}
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
                                    isTourDimmed={tourActive && !!tourSpotlightId && child.id !== tourSpotlightId}
                                    onClick={(e) => handleNodeClick(child.id, pos.x, pos.y, child, e)}
                                    onHover={(on) => handleHover(child.id, pos.x, pos.y, child.label, child.tooltip, on)}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>

            {/* Tooltip — desktop only (no hover on touch) */}
            <AnimatePresence>
                {!isMobile && tooltip && hovered && (
                    <Tooltip
                        key={hovered}
                        x={tooltip.x + cameraRef.current.x}
                        y={tooltip.y + cameraRef.current.y}
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
                                {isMobile ? 'Tap any node to explore →' : 'Click any node to explore →'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom hint */}
            <div className={`absolute left-5 pointer-events-none ${isMobile ? 'bottom-20' : 'bottom-5'}`}>
                <p className="font-mono text-[10px] text-muted/35 tracking-widest">
                    {isMobile
                        ? <>tap · <span style={{ color: 'rgba(61,227,255,0.4)' }}>pinch</span> to zoom</>
                        : <>click · <span style={{ color: 'rgba(61,227,255,0.4)' }}>↑↓</span> keys · <span className="text-accent/50">/</span> search · <span className="text-accent/50">?</span> help</>
                    }
                </p>
            </div>
        </div>
    );
};
