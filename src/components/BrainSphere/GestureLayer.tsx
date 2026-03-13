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

// Instruction chips — sphere mode
const CHIPS = [
    { gesture: 'Both palms open',          action: 'rotate + zoom' },
    { gesture: 'Left fist + move',         action: 'grab & rotate sphere' },
    { gesture: 'Left fist + right pinch²', action: 'scroll inspector' },
    { gesture: 'Pinch',                    action: 'select node' },
    { gesture: 'Victory ✌',               action: 'focus mode' },
    { gesture: 'Right fist',               action: 'close / deselect' },
];

// Focus mode gesture chips — shown in top-left during focus mode
const FOCUS_CHIPS = [
    { gesture: 'Both palms open', action: 'rotate view' },
    { gesture: 'Swipe',           action: 'exit focus mode' },
    { gesture: 'Left fist + hold', action: 'lock camera' },
    { gesture: 'Right fist',      action: 'close detail' },
];

interface GestureLayerProps {
    camRef:                  React.MutableRefObject<CamState>;
    focusedNodeIdRef:        React.MutableRefObject<string | null>;
    focusedNodeScreenPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
    focusedNodeLabelRef:     React.MutableRefObject<string | null>;
    gestureCursorRef:        React.MutableRefObject<{ x: number; y: number } | null>;
    isInFocusMode:           boolean;
    onGestureSelect:         (id: string) => void;
    onGestureClose:          () => void;   // right fist → close inspector / detail
    onGestureVictory:        () => void;
    onGestureDoublePinch:    () => void;
    onGestureSwipe:          () => void;   // fast swipe → dismiss focus mode
}

