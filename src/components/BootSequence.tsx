import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Props {
    onComplete: () => void;
}

const MODULES = [
    'Computer Vision',
    'Machine Learning',
    'LLM Systems',
    'Systems Engineering',
    'Creative AI',
];

// Step index map:
// 1 → "Initializing..."
// 2 → "Loading modules..."
// 3–7 → modules (0–4)
// 8 → "Neural Map Ready"
const TOTAL      = 2 + MODULES.length + 1; // 8
const STEP_MS    = 320;   // ms between each line
const START_MS   = 100;   // delay before first line
const READY_WAIT = 420;   // extra pause before "Neural Map Ready"
const HOLD_MS    = 950;   // time to show "Neural Map Ready" before fading out

export const BootSequence = ({ onComplete }: Props) => {
    const [step, setStep]   = useState(0);
    const prefersReduced    = useReducedMotion();

    useEffect(() => {
        if (prefersReduced) { onComplete(); return; }

        const timers: ReturnType<typeof setTimeout>[] = [];
        let t = START_MS;

        for (let i = 1; i <= TOTAL; i++) {
            if (i === TOTAL) t += READY_WAIT; // pause before final line
            const s = i; // capture for closure
            timers.push(setTimeout(() => setStep(s), t));
            t += STEP_MS;
        }

        // onComplete after "Neural Map Ready" has been visible for HOLD_MS
        const lastStepAt = t - STEP_MS; // time the last step fires
        timers.push(setTimeout(onComplete, lastStepAt + HOLD_MS));

        return () => timers.forEach(clearTimeout);
    }, []);

    const show = (n: number) => step >= n;

    const lineIn = {
        initial:    { opacity: 0, y: 6 },
        animate:    { opacity: 1, y: 0 },
        transition: { duration: 0.22 },
    };

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: '#0B1220' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeInOut' }}
            onClick={onComplete} // click anywhere to skip
        >
            {/* Scanline texture — very subtle */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.018) 0px, rgba(0,0,0,0.018) 1px, transparent 1px, transparent 4px)',
                }}
            />

            {/* Radial ambient glow */}
            <div
                className="absolute pointer-events-none"
                style={{
                    width: 480,
                    height: 480,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(61,227,255,0.04) 0%, transparent 70%)',
                }}
            />

            {/* Terminal block */}
            <div className="relative w-full max-w-sm px-8 select-none">
                {/* Left gutter line */}
                <div
                    className="absolute left-8 top-0 bottom-0 w-[1px]"
                    style={{ background: 'rgba(61,227,255,0.07)' }}
                />

                <div className="pl-5 space-y-[7px]">

                    {/* Line 1 — Initializing */}
                    {show(1) && (
                        <motion.p
                            className="font-mono text-[13px] leading-snug"
                            style={{ color: '#E6EEF9' }}
                            {...lineIn}
                        >
                            Initializing Marc Smith AI System...
                        </motion.p>
                    )}

                    {/* Line 2 — Loading modules */}
                    {show(2) && (
                        <motion.p
                            className="font-mono text-[13px] leading-snug pb-1"
                            style={{ color: 'rgba(154,176,204,0.65)' }}
                            {...lineIn}
                        >
                            Loading modules...
                        </motion.p>
                    )}

                    {/* Module checkmarks */}
                    {MODULES.map((mod, i) =>
                        show(3 + i) ? (
                            <motion.div
                                key={mod}
                                className="flex items-center gap-2.5 font-mono text-[13px] leading-snug"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.span
                                    style={{
                                        color: '#3DE3FF',
                                        textShadow: '0 0 10px rgba(61,227,255,0.75)',
                                        lineHeight: 1,
                                    }}
                                    initial={{ scale: 0.4, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.16, delay: 0.07 }}
                                >
                                    ✔
                                </motion.span>
                                <span style={{ color: '#E6EEF9' }}>{mod}</span>
                            </motion.div>
                        ) : null
                    )}

                    {/* Neural Map Ready */}
                    {show(TOTAL) && (
                        <motion.p
                            className="font-mono text-[13px] leading-snug pt-3 mt-1"
                            style={{
                                color: '#3DE3FF',
                                borderTop: '1px solid rgba(61,227,255,0.12)',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity:    [0, 1, 0.72, 1],
                                textShadow: [
                                    '0 0 0px rgba(61,227,255,0)',
                                    '0 0 24px rgba(61,227,255,0.7)',
                                    '0 0 8px rgba(61,227,255,0.28)',
                                    '0 0 16px rgba(61,227,255,0.5)',
                                ],
                            }}
                            transition={{ duration: 0.9, times: [0, 0.35, 0.65, 1] }}
                        >
                            Neural Map Ready
                        </motion.p>
                    )}
                </div>
            </div>

            {/* Skip hint */}
            <motion.p
                className="absolute bottom-8 font-mono text-[10px] tracking-widest"
                style={{ color: 'rgba(154,176,204,0.2)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.6 }}
            >
                click to skip
            </motion.p>
        </motion.div>
    );
};
