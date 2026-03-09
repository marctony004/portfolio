import { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe } from 'lucide-react';
import { SphereScene, type CamState, type IdlePulseData } from './SphereScene';
import { SphereInspector } from './SphereInspector';
import { GestureLayer } from './GestureLayer';
import { FocusMode } from './FocusMode';
import { sphereNodes, sphereEdges, EXPANDABLE_IDS } from '../../data/sphereGraph';
import { TEXT } from '../../theme';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const INITIAL_CAM: CamState = {
    theta: 0, phi: 1.18, distance: 6.5,
    targetTheta: 0, targetPhi: 1.18, targetDistance: 6.5,
};

const PREFERS_REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const WAVE_STAGGER = 85;
const WAVE_TRAVEL  = 420;
// Ordered top-to-bottom by Y position so wave sweeps down the sphere
const WAVE_DELAYS: Map<string, number> = (() => {
    const delays = new Map<string, number>();
    delays.set('marc-smith', 0);
    sphereNodes
        .filter(n => n.nodeType === 'orbit')
        .sort((a, b) => b.position[1] - a.position[1])
        .forEach((node, idx) => delays.set(node.id, idx * WAVE_STAGGER + WAVE_TRAVEL));
    return delays;
})();

interface Props { onClose: () => void; runWave?: boolean; }

