import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, Loader, AlertTriangle, X } from 'lucide-react';
import { useTwoHandGesture } from '../../hooks/useTwoHandGesture';
import { ACCENT, MUTED } from '../../theme';
import type { CamState } from './SphereScene';

type PermState = 'idle' | 'loading' | 'granted' | 'denied' | 'error' | 'timeout';

const PHI_MIN = 0.2;
const PHI_MAX = Math.PI - 0.2;
const DIST_MIN = 3;
const DIST_MAX = 9;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const LOAD_TIMEOUT_MS = 12_000;

// Instruction chips — shown briefly after activation, then auto-dismissed
const CHIPS = [
    { gesture: 'Both palms open', action: 'rotate + zoom' },
    { gesture: 'Pinch (thumb + index)', action: 'select node' },
    { gesture: 'Closed fist', action: 'close / deselect' },
];

interface GestureLayerProps {
    camRef:                  React.MutableRefObject<CamState>;
    focusedNodeIdRef:        React.MutableRefObject<string | null>;
    focusedNodeScreenPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
    focusedNodeLabelRef:     React.MutableRefObject<string | null>;
    gestureCursorRef:        React.MutableRefObject<{ x: number; y: number } | null>;
    onGestureSelect:         (id: string) => void;
    onGestureClose:          () => void;
}

