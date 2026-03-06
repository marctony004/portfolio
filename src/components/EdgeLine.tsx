import { memo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { EDGE_C, EDGE_W } from './brainMapConstants';

export interface EdgeLineProps {
    x1: number; y1: number;
    x2: number; y2: number;
    type: 'primary' | 'child' | 'cross';
    drawDelay: number;
    drawDuration: number;
    isActive: boolean;
    isEdgeHovered: boolean;
    isPulsing: boolean;
    reduced: boolean | null;
}

export const EdgeLine = memo(({
    x1, y1, x2, y2, type, drawDelay, drawDuration,
    isActive, isEdgeHovered, isPulsing, reduced,
}: EdgeLineProps) => {
    const [pulseKey, setPulseKey] = useState(0);
    const prevPulse = useRef(false);
    useEffect(() => {
        if (isPulsing && !prevPulse.current) setPulseKey(k => k + 1);
        prevPulse.current = isPulsing;
    }, [isPulsing]);

    const c      = EDGE_C[type];
    const w      = EDGE_W[type];
    const stroke = isActive ? c.active : isEdgeHovered ? c.hover : c.base;
    const sw     = isActive ? w.active : isEdgeHovered ? w.hover : w.base;
    const d      = `M ${x1} ${y1} L ${x2} ${y2}`;

    if (reduced) {
        return <path d={d} fill="none" stroke={c.base} strokeWidth={w.base} />;
    }

    return (
        <g>
            {/* Main route line — draws outward from center on mount */}
            <motion.path
                d={d}
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0, stroke: c.base, strokeWidth: w.base }}
                animate={{ pathLength: 1, opacity: 1, stroke, strokeWidth: sw }}
                transition={{
                    pathLength:  { duration: drawDuration, delay: drawDelay, ease: [0.16, 0, 0.5, 1] },
                    opacity:     { duration: 0.3, delay: drawDelay },
                    stroke:      { duration: 0.45 },
                    strokeWidth: { duration: 0.45 },
                }}
            />

            {/* Endpoint activation dot */}
            {type === 'primary' && (
                <motion.circle
                    cx={x2} cy={y2} r={1.8}
                    fill="rgba(61,227,255,0.5)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: isActive ? 0.65 : 0.26 }}
                    transition={{
                        scale:   { duration: 0.32, delay: drawDelay + drawDuration, ease: 'easeOut' },
                        opacity: { duration: 0.32, delay: drawDelay + drawDuration },
                    }}
                />
            )}

            {/* Traveling pulse dot — fires each time a connected node is clicked */}
            <motion.circle
                key={pulseKey}
                r={type === 'primary' ? 2.2 : 1.5}
                fill="rgba(61,227,255,0.58)"
                initial={{ opacity: 0, cx: x1, cy: y1 }}
                animate={pulseKey > 0
                    ? { cx: [x1, x2], cy: [y1, y2], opacity: [0, 0.65, 0.55, 0] }
                    : { opacity: 0, cx: x1, cy: y1 }}
                transition={{ duration: 1.25, ease: [0.25, 0.1, 0.6, 1], times: [0, 0.15, 0.78, 1] }}
            />
        </g>
    );
});
EdgeLine.displayName = 'EdgeLine';
