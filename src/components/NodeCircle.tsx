import { motion } from 'framer-motion';
import { Cpu, type LucideIcon } from 'lucide-react';
import { ACCENT, MUTED } from '../theme';

export interface NodeCircleProps {
    id: string; x: number; y: number; size: number;
    label: string;
    icon?: LucideIcon;
    isCenter?: boolean; isChild?: boolean;
    isActive: boolean; isDimmed: boolean; isHovered: boolean;
    isKbFocused?: boolean;
    isRelatedToHover?: boolean;
    expandable?: boolean; isExpanded?: boolean;
    isHinted?: boolean;
    disableInternalDrift?: boolean;
    depthScale?: number;
    driftIdx: number; reduced: boolean | null;
    isTourDimmed?: boolean;      // softer dim used during guided tour (0.5 vs 0.22)
    isBootActivating?: boolean;  // subtle glow boost during tour boot phase
    onClick: (e: React.MouseEvent) => void;
    onHover: (on: boolean) => void;
}

export const NodeCircle = ({
    x, y, size, label, icon: Icon, isCenter, isChild,
    isActive, isDimmed, isHovered, isKbFocused, isRelatedToHover,
    expandable, isExpanded, isHinted, disableInternalDrift,
    depthScale = 1, driftIdx, reduced, isTourDimmed = false, isBootActivating = false, onClick, onHover,
}: NodeCircleProps) => {
    const dx  = Math.sin(driftIdx * 2.31) * 3;
    const dy  = Math.cos(driftIdx * 1.73) * 3;
    const dur = 7 + driftIdx * 1.3;

    // depthScale only modulates resting-state appearance; active/hover states are always full weight
    const elevated = isActive || isHovered || isKbFocused || isHinted;
    const d  = elevated ? 1 : depthScale;
    const fa = (base: number) => +(base * d).toFixed(2);

    const borderColor = isActive       ? 'rgba(61,227,255,0.85)'
        : isKbFocused                  ? 'rgba(61,227,255,0.70)'
        : isHinted                     ? 'rgba(61,227,255,0.55)'
        : isHovered                    ? 'rgba(61,227,255,0.50)'
        : isRelatedToHover             ? `rgba(61,227,255,${fa(0.42)})`
        : isBootActivating             ? `rgba(61,227,255,${fa(0.30)})`
        :                                `rgba(61,227,255,${fa(0.18)})`;

    const glow = isActive             ? '0 0 40px rgba(61,227,255,0.30)'
        : isKbFocused                 ? '0 0 28px rgba(61,227,255,0.24)'
        : isHinted                    ? '0 0 28px rgba(61,227,255,0.22)'
        : isHovered                   ? '0 0 24px rgba(61,227,255,0.20)'
        : isRelatedToHover            ? `0 0 22px rgba(61,227,255,${fa(0.16)})`
        : isBootActivating            ? `0 0 20px rgba(61,227,255,${fa(0.16)})`
        :                               `0 0 14px rgba(61,227,255,${fa(0.07)})`;

    const borderStyle = isKbFocused ? 'dashed' : 'solid';
    const iconColor   = isActive || isHovered || isHinted || isKbFocused ? ACCENT : MUTED;
    const iconSize    = isCenter ? 16 : isChild ? 12 : 14;

    return (
        <motion.div
            className="absolute cursor-pointer select-none"
            style={{ left: x - size / 2, top: y - size / 2, width: size, height: size, pointerEvents: 'auto' }}
            animate={reduced || disableInternalDrift ? {} : { x: [0, dx, 0, -dx * 0.6, 0], y: [0, dy, 0, -dy * 0.6, 0] }}
            transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
            onClick={onClick}
            onHoverStart={() => onHover(true)}
            onHoverEnd={() => onHover(false)}
        >
            {/* Hint pulse ring */}
            {isHinted && (
                <motion.div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ border: '1px solid rgba(61,227,255,0.4)' }}
                    animate={{ scale: [1, 1.55, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {/* Circle */}
            <motion.div
                className="w-full h-full rounded-full flex items-center justify-center relative overflow-hidden"
                animate={{ opacity: isDimmed ? 0.22 : isTourDimmed ? 0.5 : 1, scale: isActive ? 1.12 : isHovered ? 1.06 : 1 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                style={{
                    background: isCenter ? 'rgba(17,26,46,0.97)' : 'rgba(17,26,46,0.88)',
                    border: `1.5px ${borderStyle} ${borderColor}`,
                    boxShadow: glow,
                    transition: 'box-shadow 0.55s ease, border-color 0.55s ease',
                }}
            >
                <div className="absolute inset-[4px] rounded-full pointer-events-none"
                    style={{ border: '1px solid rgba(61,227,255,0.07)' }} />

                {Icon && <Icon size={iconSize} color={iconColor} />}

                {isCenter && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Cpu size={14} color={isHovered ? ACCENT : MUTED} />
                        <span className="text-[8px] font-mono mt-0.5 leading-none text-center" style={{ color: isHovered ? ACCENT : MUTED }}>
                            MARC<br />SMITH
                        </span>
                    </div>
                )}
            </motion.div>

            {/* Label */}
            {!isCenter && (
                <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none">
                    <span className="font-mono leading-none" style={{
                        fontSize: isChild ? 9 : 10,
                        color: isActive ? ACCENT : isDimmed ? 'rgba(154,176,204,0.25)' : isTourDimmed ? 'rgba(154,176,204,0.38)' : MUTED,
                    }}>
                        {label}
                        {expandable && (
                            <span style={{ marginLeft: 4, color: ACCENT, opacity: 0.65, fontSize: 9 }}>
                                {isExpanded ? '−' : '+'}
                            </span>
                        )}
                    </span>
                </div>
            )}
        </motion.div>
    );
};
