import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand, Loader, AlertTriangle } from 'lucide-react';
import { useTwoHandGesture } from '../../hooks/useTwoHandGesture';
import { ACCENT, MUTED } from '../../theme';
import type { CamState } from './SphereScene';

type PermState = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Props {
    camRef:           React.MutableRefObject<CamState>;
    focusedNodeIdRef: React.MutableRefObject<string | null>;
    onGestureSelect:  (id: string) => void;
}

export function GestureLayer({ camRef, focusedNodeIdRef, onGestureSelect }: Props) {
    const [perm, setPerm] = useState<PermState>('idle');
    const { videoRef, canvasRef, twoHandState, isLoading, start, stop } = useTwoHandGesture();

    // Apply gesture deltas to camera ref (no React state — runs every frame)
    const prevActiveRef = useRef(false);
    useEffect(() => {
        const { rotationDelta, zoomDelta, isActive, freshPinch } = twoHandState;

        if (isActive) {
            const c = camRef.current;
            c.targetTheta += rotationDelta.dx;
            c.targetPhi    = clamp(c.targetPhi + rotationDelta.dy, 0.2, Math.PI - 0.2);
            c.targetDistance = clamp(c.targetDistance - zoomDelta, 3, 9);
        }

        if (freshPinch && focusedNodeIdRef.current) {
            onGestureSelect(focusedNodeIdRef.current);
        }

        prevActiveRef.current = isActive;
    }, [twoHandState, camRef, focusedNodeIdRef, onGestureSelect]);

    useEffect(() => () => stop(), [stop]);

    const handleEnable = useCallback(async () => {
        setPerm('loading');
        const result = await start();
        setPerm(result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'error');
    }, [start]);

    const { hands, isActive } = twoHandState;
    const handCount = hands.length;

    return (
        <>
            {/* ── Always-mounted video (gesture hook needs this as MediaPipe source) ── */}
            <video
                ref={videoRef} autoPlay muted playsInline
                style={{ display: 'none' }}
            />
            {/* ── Full-screen hand skeleton overlay ── */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    transform: 'scaleX(-1)',
                    display: perm === 'granted' ? 'block' : 'none',
                    pointerEvents: 'none',
                    opacity: 0.9,
                }}
            />

            {/* ── Idle prompt ── */}
            <AnimatePresence>
                {perm === 'idle' && (
                    <motion.div
                        className="absolute bottom-4 left-4 flex items-center gap-2"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    >
                        <motion.button
                            onClick={handleEnable}
                            className="flex items-center gap-2 font-mono text-[10px] px-3 py-2 rounded-full"
                            style={{
                                background: 'rgba(11,18,32,0.9)',
                                border: '1px solid rgba(61,227,255,0.2)',
                                color: MUTED,
                                backdropFilter: 'blur(10px)',
                            }}
                            whileHover={{ borderColor: 'rgba(61,227,255,0.45)', color: ACCENT }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <Hand size={11} style={{ color: ACCENT }} />
                            Enable Gesture Control
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Loading ── */}
            <AnimatePresence>
                {(perm === 'loading' || isLoading) && (
                    <motion.div
                        className="absolute bottom-4 left-4 flex items-center gap-2 font-mono text-[10px]"
                        style={{ color: MUTED }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}>
                            <Loader size={12} style={{ color: ACCENT }} />
                        </motion.div>
                        Loading gesture model…
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Denied / Error ── */}
            <AnimatePresence>
                {(perm === 'denied' || perm === 'error') && (
                    <motion.div
                        className="absolute bottom-4 left-4 flex items-center gap-2 font-mono text-[10px]"
                        style={{ color: 'rgba(154,176,204,0.5)' }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <AlertTriangle size={12} style={{ color: '#FFAE42' }} />
                        {perm === 'denied' ? 'Camera denied — explore with mouse.' : 'Gesture unavailable — explore with mouse.'}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Active gesture HUD ── */}
            <AnimatePresence>
                {perm === 'granted' && !isLoading && (
                    <motion.div
                        className="absolute top-4 left-4 space-y-1.5"
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        {/* Hand count badge */}
                        <div className="flex items-center gap-2 font-mono text-[9px]"
                            style={{
                                background: 'rgba(11,18,32,0.82)',
                                border: `1px solid ${handCount > 0 ? 'rgba(61,227,255,0.28)' : 'rgba(61,227,255,0.1)'}`,
                                borderRadius: 6, padding: '4px 10px',
                                color: handCount > 0 ? ACCENT : MUTED,
                                backdropFilter: 'blur(8px)',
                            }}>
                            <Hand size={9} />
                            {handCount === 0 ? 'No hands detected' : handCount === 1 ? '1 hand' : '2 hands — controlling'}
                        </div>

                        {/* Instruction chips */}
                        <div className="flex flex-col gap-1">
                            {[
                                { icon: '🖐🖐', label: 'Both palms open → rotate · zoom' },
                                { icon: '👌', label: 'Pinch → select focused node' },
                            ].map(({ icon, label }) => (
                                <div key={label} className="flex items-center gap-1.5 font-mono text-[9px]"
                                    style={{
                                        background: 'rgba(11,18,32,0.75)',
                                        border: '1px solid rgba(61,227,255,0.08)',
                                        borderRadius: 5, padding: '3px 8px',
                                        color: 'rgba(154,176,204,0.5)',
                                    }}>
                                    <span style={{ fontSize: 10 }}>{icon}</span> {label}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Focus reticle — tiny crosshair at screen center */}
            {perm === 'granted' && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div style={{ position: 'relative', width: 24, height: 24 }}>
                        {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx, sy], i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                width: 6, height: 6,
                                borderTop:    sy < 0 ? '1px solid rgba(61,227,255,0.45)' : 'none',
                                borderBottom: sy > 0 ? '1px solid rgba(61,227,255,0.45)' : 'none',
                                borderLeft:   sx < 0 ? '1px solid rgba(61,227,255,0.45)' : 'none',
                                borderRight:  sx > 0 ? '1px solid rgba(61,227,255,0.45)' : 'none',
                                top:  sy < 0 ? 0 : 'auto', bottom: sy > 0 ? 0 : 'auto',
                                left: sx < 0 ? 0 : 'auto', right:  sx > 0 ? 0 : 'auto',
                            }} />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
