import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Hand, ChevronLeft, ChevronRight, AlertTriangle, Loader } from 'lucide-react';
import { useGestureDetection } from '../hooks/useGestureDetection';
import { PROJECTS_CHILDREN } from './brainMapConstants';
import { ACCENT, MUTED, TEXT } from '../theme';

type PermissionState = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

interface GestureBadgeProps { label: string; active: boolean; icon: string; }
const GestureBadge = ({ label, active, icon }: GestureBadgeProps) => (
    <motion.div
        className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-[10px]"
        animate={{ opacity: active ? 1 : 0.4, scale: active ? 1.04 : 1 }}
        transition={{ duration: 0.15 }}
        style={{
            background: active ? 'rgba(61,227,255,0.12)' : 'rgba(61,227,255,0.04)',
            border: `1px solid ${active ? 'rgba(61,227,255,0.4)' : 'rgba(61,227,255,0.1)'}`,
            color: active ? ACCENT : MUTED,
            boxShadow: active ? '0 0 16px rgba(61,227,255,0.2)' : 'none',
        }}
    >
        <span style={{ fontSize: 14 }}>{icon}</span>
        {label}
    </motion.div>
);

// ── Project card ──────────────────────────────────────────────────────────────
interface ProjectCardProps {
    label: string;
    summary: string;
    active: boolean;
}
const ProjectCard = ({ label, summary, active }: ProjectCardProps) => (
    <motion.div
        className="rounded-xl p-4 space-y-1.5"
        animate={{ opacity: active ? 1 : 0.28, scale: active ? 1 : 0.94 }}
        transition={{ duration: 0.25 }}
        style={{
            background: active ? 'rgba(61,227,255,0.07)' : 'rgba(61,227,255,0.02)',
            border: `1px solid ${active ? 'rgba(61,227,255,0.28)' : 'rgba(61,227,255,0.07)'}`,
            boxShadow: active ? '0 0 32px rgba(61,227,255,0.08)' : 'none',
        }}
    >
        <p className="font-sans font-semibold text-sm" style={{ color: active ? TEXT : MUTED }}>{label}</p>
        <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(154,176,204,0.65)' }}>{summary}</p>
    </motion.div>
);

// ── Idle / permission prompt screen ──────────────────────────────────────────
const IdleScreen = ({ onStart }: { onStart: () => void }) => (
    <motion.div
        className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className="relative">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(61,227,255,0.07)', border: '1px solid rgba(61,227,255,0.2)' }}>
                <Hand size={32} style={{ color: ACCENT }} />
            </div>
            <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ border: '1px solid rgba(61,227,255,0.35)' }}
            />
        </div>

        <div className="space-y-2">
            <h3 className="font-sans font-semibold text-lg" style={{ color: TEXT }}>No Strings Attached</h3>
            <p className="font-mono text-xs leading-relaxed" style={{ color: MUTED }}>
                Control this portfolio with hand gestures — the same CV tech powering this project.
            </p>
            <p className="font-mono text-[9px] tracking-wide" style={{ color: 'rgba(154,176,204,0.4)' }}>
                Webcam required · runs entirely in your browser · no data leaves your device
            </p>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
            {[
                { icon: '🖐', label: 'Hold · pause' },
                { icon: '👌', label: 'Pinch · select' },
                { icon: '👈', label: 'Swipe · next/prev' },
            ].map(g => (
                <div key={g.label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg"
                    style={{ background: 'rgba(61,227,255,0.04)', border: '1px solid rgba(61,227,255,0.1)' }}>
                    <span style={{ fontSize: 20 }}>{g.icon}</span>
                    <span className="font-mono text-[9px] text-center" style={{ color: 'rgba(154,176,204,0.5)' }}>{g.label}</span>
                </div>
            ))}
        </div>

        <motion.button
            onClick={onStart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-xs"
            style={{
                background: 'rgba(61,227,255,0.1)',
                border: '1px solid rgba(61,227,255,0.3)',
                color: ACCENT,
            }}
            whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(61,227,255,0.2)' }}
            whileTap={{ scale: 0.97 }}
        >
            <Hand size={13} /> Enable Camera
        </motion.button>
    </motion.div>
);

// ── Error / denied screens ────────────────────────────────────────────────────
const DeniedScreen = ({ onRetry }: { onRetry: () => void }) => (
    <motion.div
        className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
    >
        <AlertTriangle size={32} style={{ color: '#FF6B6B' }} />
        <div className="space-y-1.5">
            <p className="font-sans font-semibold text-sm" style={{ color: TEXT }}>Camera access denied</p>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: MUTED }}>
                Please allow camera access in your browser settings and try again.
            </p>
        </div>
        <button onClick={onRetry}
            className="font-mono text-[10px] px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', color: '#FF6B6B' }}>
            Try again
        </button>
    </motion.div>
);