export function GestureLayer({
    camRef, focusedNodeIdRef, focusedNodeScreenPosRef, focusedNodeLabelRef,
    gestureCursorRef, onGestureSelect, onGestureClose,
}: GestureLayerProps) {
    const [perm, setPerm]             = useState<PermState>('idle');
    const [showHints, setShowHints]   = useState(false);
    const loadTimeoutRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reticleRef                  = useRef<HTMLDivElement>(null);
    const reticuleLabelRef            = useRef<HTMLSpanElement>(null);

    const { videoRef, canvasRef, twoHandState, isLoading, start, stop } = useTwoHandGesture();

    // ── Apply gesture deltas to camera ref (no React state — runs every frame) ──
    useEffect(() => {
        const { hands, rotationDelta, zoomDelta, isActive, freshPinch, freshFist } = twoHandState;

        if (isActive) {
            const c = camRef.current;
            c.targetTheta    += rotationDelta.dx;
            c.targetPhi       = clamp(c.targetPhi + rotationDelta.dy, PHI_MIN, PHI_MAX);
            c.targetDistance  = clamp(c.targetDistance - zoomDelta, DIST_MIN, DIST_MAX);
            // Freeze cursor while rotating — don't change targeting during two-hand mode
        } else if (hands.length > 0) {
            // Use index fingertip (landmark 8) of first visible hand as the targeting cursor.
            // Landmarks are in [0,1] space relative to the raw camera image.
            // The canvas is displayed scaleX(-1), so mirror-correct to screen NDC:
            //   ndcX: x=0 (raw left) → appears right on screen → ndcX=+1
            //   ndcY: y=0 (raw top)  → ndcY=+1
            const lms = hands[0].landmarks;
            gestureCursorRef.current = {
                x:  1 - lms[8].x * 2,
                y:  1 - lms[8].y * 2,
            };
        } else {
            gestureCursorRef.current = null;
        }

        if (freshPinch && focusedNodeIdRef.current) {
            onGestureSelect(focusedNodeIdRef.current);
        }

        if (freshFist) {
            onGestureClose();
        }
    }, [twoHandState, camRef, focusedNodeIdRef, gestureCursorRef, onGestureSelect, onGestureClose]);

    // ── Targeting reticle — direct DOM mutation, runs every frame ──
    useEffect(() => {
        if (perm !== 'granted') return;
        let raf: number;
        const tick = () => {
            const pos   = focusedNodeScreenPosRef.current;
            const label = focusedNodeLabelRef.current;
            if (reticleRef.current) {
                if (pos) {
                    reticleRef.current.style.left    = `${((pos.x + 1) / 2) * 100}%`;
                    reticleRef.current.style.top     = `${((1 - pos.y) / 2) * 100}%`;
                    reticleRef.current.style.opacity = '1';
                } else {
                    reticleRef.current.style.opacity = '0';
                }
            }
            if (reticuleLabelRef.current) {
                reticuleLabelRef.current.textContent = label ?? '';
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [perm]);

    // Show hints when gesture mode activates
    useEffect(() => {
        if (perm === 'granted' && !isLoading) setShowHints(true);
    }, [perm, isLoading]);

    useEffect(() => () => {
        stop();
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    }, [stop]);

    const handleEnable = useCallback(async () => {
        setPerm('loading');
        loadTimeoutRef.current = setTimeout(() => setPerm('timeout'), LOAD_TIMEOUT_MS);
        const result = await start();
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        if (result === 'granted') setPerm('granted');
        else if (result === 'denied') setPerm('denied');
        else setPerm('error');
    }, [start]);

    const handleDisable = useCallback(() => {
        stop();
        setPerm('idle');
        setShowHints(false);
    }, [stop]);

    const { hands, isActive } = twoHandState;
    const handCount = hands.length;

    // Determine what the status footer should show — mutually exclusive states
    const statusKey =
        perm === 'idle'                       ? 'idle'
        : (perm === 'loading' || isLoading)   ? 'loading'
        : (perm === 'denied')                 ? 'denied'
        : (perm === 'error' || perm === 'timeout') ? 'error'
        : null; // 'granted' — no footer

    return (
        <>
            {/* ── MediaPipe video source (hidden) ── */}
            <video ref={videoRef} autoPlay muted playsInline style={{ display: 'none' }} />

            {/* ── Full-screen hand skeleton overlay ── */}
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    transform: 'scaleX(-1)',
                    display: perm === 'granted' ? 'block' : 'none',
                    pointerEvents: 'none',
                    opacity: 0.9,
                }}
            />

            {/* ── Targeting reticle — follows focused node ── */}
            <div
                ref={reticleRef}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    opacity: 0,
                    transition: 'opacity 0.25s',
                    zIndex: 20,
                    display: perm === 'granted' && !isLoading ? 'block' : 'none',
                }}
            >
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.35, 0.7] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        position: 'absolute',
                        width: 36, height: 36,
                        borderRadius: '50%',
                        border: `1.5px solid ${ACCENT}`,
                        boxShadow: `0 0 10px rgba(61,227,255,0.3)`,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
                <span
                    ref={reticuleLabelRef}
                    style={{
                        position: 'absolute',
                        top: 20, left: '50%',
                        transform: 'translateX(-50%)',
                        fontFamily: 'monospace',
                        fontSize: 9,
                        color: ACCENT,
                        whiteSpace: 'nowrap',
                        textShadow: '0 0 10px rgba(61,227,255,0.5)',
                    }}
                />
            </div>

            {/* ── Status footer — single AnimatePresence, keyed by state ── */}
            <AnimatePresence mode="wait">
                {statusKey === 'idle' && (
                    <motion.div
                        key="idle"
                        className="absolute bottom-4 left-4 flex flex-col gap-1"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    >
                        <motion.button
                            onClick={handleEnable}
                            className="flex items-center gap-2 font-mono text-[10px] px-3 py-2 rounded-full"
                            style={{
                                background: 'rgba(11,18,32,0.9)',
                                border: `1px solid rgba(61,227,255,0.2)`,
                                color: MUTED,
                                backdropFilter: 'blur(10px)',
                            }}
                            whileHover={{ borderColor: 'rgba(61,227,255,0.45)', color: ACCENT }}
                            whileTap={{ scale: 0.97 }}
                            aria-label="Enable gesture control — rotates and selects nodes using your hands"
                        >
                            <Hand size={11} aria-hidden="true" style={{ color: ACCENT }} />
                            Enable Gesture Control
                        </motion.button>
                        <p className="font-mono text-[8px] pl-1" style={{ color: 'rgba(154,176,204,0.3)' }}>
                            Camera used locally — no data leaves your device
                        </p>
                    </motion.div>
                )}

                {statusKey === 'loading' && (
                    <motion.div
                        key="loading"
                        className="absolute bottom-4 left-4 flex flex-col gap-1"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color: MUTED }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                                aria-hidden="true"
                            >
                                <Loader size={12} style={{ color: ACCENT }} />
                            </motion.div>
                            Loading gesture model…
                        </div>
                        <p className="font-mono text-[8px] pl-5" style={{ color: 'rgba(154,176,204,0.3)' }}>
                            First load may take a few seconds
                        </p>
                    </motion.div>
                )}

                {statusKey === 'denied' && (
                    <motion.div
                        key="denied"
                        className="absolute bottom-4 left-4 flex items-center gap-2"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <AlertTriangle size={12} aria-hidden="true" style={{ color: '#FFAE42' }} />
                        <span className="font-mono text-[10px]" style={{ color: 'rgba(154,176,204,0.5)' }}>
                            Camera denied —
                        </span>
                        <button
                            onClick={handleEnable}
                            className="font-mono text-[10px] underline"
                            style={{ color: ACCENT }}
                        >
                            try again
                        </button>
                    </motion.div>
                )}

                {statusKey === 'error' && (
                    <motion.div
                        key="error"
                        className="absolute bottom-4 left-4 flex items-center gap-2"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <AlertTriangle size={12} aria-hidden="true" style={{ color: '#FFAE42' }} />
                        <span className="font-mono text-[10px]" style={{ color: 'rgba(154,176,204,0.5)' }}>
                            {perm === 'timeout' ? 'Model load timed out —' : 'Gesture unavailable —'}
                        </span>
                        <button
                            onClick={handleEnable}
                            className="font-mono text-[10px] underline"
                            style={{ color: ACCENT }}
                        >
                            retry
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Active HUD (hand count + disable button) ── */}
            <AnimatePresence>
                {perm === 'granted' && !isLoading && (
                    <motion.div
                        className="absolute top-4 left-4 flex flex-col gap-1.5"
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {/* Hand status + disable toggle */}
                        <div className="flex items-center gap-2">
                            <div
                                className="flex items-center gap-2 font-mono text-[9px]"
                                style={{
                                    background: 'rgba(11,18,32,0.82)',
                                    border: `1px solid ${handCount > 0 ? 'rgba(61,227,255,0.28)' : 'rgba(61,227,255,0.1)'}`,
                                    borderRadius: 6, padding: '4px 10px',
                                    color: handCount > 0 ? ACCENT : MUTED,
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                <Hand size={9} aria-hidden="true" />
                                {handCount === 0
                                    ? 'No hands detected'
                                    : isActive
                                        ? '2 hands — controlling'
                                        : `${handCount} hand${handCount > 1 ? 's' : ''} detected`}
                            </div>
                            <button
                                onClick={handleDisable}
                                title="Disable gesture control"
                                aria-label="Disable gesture control"
                                className="flex items-center justify-center rounded"
                                style={{
                                    background: 'rgba(11,18,32,0.82)',
                                    border: '1px solid rgba(61,227,255,0.1)',
                                    color: 'rgba(154,176,204,0.4)',
                                    width: 22, height: 22,
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                <X size={9} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Instruction chips */}
                        <AnimatePresence>
                            {showHints && (
                                <motion.div
                                    className="flex flex-col gap-1"
                                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                >
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-mono text-[8px]" style={{ color: 'rgba(154,176,204,0.3)' }}>
                                            gestures
                                        </span>
                                        <button
                                            onClick={() => setShowHints(false)}
                                            aria-label="Dismiss gesture instructions"
                                            style={{ color: 'rgba(154,176,204,0.3)', lineHeight: 1 }}
                                        >
                                            <X size={9} aria-hidden="true" />
                                        </button>
                                    </div>
                                    {CHIPS.map(({ gesture, action }) => (
                                        <div
                                            key={gesture}
                                            className="flex items-center gap-2 font-mono text-[9px]"
                                            style={{
                                                background: 'rgba(11,18,32,0.75)',
                                                border: '1px solid rgba(61,227,255,0.08)',
                                                borderRadius: 5, padding: '3px 8px',
                                                color: 'rgba(154,176,204,0.5)',
                                            }}
                                        >
                                            <span style={{ color: ACCENT }}>{gesture}</span>
                                            <span style={{ color: 'rgba(154,176,204,0.3)' }}>→</span>
                                            {action}
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
