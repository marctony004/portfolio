import { motion } from 'framer-motion';
import { CAPABILITY_FILTERS, type Capability } from '../data/brainData';

interface Props {
    active: Capability | null;
    onToggle: (cap: Capability | null) => void;
}

export const CapabilityChips = ({ active, onToggle }: Props) => (
    <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-wrap justify-center gap-2 px-4"
        style={{ pointerEvents: 'none' }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
    >
        {CAPABILITY_FILTERS.map((cap, i) => (
            <motion.button
                key={cap}
                onClick={() => onToggle(active === cap ? null : cap)}
                className="font-mono text-[10px] px-2.5 py-1 rounded-full tracking-wide transition-all duration-200"
                style={{
                    pointerEvents: 'auto',
                    border: `1px solid ${active === cap ? 'rgba(61,227,255,0.55)' : 'rgba(61,227,255,0.12)'}`,
                    background: active === cap ? 'rgba(61,227,255,0.10)' : 'rgba(11,18,32,0.75)',
                    color: active === cap ? '#3DE3FF' : 'rgba(154,176,204,0.6)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: active === cap ? '0 0 12px rgba(61,227,255,0.12)' : 'none',
                }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05, duration: 0.25 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
            >
                {cap}
            </motion.button>
        ))}
    </motion.div>
);