const ErrorScreen = ({ onRetry }: { onRetry: () => void }) => (
    <motion.div
        className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
    >
        <AlertTriangle size={32} style={{ color: '#FFAE42' }} />
        <div className="space-y-1.5">
            <p className="font-sans font-semibold text-sm" style={{ color: TEXT }}>Failed to load gesture model</p>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: MUTED }}>
                MediaPipe couldn't initialize. A network connection is required to load the model.
            </p>
        </div>
        <button onClick={onRetry}
            className="font-mono text-[10px] px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,174,66,0.08)', border: '1px solid rgba(255,174,66,0.25)', color: '#FFAE42' }}>
            Retry
        </button>
    </motion.div>
);

// ── Main component ────────────────────────────────────────────────────────────
interface Props { onClose: () => void; }

const GestureDemo = ({ onClose }: Props) => {
    const [permission,    setPermission]    = useState<PermissionState>('idle');
    const [projectIndex,  setProjectIndex]  = useState(0);
    const [paused,        setPaused]        = useState(false);

    const { videoRef, canvasRef, gestureState, isLoading, start, stop } = useGestureDetection();

    const projects = PROJECTS_CHILDREN;

    // ── Gesture → action ──────────────────────────────────────────────────────
    const swipeHandled = useRef(false);

    useEffect(() => {
        if (permission !== 'granted') return;
        const { gesture } = gestureState;

        if (gesture === 'open_palm') {
            setPaused(true);
        } else {
            setPaused(false);
        }

        if (paused) return;

        if ((gesture === 'swipe_right') && !swipeHandled.current) {
            swipeHandled.current = true;
            setProjectIndex(i => (i + 1) % projects.length);
            setTimeout(() => { swipeHandled.current = false; }, 950);
        } else if ((gesture === 'swipe_left') && !swipeHandled.current) {
            swipeHandled.current = true;
            setProjectIndex(i => (i - 1 + projects.length) % projects.length);
            setTimeout(() => { swipeHandled.current = false; }, 950);
        }
    }, [gestureState, paused, permission, projects.length]);

    // ── Start handler ─────────────────────────────────────────────────────────
    const handleStart = useCallback(async () => {
        setPermission('loading');
        const result = await start();
        if (result === 'granted') setPermission('granted');
        else if (result === 'denied') setPermission('denied');
        else setPermission('error');
    }, [start]);

    const handleRetry = useCallback(() => {
        setPermission('idle');
    }, []);

    // Stop webcam on unmount
    useEffect(() => () => stop(), [stop]);

    // ── Layout ────────────────────────────────────────────────────────────────
    return (
        <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(8,13,25,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
        >
            {/* Panel */}
            <motion.div
                className="relative flex flex-col overflow-hidden"
                style={{
                    width: 'min(900px, calc(100vw - 2rem))',
                    height: 'min(600px, calc(100vh - 2rem))',
                    background: 'rgba(11,18,32,0.98)',
                    border: '1px solid rgba(61,227,255,0.15)',
                    borderRadius: 18,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(61,227,255,0.05)',
                }}
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                {/* Top edge highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-[18px]"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(61,227,255,0.28), transparent)' }} />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 shrink-0"
                    style={{ borderBottom: '1px solid rgba(61,227,255,0.09)' }}>
                    <div className="flex items-center gap-3">
                        <Hand size={14} style={{ color: ACCENT }} />
                        <div>
                            <p className="font-sans font-semibold text-sm" style={{ color: TEXT }}>Gesture Demo</p>
                            <p className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(154,176,204,0.4)' }}>
                                No Strings Attached · CV project
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'rgba(154,176,204,0.4)', background: 'rgba(154,176,204,0.06)' }}
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    {permission === 'idle' && <IdleScreen onStart={handleStart} />}

                    {permission === 'loading' && (
                        <motion.div className="flex flex-col items-center justify-center w-full gap-4"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                                <Loader size={28} style={{ color: ACCENT }} />
                            </motion.div>
                            <p className="font-mono text-xs" style={{ color: MUTED }}>Loading gesture model…</p>
                            <p className="font-mono text-[9px]" style={{ color: 'rgba(154,176,204,0.3)' }}>
                                Downloading ~25 MB on first run
                            </p>
                        </motion.div>
                    )}

                    {isLoading && permission !== 'loading' && (
                        <motion.div className="flex flex-col items-center justify-center w-full gap-4"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                                <Loader size={28} style={{ color: ACCENT }} />
                            </motion.div>
                            <p className="font-mono text-xs" style={{ color: MUTED }}>Initialising camera…</p>
                        </motion.div>
                    )}

                    {permission === 'denied' && <DeniedScreen onRetry={handleRetry} />}
                    {permission === 'error'  && <ErrorScreen  onRetry={handleRetry} />}

                    {permission === 'granted' && !isLoading && (
                        <motion.div
                            className="flex flex-1 overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* ── Left: webcam + canvas overlay ── */}
                            <div className="relative flex-1 flex items-center justify-center bg-black/30 overflow-hidden"
                                style={{ borderRight: '1px solid rgba(61,227,255,0.08)' }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                    style={{ transform: 'scaleX(-1)' }}
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    style={{ transform: 'scaleX(-1)', pointerEvents: 'none' }}
                                />

                                {/* Gesture badge overlay */}
                                <div className="absolute bottom-3 left-3 right-3 flex gap-2 flex-wrap">
                                    {paused && (
                                        <motion.div
                                            className="font-mono text-[9px] px-2.5 py-1 rounded-full"
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{
                                                background: 'rgba(61,227,255,0.12)',
                                                border: '1px solid rgba(61,227,255,0.3)',
                                                color: ACCENT,
                                            }}
                                        >
                                            ✋ Paused
                                        </motion.div>
                                    )}
                                </div>

                                {/* Corner scan-line effect */}
                                <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none"
                                    style={{ borderTop: '2px solid rgba(61,227,255,0.5)', borderLeft: '2px solid rgba(61,227,255,0.5)', borderRadius: '4px 0 0 0' }} />
                                <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none"
                                    style={{ borderTop: '2px solid rgba(61,227,255,0.5)', borderRight: '2px solid rgba(61,227,255,0.5)', borderRadius: '0 4px 0 0' }} />
                                <div className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none"
                                    style={{ borderBottom: '2px solid rgba(61,227,255,0.5)', borderLeft: '2px solid rgba(61,227,255,0.5)', borderRadius: '0 0 0 4px' }} />
                                <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none"
                                    style={{ borderBottom: '2px solid rgba(61,227,255,0.5)', borderRight: '2px solid rgba(61,227,255,0.5)', borderRadius: '0 0 4px 0' }} />
                            </div>

                            {/* ── Right: gesture legend + project carousel ── */}
                            <div className="w-72 shrink-0 flex flex-col p-5 gap-5 overflow-y-auto">
                                {/* Gesture indicators */}
                                <div>
                                    <p className="font-mono text-[9px] uppercase tracking-widest mb-3"
                                        style={{ color: 'rgba(154,176,204,0.4)' }}>Detected gesture</p>
                                    <div className="flex flex-col gap-2">
                                        <GestureBadge icon="🖐" label="Open Palm · pause" active={gestureState.gesture === 'open_palm'} />
                                        <GestureBadge icon="👌" label="Pinch · select"    active={gestureState.gesture === 'pinch'}     />
                                        <GestureBadge icon="👉" label="Swipe right · next" active={gestureState.gesture === 'swipe_right'} />
                                        <GestureBadge icon="👈" label="Swipe left · prev" active={gestureState.gesture === 'swipe_left'}  />
                                    </div>
                                </div>

                                {/* Project carousel */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-mono text-[9px] uppercase tracking-widest"
                                            style={{ color: 'rgba(154,176,204,0.4)' }}>Projects</p>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setProjectIndex(i => (i - 1 + projects.length) % projects.length)}
                                                className="p-1 rounded transition-colors"
                                                style={{ color: MUTED, background: 'rgba(154,176,204,0.06)' }}
                                            >
                                                <ChevronLeft size={12} />
                                            </button>
                                            <span className="font-mono text-[9px] px-1" style={{ color: 'rgba(154,176,204,0.4)' }}>
                                                {projectIndex + 1}/{projects.length}
                                            </span>
                                            <button
                                                onClick={() => setProjectIndex(i => (i + 1) % projects.length)}
                                                className="p-1 rounded transition-colors"
                                                style={{ color: MUTED, background: 'rgba(154,176,204,0.06)' }}
                                            >
                                                <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <AnimatePresence mode="wait">
                                            {projects.map((p, i) => {
                                                const dist = Math.abs(i - projectIndex);
                                                if (dist > 1) return null;
                                                return (
                                                    <motion.div
                                                        key={p.id}
                                                        initial={{ opacity: 0, x: 10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <ProjectCard
                                                            label={p.label}
                                                            summary={p.summary ?? ''}
                                                            active={i === projectIndex}
                                                        />
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <p className="font-mono text-[9px] text-center"
                                    style={{ color: 'rgba(154,176,204,0.2)' }}>
                                    All processing is local · no video sent
                                </p>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default GestureDemo;