const BrainSphere = ({ onClose, runWave = false }: Props) => {
    const [selectedId,  setSelectedId]  = useState<string | null>(null);
    const [expandedId,  setExpandedId]  = useState<string | null>(null);
    const [focusModeId, setFocusModeId] = useState<string | null>(null);
    const [waveActive,       setWaveActive]       = useState(false);
    const [depthVeilVisible, setDepthVeilVisible] = useState(false);
    const [isIdle,           setIsIdle]           = useState(false);
    const [idlePulse,        setIdlePulse]        = useState<IdlePulseData | null>(null);
    const [idleGlowTimes,    setIdleGlowTimes]    = useState<Map<string, number>>(new Map());
    const waveTimeRef       = useRef<number>(0);
    const waveRanRef        = useRef(false);
    const idleDetectRef     = useRef<ReturnType<typeof setTimeout> | null>(null); // idle detection only
    const pulseTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null); // pulse scheduling only
    const lastPulseEdgeRef  = useRef<string | null>(null);
    const lastSelectedIdRef = useRef<string | null>(null);

    // Resets the idle countdown — call on any user interaction
    const resetIdleTimer = useCallback(() => {
        setIsIdle(false);
        if (idleDetectRef.current) clearTimeout(idleDetectRef.current);
        idleDetectRef.current = setTimeout(() => setIsIdle(true), 6000 + Math.random() * 2000);
    }, []);

    // Fire one idle pulse along a random edge (context-aware if a node was recently visited)
    const fireIdlePulse = useCallback(() => {
        const topLevel = sphereNodes.filter(n => !n.parentId);
        const nodeMap  = new Map(topLevel.map(n => [n.id, n.position]));
        let candidates = sphereEdges.filter(e =>
            nodeMap.has(e.source) &&
            nodeMap.has(e.target) &&
            `${e.source}|${e.target}` !== lastPulseEdgeRef.current,
        );
        if (candidates.length === 0) {
            candidates = sphereEdges.filter(e => nodeMap.has(e.source) && nodeMap.has(e.target));
        }
        if (candidates.length === 0) return;

        // Context-aware: edges near the last selected node get 3× weight
        const lastNode   = lastSelectedIdRef.current ? sphereNodes.find(n => n.id === lastSelectedIdRef.current) : null;
        const relatedIds = new Set(lastNode?.relatedIds ?? []);
        const pool: typeof candidates = [];
        for (const e of candidates) {
            pool.push(e);
            if (relatedIds.has(e.source) || relatedIds.has(e.target)) pool.push(e, e);
        }

        const edge = pool[Math.floor(Math.random() * pool.length)];
        const from = nodeMap.get(edge.source)!;
        const to   = nodeMap.get(edge.target)!;
        const dur  = 400 + Math.random() * 300;
        const now  = performance.now();
        lastPulseEdgeRef.current = `${edge.source}|${edge.target}`;
        setIdlePulse({ from, to, startTime: now, duration: dur, key: String(now) });
        setIdleGlowTimes(new Map([[edge.source, now], [edge.target, now]]));
    }, []);

    // Start idle detection on mount; clean up on unmount
    useEffect(() => {
        resetIdleTimer();
        return () => {
            if (idleDetectRef.current) clearTimeout(idleDetectRef.current);
            if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
        };
    }, [resetIdleTimer]);

    // Pulse chain — starts when isIdle flips true, stops and clears when it flips false
    useEffect(() => {
        if (!isIdle || PREFERS_REDUCED) {
            if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
            return;
        }
        const scheduleNext = () => {
            pulseTimerRef.current = setTimeout(() => { fireIdlePulse(); scheduleNext(); }, 8000 + Math.random() * 7000);
        };
        pulseTimerRef.current = setTimeout(() => { fireIdlePulse(); scheduleNext(); }, 2000 + Math.random() * 2000);
        return () => { if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); };
    }, [isIdle, fireIdlePulse]);

    // Snapshot of constellation state saved before entering Focus Mode so we can restore it on exit
    const savedConstellationRef = useRef<{ expandedId: string | null; selectedId: string | null }>({
        expandedId: null,
        selectedId: null,
    });

    // Camera state — written by mouse/gesture/focus, read by SphereScene useFrame
    const camRef                  = useRef<CamState>({ ...INITIAL_CAM });
    const focusedNodeIdRef        = useRef<string | null>(null);
    const focusedNodeScreenPosRef = useRef<{ x: number; y: number } | null>(null);
    const focusedNodeLabelRef     = useRef<string | null>(null);
    const gestureCursorRef        = useRef<{ x: number; y: number } | null>(null);
    const hasDraggedRef           = useRef(false);
    const isDraggingRef    = useRef(false);
    const lastPtrRef       = useRef({ x: 0, y: 0 });

    // Neural activation wave + breath pulse — fire once when sphere is fully revealed
    useEffect(() => {
        if (!runWave || waveRanRef.current || PREFERS_REDUCED) return;
        waveRanRef.current = true;

        const timers: ReturnType<typeof setTimeout>[] = [];
        const later = (fn: () => void, ms: number) => {
            const t = setTimeout(fn, ms);
            timers.push(t);
        };

        // Wave activation + depth veil settle
        later(() => {
            waveTimeRef.current = performance.now();
            setWaveActive(true);
            setDepthVeilVisible(true);
        }, 350);

        // Wave ends
        later(() => setWaveActive(false), 350 + 2200);

        // Breath expand — sphere inhales very slightly (~1.06×)
        later(() => { camRef.current.targetDistance = INITIAL_CAM.distance - 0.38; }, 350 + 2200 + 220);

        // Breath return — settles back to resting distance
        later(() => { camRef.current.targetDistance = INITIAL_CAM.distance; }, 350 + 2200 + 220 + 540);

        return () => timers.forEach(clearTimeout);
    }, [runWave]);

    const selectedNode = sphereNodes.find(n => n.id === selectedId) ?? null;

    // Resolve relatedIds to display labels for the inspector's Related section
    const relatedLabels = selectedNode
        ? selectedNode.relatedIds
            .filter(id => id !== 'marc-smith') // skip center — redundant context
            .map(id => sphereNodes.find(n => n.id === id)?.label)
            .filter((l): l is string => !!l)
            .slice(0, 5)
        : [];

    // Smoothly rotate camera to face a node.
    // For child nodes we face the parent (children cluster around it).
    const focusOnNode = useCallback((nodeId: string) => {
        const node = sphereNodes.find(n => n.id === nodeId);
        if (!node) return;
        const targetId   = node.parentId ?? nodeId;
        const target     = sphereNodes.find(n => n.id === targetId) ?? node;
        if (target.nodeType === 'center') return;

        const [nx, ny, nz] = target.position;
        const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (nLen < 0.001) return;

        const c = camRef.current;
        c.targetTheta    = Math.atan2(nz, nx);
        c.targetPhi      = Math.acos(Math.max(-1, Math.min(1, ny / nLen)));
        c.targetDistance = 5.0;
    }, []);

    // ── Node selection ────────────────────────────────────────────────────────
    const handleSelect = useCallback((id: string) => {
        const node = sphereNodes.find(n => n.id === id);
        if (!node) return;
        resetIdleTimer();
        lastSelectedIdRef.current = id;

        // Center node — toggle "reveal all" overview mode:
        // first click expands project constellation + all capabilities appear;
        // second click collapses everything back to the clean sphere.
        if (id === 'marc-smith') {
            if (selectedId === 'marc-smith') {
                setSelectedId(null);
                setExpandedId(null);
            } else {
                setSelectedId('marc-smith');
                setExpandedId(null); // projects spread via overviewPosition, not constellation
            }
            return;
        }

        if (EXPANDABLE_IDS.has(id)) {
            // Expandable parent node
            if (expandedId === id) {
                // Second click collapses the constellation
                setExpandedId(null);
                setSelectedId(null);
            } else {
                setExpandedId(id);
                // Orbit node (e.g. 'projects'): expand constellation but skip the inspector —
                // the panel opens when the user clicks a specific child node instead.
                // Capability nodes: open inspector alongside the tool ring.
                setSelectedId(node.nodeType === 'capability' ? id : null);
                focusOnNode(id);
                // Pull back slightly so the constellation ring has viewport breathing room
                if (node.nodeType === 'orbit') camRef.current.targetDistance = 6.2;
            }
        } else if (node.parentId) {
            // Child node inside an open constellation — open inspector, keep cluster
            setSelectedId(id);
        } else {
            // Orbit node without children — collapse any open constellation, open inspector
            setExpandedId(null);
            setSelectedId(id);
            focusOnNode(id);
        }
    }, [expandedId, focusOnNode, resetIdleTimer]);

    const handleGestureSelect = useCallback((id: string) => {
        handleSelect(id);
    }, [handleSelect]);

    const handleGestureClose = useCallback(() => {
        setSelectedId(null);
        setExpandedId(null);
    }, []);

    // Clicking empty space deselects and collapses (only on clean click, not drag)
    const handlePointerMissed = useCallback(() => {
        if (!hasDraggedRef.current) {
            setSelectedId(null);
            setExpandedId(null);
        }
    }, []);

    // ── Mouse / trackpad controls ─────────────────────────────────────────────
    const onPointerDown = useCallback((e: React.PointerEvent) => {
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        lastPtrRef.current    = { x: e.clientX, y: e.clientY };
        resetIdleTimer();
        // Do NOT setPointerCapture here — it would redirect pointerup away from
        // the R3F canvas and break mesh onClick handlers. Capture only on real drag.
    }, [resetIdleTimer]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - lastPtrRef.current.x;
        const dy = e.clientY - lastPtrRef.current.y;
        lastPtrRef.current = { x: e.clientX, y: e.clientY };
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            hasDraggedRef.current = true;
            resetIdleTimer();
            // Capture only after confirmed drag so pointerup stays on the canvas
            // for plain clicks, keeping R3F mesh onClick working.
            const el = e.currentTarget as HTMLElement;
            if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
        }
        const c = camRef.current;
        c.targetTheta -= dx * 0.005;
        c.targetPhi    = clamp(c.targetPhi - dy * 0.005, 0.2, Math.PI - 0.2);
    }, [resetIdleTimer]);

    const onPointerUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    const onWheel = useCallback((e: React.WheelEvent) => {
        const c = camRef.current;
        c.targetDistance = clamp(c.targetDistance + e.deltaY * 0.006, 3, 9);
    }, []);

    // ── Focus Mode enter / exit ────────────────────────────────────────────────
    // Entering: save constellation state and collapse it so the sphere canvas
    // renders nothing behind the Focus Mode overlay (prevents WebGL bleed-through).
    const handleEnterFocusMode = useCallback((nodeId: string) => {
        savedConstellationRef.current = { expandedId, selectedId };
        setExpandedId(null);  // collapse constellation — hides sibling project nodes
        setSelectedId(null);  // close inspector panel
        setFocusModeId(nodeId);
        resetIdleTimer();
    }, [expandedId, selectedId, resetIdleTimer]);

    // Exiting: trigger the Focus Mode exit animation, then restore the constellation
    // after the animation fully completes (matches FocusMode transition duration: 0.55s).
    const handleExitFocusMode = useCallback(() => {
        setFocusModeId(null);
        const saved = savedConstellationRef.current;
        setTimeout(() => {
            setExpandedId(saved.expandedId);
            setSelectedId(saved.selectedId);
        }, 580);
    }, []);

    // ── Keyboard ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (focusModeId)     { handleExitFocusMode(); }
            else if (selectedId) { setSelectedId(null); }
            else if (expandedId) { setExpandedId(null); }
            else                 { onClose(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [focusModeId, selectedId, expandedId, handleExitFocusMode, onClose]);

    const hasActivity = !!(selectedId || expandedId);

    return (
        <motion.div
            className="fixed inset-0 z-[110] flex flex-col"
            style={{ background: '#0B1220' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-6 py-3.5 shrink-0 z-10"
                style={{
                    background:   'rgba(11,18,32,0.85)',
                    borderBottom: '1px solid rgba(61,227,255,0.1)',
                    backdropFilter: 'blur(12px)',
                    visibility:   focusModeId ? 'hidden' : 'visible',
                }}
            >
                <div className="flex items-center gap-3">
                    <Globe size={14} style={{ color: '#3DE3FF' }} />
                    <div>
                        <p className="font-sans font-semibold text-sm" style={{ color: TEXT }}>Brain Sphere</p>
                        <p className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(154,176,204,0.4)' }}>
                            {expandedId
                                ? 'constellation open · click a project · esc to collapse'
                                : '3D knowledge graph · drag to rotate · scroll to zoom · click nodes'
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasActivity && (
                        <button
                            onClick={() => { setSelectedId(null); setExpandedId(null); }}
                            className="font-mono text-[9px] px-3 py-1.5 rounded-full transition-colors"
                            style={{
                                border: '1px solid rgba(61,227,255,0.15)',
                                color: 'rgba(154,176,204,0.5)',
                                background: 'rgba(61,227,255,0.04)',
                            }}
                        >
                            Clear
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'rgba(154,176,204,0.4)', background: 'rgba(154,176,204,0.06)' }}
                        title="Exit (Esc)"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            {/* ── 3D Canvas area ──────────────────────────────────────────────── */}
            {/* visibility:hidden (not display:none) keeps the WebGL context alive so
                camera state is preserved; the canvas simply stops being composited
                into the visual layer while Focus Mode is active, preventing GPU
                bleed-through of global sphere nodes behind the Focus Mode overlay. */}
            <div
                className="flex-1 relative overflow-hidden"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onWheel={onWheel}
                style={{
                    cursor:     isDraggingRef.current ? 'grabbing' : 'grab',
                    visibility: focusModeId ? 'hidden' : 'visible',
                }}
            >
                <Canvas
                    camera={{ fov: 60, near: 0.1, far: 120, position: [0, 0, 6.5] }}
                    gl={{ antialias: true, alpha: true }}
                    style={{ position: 'absolute', inset: 0, background: 'transparent' }}
                    onPointerMissed={handlePointerMissed}
                >
                    <SphereScene
                        nodes={sphereNodes}
                        edges={sphereEdges}
                        selectedId={selectedId}
                        expandedId={expandedId}
                        onSelect={handleSelect}
                        camRef={camRef}
                        focusedNodeIdRef={focusedNodeIdRef}
                        focusedNodeScreenPosRef={focusedNodeScreenPosRef}
                        focusedNodeLabelRef={focusedNodeLabelRef}
                        gestureCursorRef={gestureCursorRef}
                        hasDraggedRef={hasDraggedRef}
                        idleRotate={!hasActivity}
                        waveTimeRef={waveTimeRef}
                        waveActive={waveActive}
                        waveDelays={WAVE_DELAYS}
                        idlePulse={idlePulse}
                        idleGlowTimes={idleGlowTimes}
                        onIdlePulseComplete={() => setIdlePulse(null)}
                    />
                </Canvas>

                {/* Spatial depth veil — radial vignette that settles as the sphere stabilizes.
                    Softens the far periphery and helps the sphere read as floating in depth. */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: 5,
                        background: 'radial-gradient(ellipse 80% 75% at 50% 52%, transparent 36%, rgba(7,13,26,0.28) 100%)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: depthVeilVisible ? 1 : 0 }}
                    transition={{ duration: 2.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
                />

                {/* Gesture overlay */}
                <GestureLayer
                    camRef={camRef}
                    focusedNodeIdRef={focusedNodeIdRef}
                    focusedNodeScreenPosRef={focusedNodeScreenPosRef}
                    focusedNodeLabelRef={focusedNodeLabelRef}
                    gestureCursorRef={gestureCursorRef}
                    onGestureSelect={handleGestureSelect}
                    onGestureClose={handleGestureClose}
                />

                {/* Inspector panel */}
                <SphereInspector
                    node={selectedNode}
                    onClose={() => setSelectedId(null)}
                    onEnterFocus={
                        selectedNode?.nodeType === 'project'
                            ? () => handleEnterFocusMode(selectedNode.id)
                            : undefined
                    }
                    relatedLabels={relatedLabels}
                />

                {/* Bottom-right hint */}
                <div className="absolute bottom-4 right-4 pointer-events-none">
                    <p className="font-mono text-[9px]" style={{ color: 'rgba(154,176,204,0.2)' }}>
                        drag · scroll · click
                    </p>
                </div>
            </div>
            {/* ── Focus Mode overlay ─────────────────────────────────────────── */}
            <AnimatePresence>
                {focusModeId && (
                    <FocusMode
                        key={focusModeId}
                        projectId={focusModeId}
                        onExit={handleExitFocusMode}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default BrainSphere;