export function GestureLayer({
    camRef, focusedNodeIdRef, focusedNodeScreenPosRef, focusedNodeLabelRef,
    gestureCursorRef, isInFocusMode,
    onGestureSelect, onGestureClose, onGestureVictory, onGestureDoublePinch, onGestureSwipe,
}: GestureLayerProps) {
    const [perm, setPerm]             = useState<PermState>('idle');
    const [showHints, setShowHints]   = useState(false);
    const loadTimeoutRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reticleRef                  = useRef<HTMLDivElement>(null);
    const reticuleLabelRef            = useRef<HTMLSpanElement>(null);
    // Pinch charge ring + burst + victory toast — all imperative, no React state
    const pinchProgressRef            = useRef(0);
    const pinchChargeRef              = useRef<HTMLDivElement>(null);
    const burstRef                    = useRef<HTMLDivElement>(null);
    const victoryToastRef             = useRef<HTMLDivElement>(null);
    const victoryTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Left-fist drag — track previous wrist position + smoothed delta for camera control
    const leftFistPrevRef             = useRef<{ x: number; y: number } | null>(null);
    const leftFistSmoothRef           = useRef({ dx: 0, dy: 0 });

    const { videoRef, canvasRef, twoHandState, isLoading, start, stop } = useTwoHandGesture();

    // ── Apply gesture deltas to camera ref (no React state — runs every frame) ──
    useEffect(() => {
        const {
            hands, rotationDelta, zoomDelta, isActive, leftFistHeld,
            freshPinch, freshRightFist, freshVictory, freshDoublePinch, pinchProgress, swipeDetected,
        } = twoHandState;

        // Update pinch progress ref so the reticle tick loop can read it
        pinchProgressRef.current = pinchProgress;

        // Left fist held — drive camera with fist AND track right index finger for targeting
        if (leftFistHeld) {
            // Cursor follows right hand's index fingertip so nodes can still be targeted + selected
            const rightHand = hands.find(h => h.handedness === 'Right');
            if (rightHand) {
                const lms = rightHand.landmarks;
                gestureCursorRef.current = {
                    x:  1 - lms[8].x * 2,
                    y:  1 - lms[8].y * 2,
                };
            } else {
                gestureCursorRef.current = null;
            }

            const leftHand = hands.find(h => h.handedness === 'Left');
            if (leftHand && leftFistPrevRef.current) {
                // Raw wrist is in [0,1] camera space; display is scaleX(-1) so negate x delta
                const rawDx = -(leftHand.wrist.x - leftFistPrevRef.current.x) * 4.2;
                const rawDy = -(leftHand.wrist.y - leftFistPrevRef.current.y) * 4.2;
                const A = 0.28; // EWMA smoothing — same alpha as two-palm mode
                leftFistSmoothRef.current.dx = A * rawDx + (1 - A) * leftFistSmoothRef.current.dx;
                leftFistSmoothRef.current.dy = A * rawDy + (1 - A) * leftFistSmoothRef.current.dy;
                const c = camRef.current;
                c.targetTheta += leftFistSmoothRef.current.dx;
                c.targetPhi    = clamp(c.targetPhi + leftFistSmoothRef.current.dy, PHI_MIN, PHI_MAX);
            }
            leftFistPrevRef.current = leftHand
                ? { x: leftHand.wrist.x, y: leftHand.wrist.y }
                : null;
        } else {
            // Reset left-fist tracking when released
            leftFistPrevRef.current   = null;
            leftFistSmoothRef.current = { dx: 0, dy: 0 };
        }

        if (!leftFistHeld && isActive) {
            const c = camRef.current;
            c.targetTheta    += rotationDelta.dx;
            c.targetPhi       = clamp(c.targetPhi + rotationDelta.dy, PHI_MIN, PHI_MAX);
            c.targetDistance  = clamp(c.targetDistance - zoomDelta, DIST_MIN, DIST_MAX);
        } else if (!leftFistHeld && hands.length > 0) {
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

        // Pinch selects node — suppressed only in focus mode
        if (freshPinch && focusedNodeIdRef.current && !isInFocusMode) {
            onGestureSelect(focusedNodeIdRef.current);
            // Radial burst — expand + fade from the reticle center
            const b = burstRef.current;
            if (b) {
                b.style.transition = 'none';
                b.style.opacity = '0.9';
                b.style.transform = 'translate(-50%, -50%) scale(1)';
                void b.offsetWidth;
                b.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                b.style.opacity = '0';
                b.style.transform = 'translate(-50%, -50%) scale(3.2)';
            }
        }

        // Right fist closes inspector / focus detail
        if (freshRightFist) {
            onGestureClose();
        }

        if (freshVictory) {
            onGestureVictory();
            const t = victoryToastRef.current;
            if (t) {
                if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
                t.style.transition = 'none';
                t.style.opacity = '1';
                void t.offsetWidth;
                t.style.transition = 'opacity 0.25s ease-in';
                victoryTimerRef.current = setTimeout(() => {
                    if (victoryToastRef.current) {
                        victoryToastRef.current.style.transition = 'opacity 0.55s ease-out';
                        victoryToastRef.current.style.opacity = '0';
                    }
                }, 1200);
            }
        }

        // Double pinch scrolls inspector only when left fist is held (sphere locked)
        if (freshDoublePinch && leftFistHeld) {
            onGestureDoublePinch();
        }

        if (swipeDetected) {
            onGestureSwipe();
        }
    }, [twoHandState, camRef, focusedNodeIdRef, gestureCursorRef, isInFocusMode, onGestureSelect, onGestureClose, onGestureVictory, onGestureDoublePinch, onGestureSwipe]);

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
            // Pinch charge ring — scale down and brighten as pinch threshold approaches
            if (pinchChargeRef.current) {
                const prog = pinchProgressRef.current;
                pinchChargeRef.current.style.opacity   = String(prog * 0.95);
                pinchChargeRef.current.style.transform =
                    `translate(-50%, -50%) scale(${1 - prog * 0.38})`;
                pinchChargeRef.current.style.borderWidth = `${1 + prog * 3.5}px`;
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
        if (loadTimeoutRef.current)  clearTimeout(loadTimeoutRef.current);
        if (victoryTimerRef.current) clearTimeout(victoryTimerRef.current);
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

    const { hands, isActive, leftFistHeld } = twoHandState;
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
                {/* Outer pulsing ring */}
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
                {/* Pinch charge ring — shrinks + brightens as thumb+index approach threshold */}
                <div
                    ref={pinchChargeRef}
                    style={{
                        position: 'absolute',
                        width: 36, height: 36,
                        borderRadius: '50%',
                        border: `1px solid rgba(255,255,255,0.9)`,
                        boxShadow: '0 0 14px rgba(255,255,255,0.55)',
                        transform: 'translate(-50%, -50%) scale(1)',
                        opacity: 0,
                        pointerEvents: 'none',
                    }}
                />
                {/* Select confirmation burst — radial expand+fade on pinch fire */}
                <div
                    ref={burstRef}
                    style={{
                        position: 'absolute',
                        width: 36, height: 36,
                        borderRadius: '50%',
                        border: `2px solid ${ACCENT}`,
                        boxShadow: `0 0 22px rgba(61,227,255,0.75)`,
                        transform: 'translate(-50%, -50%) scale(1)',
                        opacity: 0,
                        pointerEvents: 'none',
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

            {/* ── Victory toast — briefly confirms focus mode trigger ── */}
            <div
                ref={victoryToastRef}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: '42%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: 25,
                    background: 'rgba(11,18,32,0.90)',
                    border: `1px solid rgba(61,227,255,0.3)`,
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontFamily: 'monospace',
                    fontSize: 10,
                    color: ACCENT,
                    backdropFilter: 'blur(8px)',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.05em',
                    boxShadow: '0 0 20px rgba(61,227,255,0.12)',
                }}
            >
                ✌ Entering Focus Mode
            </div>

            {/* ── Two-palm rotation arc — subtle indicator when both palms control the sphere ── */}
            <AnimatePresence>
                {perm === 'granted' && !isLoading && isActive && (
                    <motion.div
                        key="rotation-arc"
                        aria-hidden="true"
                        className="absolute pointer-events-none"
                        style={{ top: '50%', left: '50%', zIndex: 15 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {/* Two counter-rotating dashed arcs suggest sphere being "held" */}
                        <motion.svg
                            width="110" height="110" viewBox="0 0 110 110"
                            style={{ transform: 'translate(-50%, -50%)', overflow: 'visible' }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                        >
                            <circle cx="55" cy="55" r="44" fill="none"
                                stroke={ACCENT} strokeWidth="0.8"
                                strokeDasharray="28 248" opacity="0.32" />
                            <circle cx="55" cy="55" r="44" fill="none"
                                stroke={ACCENT} strokeWidth="0.8"
                                strokeDasharray="28 248" strokeDashoffset="138" opacity="0.32" />
                        </motion.svg>
                        <motion.svg
                            width="110" height="110" viewBox="0 0 110 110"
                            style={{ position: 'absolute', top: 0, left: 0, transform: 'translate(-50%, -50%)', overflow: 'visible' }}
                            animate={{ rotate: -360 }}
                            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
                        >
                            <circle cx="55" cy="55" r="44" fill="none"
                                stroke={ACCENT} strokeWidth="0.6"
                                strokeDasharray="12 264" opacity="0.18" />
                        </motion.svg>
                        <span style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontFamily: 'monospace',
                            fontSize: 8,
                            color: ACCENT,
                            opacity: 0.45,
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.1em',
                            pointerEvents: 'none',
                        }}>
                            rotating
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Status footer — single AnimatePresence, keyed by state ── */}
            <AnimatePresence mode="wait">
                {statusKey === 'idle' && (
                    <motion.div
                        key="idle"
                        className="absolute bottom-4 left-4 flex flex-col gap-1"
                        style={{ pointerEvents: 'auto' }}
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
                        style={{ pointerEvents: 'auto' }}
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
                        style={{ pointerEvents: 'auto' }}
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
                        style={{ pointerEvents: 'auto' }}
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

            {/* ── Focus Mode gesture hints — top-left corner ── */}
            <AnimatePresence>
                {isInFocusMode && perm === 'granted' && !isLoading && (
                    <motion.div
                        key="focus-hints"
                        className="absolute top-4 left-4 flex flex-col gap-1"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                    >
                        <p className="font-mono text-[8px] uppercase tracking-widest mb-0.5"
                            style={{ color: 'rgba(154,176,204,0.35)' }}>
                            focus gestures
                        </p>
                        {FOCUS_CHIPS.map(({ gesture, action }) => (
                            <div
                                key={gesture}
                                className="flex items-center gap-2 font-mono text-[9px]"
                                style={{
                                    background:   'rgba(11,18,32,0.82)',
                                    border:       '1px solid rgba(61,227,255,0.08)',
                                    borderRadius: 5,
                                    padding:      '3px 8px',
                                    color:        'rgba(154,176,204,0.5)',
                                    backdropFilter: 'blur(8px)',
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

            {/* ── Active HUD (hand count + disable button) ── */}
            <AnimatePresence>
                {perm === 'granted' && !isLoading && (
                    <motion.div
                        className="absolute top-4 left-4 flex flex-col gap-1.5"
                        style={{ pointerEvents: 'auto' }}
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
                                    : leftFistHeld
                                        ? 'left fist — grab rotating'
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
