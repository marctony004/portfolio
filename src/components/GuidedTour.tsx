import { motion, AnimatePresence } from 'framer-motion';
import { TOUR_STEPS, type TourStep } from '../data/tourSteps';

interface Props {
    step: number;
    stepData: TourStep;
    isPaused: boolean;
    isUserExploring: boolean;
    isComplete: boolean;
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
    step, stepData, isPaused, isUserExploring, isComplete,
    onNext, onBack, onPause, onResume, onExit, onReplay,
}: Props) {
    const total      = TOUR_STEPS.length;
    const isLastStep = step === total - 1;

    return (
        <motion.div
            className="fixed bottom-6 left-4 z-[90]"
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
                        <span style={{ color: '#3DE3FF', fontSize: 9 }}>◉</span>
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
                            {isComplete
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
                    {/* Tour Complete */}
                    {isComplete ? (
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
                                You've seen the highlights. Explore the full graph freely, or reach out to connect.
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
