import { motion, AnimatePresence } from 'framer-motion';
import { TOUR_STEPS, type TourStep } from '../data/tourSteps';

// ── Mini sphere preview ──────────────────────────────────────────────────────
// Self-contained SVG; uses native SVG animateMotion — no Three.js or deps needed.
function SphereMiniPreview({ focusMode = false }: { focusMode?: boolean }) {
    const cx = 60, cy = 40, r = 28;
    const eqRy = 6.5;

    const orbitNodes = [
        { x: 60, y: 13, r: 2.1 },
        { x: 84, y: 29, r: 1.9 },
        { x: 84, y: 53, r: 1.7 },
        { x: 60, y: 67, r: 1.9 },
        { x: 36, y: 53, r: 1.7 },
        { x: 36, y: 29, r: 1.9 },
    ];

    // In focus-mode preview: node 2 (top-right) is "active", others dimmed
    const activeIdx = focusMode ? 1 : -1;

    return (
        <svg
            viewBox="0 0 120 80"
            width="100%"
            style={{ maxHeight: 84, display: 'block' }}
            aria-hidden="true"
        >
            <defs>
                <path
                    id="sp-eq-orbit"
                    d={`M ${cx + r} ${cy} A ${r} ${eqRy} 0 0 1 ${cx - r} ${cy} A ${r} ${eqRy} 0 0 1 ${cx + r} ${cy}`}
                />
                <path
                    id="sp-tilt-orbit"
                    d={`M ${cx + 24} ${cy} A 24 11 0 0 1 ${cx - 24} ${cy} A 24 11 0 0 1 ${cx + 24} ${cy}`}
                    transform={`rotate(-38, ${cx}, ${cy})`}
                />
                <radialGradient id="sp-center-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3DE3FF" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#3DE3FF" stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Sphere shell */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(61,227,255,0.07)" strokeWidth="0.8" />

            {/* Equatorial ring */}
            <ellipse cx={cx} cy={cy} rx={r} ry={eqRy} fill="none" stroke="rgba(61,227,255,0.14)" strokeWidth="0.7" />

            {/* Tilted meridian ring */}
            <ellipse cx={cx} cy={cy} rx={24} ry={11} fill="none" stroke="rgba(61,227,255,0.08)" strokeWidth="0.6"
                transform={`rotate(-38, ${cx}, ${cy})`} />

            {/* Orbit node spokes + nodes */}
            {orbitNodes.map((n, i) => {
                const dimmed = focusMode && i !== activeIdx;
                const alpha = dimmed ? 0.15 : 0.42;
                const spokeAlpha = dimmed ? 0.07 : 0.14;
                return (
                    <g key={i}>
                        <line x1={cx} y1={cy} x2={n.x} y2={n.y}
                            stroke={`rgba(61,227,255,${spokeAlpha})`} strokeWidth="0.5" />
                        <circle cx={n.x} cy={n.y} r={n.r}
                            fill={`rgba(61,227,255,${alpha})`}>
                            {i === activeIdx && (
                                <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite" />
                            )}
                        </circle>
                    </g>
                );
            })}

            {/* Center glow halo */}
            <circle cx={cx} cy={cy} r={9} fill="url(#sp-center-glow)" opacity="0.45">
                <animate attributeName="opacity" values="0.35;0.55;0.35" dur="2.2s" repeatCount="indefinite" />
            </circle>

            {/* Center node */}
            <circle cx={cx} cy={cy} r={4} fill="rgba(9,15,28,0.92)" stroke="rgba(61,227,255,0.7)" strokeWidth="1" />
            <circle cx={cx} cy={cy} r={2.2} fill="#3DE3FF" />

            {/* Traveling node 1 — equatorial orbit */}
            <circle r="2.3" fill="rgba(61,227,255,0.78)">
                <animateMotion dur="4.2s" repeatCount="indefinite">
                    <mpath href="#sp-eq-orbit" />
                </animateMotion>
            </circle>

            {/* Traveling node 2 — equatorial orbit, half-phase offset */}
            <circle r="1.9" fill="rgba(61,227,255,0.52)">
                <animateMotion dur="4.2s" begin="-2.1s" repeatCount="indefinite">
                    <mpath href="#sp-eq-orbit" />
                </animateMotion>
            </circle>

            {/* Traveling node 3 — tilted orbit */}
            <circle r="1.7" fill="rgba(61,227,255,0.48)">
                <animateMotion dur="5.8s" repeatCount="indefinite">
                    <mpath href="#sp-tilt-orbit" />
                </animateMotion>
            </circle>
        </svg>
    );
}

interface Props {
    step: number;
    stepData: TourStep;
    isPaused: boolean;
    isBooting: boolean;
    isUserExploring: boolean;
    isComplete: boolean;
    alignRight?: boolean; // true = panel sits bottom-right, false = bottom-left
    onNext: () => void;
    onBack: () => void;
    onPause: () => void;
    onResume: () => void;
    onExit: () => void;
    onReplay: () => void;
}

