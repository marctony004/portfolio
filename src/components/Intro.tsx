import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props { onEnter: () => void; }

export const Intro = ({ onEnter }: Props) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter') onEnter();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onEnter]);

    return (
    <motion.div
        className="fixed inset-0 z-[10000] flex flex-col items-center justify-center"
        style={{ background: '#0B1220' }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
        {/* Corner brackets */}
        {[['top-8 left-8', 'border-t-2 border-l-2'],
          ['top-8 right-8', 'border-t-2 border-r-2'],
          ['bottom-8 left-8', 'border-b-2 border-l-2'],
          ['bottom-8 right-8', 'border-b-2 border-r-2']
        ].map(([pos, border], i) => (
            <div key={i} className={`absolute ${pos} w-8 h-8 ${border} border-accent/25`} />
        ))}

        {/* Radial glow */}
        <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(61,227,255,0.06) 0%, transparent 70%)' }} />

        <div className="text-center px-6 relative z-10">
            <motion.p
                className="font-mono text-xs tracking-[0.5em] uppercase mb-10 text-accent/60"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
            >
                Portfolio · {new Date().getFullYear()}
            </motion.p>

            <motion.h1
                className="font-sans font-bold text-text leading-none mb-4"
                style={{
                    fontSize: 'clamp(3rem, 11vw, 7.5rem)',
                    textShadow: '0 0 80px rgba(61,227,255,0.18)',
                }}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            >
                Marc Smith
            </motion.h1>

            <motion.p
                className="font-mono text-accent text-base tracking-widest mb-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.7 }}
            >
                AI / ML Engineer · Full-Stack Developer
            </motion.p>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 0.5 }}
            >
                <motion.button
                    onClick={onEnter}
                    className="font-mono text-[11px] tracking-[0.45em] uppercase text-accent px-12 py-4 rounded-sm transition-colors"
                    style={{ border: '1px solid rgba(61,227,255,0.35)' }}
                    animate={{ boxShadow: ['0 0 0px rgba(61,227,255,0)', '0 0 20px rgba(61,227,255,0.18)', '0 0 0px rgba(61,227,255,0)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                    whileHover={{ boxShadow: '0 0 28px rgba(61,227,255,0.28)', backgroundColor: 'rgba(61,227,255,0.05)' }}
                    whileTap={{ scale: 0.97 }}
                >
                    Enter
                </motion.button>
            </motion.div>
        </div>

        <motion.p
            className="absolute bottom-8 hidden sm:block font-mono text-[10px] tracking-widest text-muted/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.7 }}
        >
            Press <span className="text-accent/60">Enter</span> or click · <span className="text-accent/60">/</span> anytime for search
        </motion.p>
    </motion.div>
    );
};
