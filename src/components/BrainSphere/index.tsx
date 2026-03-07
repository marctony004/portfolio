import { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { X, Globe } from 'lucide-react';
import { SphereScene, type CamState } from './SphereScene';
import { SphereInspector } from './SphereInspector';
import { GestureLayer } from './GestureLayer';
import { sphereNodes, sphereEdges } from '../../data/sphereGraph';
import { TEXT } from '../../theme';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const INITIAL_CAM: CamState = {
    theta: 0, phi: 1.18, distance: 6.5,
    targetTheta: 0, targetPhi: 1.18, targetDistance: 6.5,
};

interface Props { onClose: () => void; }

const BrainSphere = ({ onClose }: Props) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Camera state — written by mouse/gesture, read by SphereScene useFrame
    const camRef            = useRef<CamState>({ ...INITIAL_CAM });
    const focusedNodeIdRef  = useRef<string | null>(null);
    const hasDraggedRef     = useRef(false);
    const isDraggingRef     = useRef(false);
    const lastPtrRef        = useRef({ x: 0, y: 0 });

    const selectedNode = sphereNodes.find(n => n.id === selectedId) ?? null;

    // ── Mouse / trackpad controls ─────────────────────────────────────────────
    const onPointerDown = useCallback((e: React.PointerEvent) => {
        isDraggingRef.current  = true;
        hasDraggedRef.current  = false;
        lastPtrRef.current     = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - lastPtrRef.current.x;
        const dy = e.clientY - lastPtrRef.current.y;
        lastPtrRef.current = { x: e.clientX, y: e.clientY };
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) hasDraggedRef.current = true;
        const c = camRef.current;
        c.targetTheta -= dx * 0.005;
        c.targetPhi    = clamp(c.targetPhi - dy * 0.005, 0.2, Math.PI - 0.2);
    }, []);

    const onPointerUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    const onWheel = useCallback((e: React.WheelEvent) => {
        const c = camRef.current;
        c.targetDistance = clamp(c.targetDistance + e.deltaY * 0.006, 3, 9);
    }, []);

    // Escape key closes inspector or exits
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedId) setSelectedId(null);
                else onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedId, onClose]);

    const handleSelect = useCallback((id: string) => {
        setSelectedId(prev => prev === id ? null : id);
    }, []);

    const handleGestureSelect = useCallback((id: string) => {
        setSelectedId(id);
    }, []);

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
                    background: 'rgba(11,18,32,0.85)',
                    borderBottom: '1px solid rgba(61,227,255,0.1)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="flex items-center gap-3">
                    <Globe size={14} style={{ color: '#3DE3FF' }} />
                    <div>
                        <p className="font-sans font-semibold text-sm" style={{ color: TEXT }}>Brain Sphere</p>
                        <p className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(154,176,204,0.4)' }}>
                            3D knowledge graph · drag to rotate · scroll to zoom · click nodes
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {selectedId && (
                        <button
                            onClick={() => setSelectedId(null)}
                            className="font-mono text-[9px] px-3 py-1.5 rounded-full transition-colors"
                            style={{
                                border: '1px solid rgba(61,227,255,0.15)',
                                color: 'rgba(154,176,204,0.5)',
                                background: 'rgba(61,227,255,0.04)',
                            }}
                        >
                            Clear selection
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
            <div
                className="flex-1 relative overflow-hidden"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onWheel={onWheel}
                style={{ cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
            >
                <Canvas
                    camera={{ fov: 60, near: 0.1, far: 120, position: [0, 0, 6.5] }}
                    gl={{ antialias: true, alpha: true }}
                    style={{ position: 'absolute', inset: 0, background: 'transparent' }}
                >
                    <SphereScene
                        nodes={sphereNodes}
                        edges={sphereEdges}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        camRef={camRef}
                        focusedNodeIdRef={focusedNodeIdRef}
                        hasDraggedRef={hasDraggedRef}
                        idleRotate={!selectedId}
                    />
                </Canvas>

                {/* Gesture overlay — rendered as HTML on top of canvas */}
                <GestureLayer
                    camRef={camRef}
                    focusedNodeIdRef={focusedNodeIdRef}
                    onGestureSelect={handleGestureSelect}
                />

                {/* Inspector panel */}
                <SphereInspector node={selectedNode} onClose={() => setSelectedId(null)} />

                {/* Bottom-right mouse hint */}
                <div className="absolute bottom-4 right-4 pointer-events-none">
                    <p className="font-mono text-[9px]" style={{ color: 'rgba(154,176,204,0.2)' }}>
                        drag · scroll · click
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default BrainSphere;