const BTN_BASE: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
};

export function GuidedTour({
    step, stepData, isPaused, isBooting, isUserExploring, isComplete,
    alignRight = true,
    onNext, onBack, onPause, onResume, onExit, onReplay,
}: Props) {
    const total      = TOUR_STEPS.length;
    const isLastStep = step === total - 1;

    return (
        <motion.div
            className={`fixed bottom-6 z-[90] ${alignRight ? 'right-4' : 'left-4'}`}
            style={{ width: 'min(400px, calc(100vw - 32px))' }}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Guided portfolio tour"
        >
            <div style={{
                background: 'rgba(9,15,28,0.96)',
                border: '1px solid rgba(61,227,255,0.16)',
                borderRadius: 14,
                backdropFilter: 'blur(24px)',
                padding: '18px 22px',
                boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(61,227,255,0.04)',
            }}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {/* Pulsing dot — more active during boot */}
                        <motion.span
                            style={{ color: '#3DE3FF', fontSize: 9, display: 'inline-block' }}
                            animate={isBooting ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                            transition={isBooting ? { duration: 0.8, repeat: Infinity } : {}}
                        >
                            ◉
                        </motion.span>
                        <span style={{
                            fontFamily: 'monospace',
                            fontSize: 9,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: 'rgba(61,227,255,0.55)',
                        }}>
                            AI System Tour
                        </span>
                        <span style={{ color: 'rgba(154,176,204,0.25)', fontSize: 10 }}>·</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(154,176,204,0.45)' }}>
                            {isBooting
                                ? 'Booting'
                                : isComplete
                                    ? 'Complete'
                                    : isUserExploring || isPaused
                                        ? 'Paused'
                                        : `Step ${step + 1} of ${total}`}
                        </span>
                    </div>
                    <button
                        onClick={onExit}
                        aria-label="Exit tour"
                        style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            color: 'rgba(154,176,204,0.3)',
                            lineHeight: 1,
                            padding: '2px 4px',
                            cursor: 'pointer',
                            background: 'none',
                            border: 'none',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* ── Body ── */}
                <AnimatePresence mode="wait">

                    {/* Boot sequence */}
                    {isBooting ? (
                        <motion.div
                            key="booting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <motion.p
                                style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(154,176,204,0.65)', marginBottom: 4 }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1, duration: 0.35 }}
                            >
                                Initializing system map...
                            </motion.p>
                            <motion.p
                                style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(154,176,204,0.65)', marginBottom: 4 }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.82, duration: 0.35 }}
                            >
                                Loading nodes...
                            </motion.p>
                            <motion.p
                                style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(61,227,255,0.45)' }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.35, duration: 0.35 }}
                            >
                                Mapping connections
                                <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
                                >
                                    _
                                </motion.span>
                            </motion.p>
                        </motion.div>

                    /* Tour Complete */
                    ) : isComplete ? (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <p style={{ fontFamily: 'sans-serif', fontWeight: 600, fontSize: 15, color: '#E6EEF9', marginBottom: 6 }}>
                                Tour complete.
                            </p>
                            <p style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.65, color: 'rgba(154,176,204,0.72)' }}>
                                Explore the system — click any node to begin.
                            </p>
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={onReplay}
                                    style={{
                                        ...BTN_BASE,
                                        flex: 1,
                                        background: 'rgba(61,227,255,0.08)',
                                        border: '1px solid rgba(61,227,255,0.22)',
                                        color: '#3DE3FF',
                                    }}
                                >
                                    ↺ Replay Tour
                                </button>
                                <button
                                    onClick={onExit}
                                    style={{
                                        ...BTN_BASE,
                                        flex: 1,
                                        background: 'rgba(154,176,204,0.05)',
                                        border: '1px solid rgba(154,176,204,0.12)',
                                        color: 'rgba(154,176,204,0.65)',
                                    }}
                                >
                                    Explore →
                                </button>
                            </div>
                        </motion.div>

                    /* Tour Paused — User Exploring */
                    ) : isUserExploring ? (
                        <motion.div
                            key="exploring"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <p style={{ fontFamily: 'sans-serif', fontWeight: 600, fontSize: 15, color: '#E6EEF9', marginBottom: 6 }}>
                                Tour paused while you explore.
                            </p>
                            <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(154,176,204,0.62)' }}>
                                Click Resume to continue from where you left off.
                            </p>
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={onResume}
                                    style={{
                                        ...BTN_BASE,
                                        flex: 1,
                                        background: 'rgba(61,227,255,0.1)',
                                        border: '1px solid rgba(61,227,255,0.26)',
                                        color: '#3DE3FF',
                                    }}
                                >
                                    ▶ Resume Tour
                                </button>
                                <button
                                    onClick={onExit}
                                    style={{
                                        ...BTN_BASE,
                                        background: 'transparent',
                                        border: '1px solid rgba(154,176,204,0.12)',
                                        color: 'rgba(154,176,204,0.45)',
                                    }}
                                >
                                    Exit
                                </button>
                            </div>
                        </motion.div>

                    /* Normal Step */
                    ) : (
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                        >
                            <p style={{ fontFamily: 'sans-serif', fontWeight: 600, fontSize: 15, color: '#E6EEF9', marginBottom: 7 }}>
                                {stepData.title}
                            </p>
                            <p style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7, color: 'rgba(154,176,204,0.78)' }}>
                                {stepData.caption}
                            </p>

                            {/* Brain Sphere / Focus Mode steps — mini sphere preview */}
                            {(stepData.id === 'brain-sphere' || stepData.id === 'focus-mode') && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    style={{
                                        marginTop: 10,
                                        borderRadius: 8,
                                        border: '1px solid rgba(61,227,255,0.1)',
                                        background: 'rgba(61,227,255,0.03)',
                                        padding: '6px 8px 2px',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <SphereMiniPreview focusMode={stepData.id === 'focus-mode'} />
                                </motion.div>
                            )}

                            {/* Step 1 — identity: animated connection tree */}
                            {stepData.id === 'identity' && (
                                <motion.div
                                    style={{
                                        fontFamily: 'monospace',
                                        fontSize: 10,
                                        lineHeight: 1.9,
                                        marginTop: 10,
                                        paddingLeft: 4,
                                        color: 'rgba(61,227,255,0.75)',
                                        borderLeft: '1px solid rgba(61,227,255,0.18)',
                                        paddingTop: 4,
                                        paddingBottom: 4,
                                    }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 1, 0] }}
                                    transition={{
                                        times: [0, 0.12, 0.58, 0.80],
                                        duration: 6.2,
                                        delay: 0.4,
                                        ease: 'easeInOut',
                                    }}
                                >
                                    <div style={{ color: 'rgba(230,238,249,0.7)', marginBottom: 1 }}>Marc Smith</div>
                                    <div style={{ paddingLeft: 10 }}>├── Leadership</div>
                                    <div style={{ paddingLeft: 10 }}>└── Education</div>
                                </motion.div>
                            )}

                            {stepData.subline && (
                                <p style={{ fontFamily: 'monospace', fontSize: 10, lineHeight: 1.6, color: 'rgba(61,227,255,0.45)', marginTop: 6 }}>
                                    {stepData.subline}
                                </p>
                            )}

                            {/* Controls row */}
                            <div className="flex items-center justify-between mt-4">
                                {/* Step dots */}
                                <div className="flex items-center gap-1">
                                    {TOUR_STEPS.map((_, i) => (
                                        <div key={i} style={{
                                            width:        i === step ? 18 : 5,
                                            height:       5,
                                            borderRadius: 3,
                                            background:   i < step
                                                ? 'rgba(61,227,255,0.45)'
                                                : i === step
                                                    ? '#3DE3FF'
                                                    : 'rgba(154,176,204,0.18)',
                                            transition: 'all 0.3s ease',
                                        }} />
                                    ))}
                                </div>

                                {/* Buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={onBack}
                                        disabled={step === 0}
                                        aria-label="Previous step"
                                        style={{
                                            ...BTN_BASE,
                                            background: 'rgba(154,176,204,0.05)',
                                            border: '1px solid rgba(154,176,204,0.1)',
                                            color: step === 0 ? 'rgba(154,176,204,0.18)' : 'rgba(154,176,204,0.55)',
                                            cursor: step === 0 ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        ◀
                                    </button>
                                    <button
                                        onClick={isPaused ? onResume : onPause}
                                        aria-label={isPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
                                        style={{
                                            ...BTN_BASE,
                                            background: 'rgba(154,176,204,0.05)',
                                            border: '1px solid rgba(154,176,204,0.1)',
                                            color: 'rgba(154,176,204,0.55)',
                                        }}
                                    >
                                        {isPaused ? '▶' : '⏸'}
                                    </button>
                                    <button
                                        onClick={onNext}
                                        aria-label={isLastStep ? 'Finish tour' : 'Next step'}
                                        style={{
                                            ...BTN_BASE,
                                            background: 'rgba(61,227,255,0.1)',
                                            border: '1px solid rgba(61,227,255,0.24)',
                                            color: '#3DE3FF',
                                        }}
                                    >
                                        {isLastStep ? 'Finish' : 'Next ▶'}
                                    </button>
                                </div>
                            </div>

                            {/* Auto-advance progress bar */}
                            {!isPaused && (
                                <div style={{
                                    marginTop: 12,
                                    height: 2,
                                    borderRadius: 1,
                                    background: 'rgba(61,227,255,0.08)',
                                    overflow: 'hidden',
                                }}>
                                    <motion.div
                                        key={`bar-${step}`}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: stepData.duration / 1000, ease: 'linear' }}
                                        style={{
                                            transformOrigin: 'left',
                                            height: '100%',
                                            background: 'rgba(61,227,255,0.42)',
                                            borderRadius: 1,
                                        }}
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
