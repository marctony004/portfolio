import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
    onContinue: () => void;
}

export function MobileLanding({ onContinue }: Props) {
    const [copied, setCopied] = useState(false);

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <motion.div
            className="w-full h-screen flex flex-col items-center justify-center px-6 text-center"
            style={{ background: '#0B1220' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            {/* Icon */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-6 text-5xl"
                style={{ filter: 'drop-shadow(0 0 16px rgba(61,227,255,0.4))' }}
            >
                🖥️
            </motion.div>

            {/* Heading */}
            <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="font-mono text-xl font-bold mb-3"
                style={{ color: '#3DE3FF' }}
            >
                Best on Desktop
            </motion.h1>

            {/* Body */}
            <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="font-mono text-sm leading-relaxed mb-8 max-w-xs"
                style={{ color: 'rgba(154,176,204,0.7)' }}
            >
                This portfolio features an interactive neural graph built for desktop.
                Send the link to yourself or continue to the resume view below.
            </motion.p>

            {/* Buttons */}
            <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                className="flex flex-col gap-3 w-full max-w-xs"
            >
                <button
                    onClick={copyLink}
                    className="w-full font-mono text-xs tracking-widest py-3 px-4 rounded-lg transition-all"
                    style={{
                        background: copied ? 'rgba(61,227,255,0.15)' : 'rgba(61,227,255,0.08)',
                        border: '1px solid rgba(61,227,255,0.3)',
                        color: copied ? '#3DE3FF' : 'rgba(154,176,204,0.8)',
                    }}
                >
                    {copied ? '✓ LINK COPIED' : 'COPY LINK FOR DESKTOP'}
                </button>

                <button
                    onClick={onContinue}
                    className="w-full font-mono text-xs tracking-widest py-3 px-4 rounded-lg transition-all"
                    style={{
                        background: 'rgba(61,227,255,0.12)',
                        border: '1px solid rgba(61,227,255,0.25)',
                        color: '#3DE3FF',
                    }}
                >
                    VIEW RESUME ANYWAY →
                </button>
            </motion.div>

            {/* Footer */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="font-mono text-[10px] tracking-widest mt-10"
                style={{ color: 'rgba(154,176,204,0.25)' }}
            >
                marc smith · portfolio
            </motion.p>
        </motion.div>
    );
}
