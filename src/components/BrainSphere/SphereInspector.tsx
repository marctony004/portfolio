import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, ExternalLink, Mail, Linkedin } from 'lucide-react';
import { ACCENT, MUTED, TEXT } from '../../theme';
import type { SphereNodeData } from '../../data/sphereGraph';

interface Props {
    node:           SphereNodeData | null;
    onClose:        () => void;
    onEnterFocus?:  () => void;
    relatedLabels?: string[];
}

const NODE_TYPE_LABEL: Record<SphereNodeData['nodeType'], string> = {
    center:     'Identity',
    orbit:      'Domain',
    project:    'Project',
    capability: 'Capability',
    tool:       'Tool',
};

const linkBtn =
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono transition-colors shrink-0';
const linkStyle = {
    background: 'rgba(61,227,255,0.05)',
    border:     '1px solid rgba(61,227,255,0.14)',
    color:      MUTED,
} as React.CSSProperties;
const linkHover  = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = 'rgba(61,227,255,0.32)'; };
const linkUnhover = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = 'rgba(61,227,255,0.14)'; };

export function SphereInspector({ node, onClose, onEnterFocus, relatedLabels }: Props) {
    const isProject = node?.nodeType === 'project';

    return (
        <AnimatePresence>
            {node && (
                <motion.aside
                    /* Panel slides in once; stays mounted across node changes for smooth switching */
                    className="absolute top-0 right-0 bottom-0 flex flex-col z-20"
                    style={{
                        width:                'min(360px, 40vw)',
                        minWidth:             280,
                        background:           'rgba(11,18,32,0.94)',
                        borderLeft:           '1px solid rgba(61,227,255,0.13)',
                        backdropFilter:       'blur(22px)',
                        WebkitBackdropFilter: 'blur(22px)',
                        boxShadow:            '-20px 0 60px rgba(0,0,0,0.55)',
                    }}
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ duration: 0.34, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    {/* Top accent line */}
                    <div
                        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(61,227,255,0.28), transparent)' }}
                    />

                    {/* ── Stable header (no remount) ─────────────────────────── */}
                    <div
                        className="shrink-0 px-5 pt-5 pb-4"
                        style={{ borderBottom: '1px solid rgba(61,227,255,0.08)' }}
                    >
                        {/* Category badge + close */}
                        <div className="flex items-center justify-between mb-3">
                            <span
                                className="font-mono text-[8px] tracking-widest uppercase px-2.5 py-0.5 rounded-full"
                                style={{
                                    background: 'rgba(61,227,255,0.07)',
                                    border:     '1px solid rgba(61,227,255,0.18)',
                                    color:      'rgba(61,227,255,0.65)',
                                }}
                            >
                                {node.category}
                            </span>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: 'rgba(154,176,204,0.35)', background: 'rgba(154,176,204,0.06)' }}
                                aria-label="Close inspector"
                            >
                                <X size={13} />
                            </button>
                        </div>

                        {/* Title */}
                        <h2
                            className="font-sans font-bold text-xl leading-tight"
                            style={{ color: TEXT }}
                        >
                            {node.label}
                        </h2>

                        {/* Node type pill */}
                        <p
                            className="font-mono text-[8px] mt-1.5 tracking-wider"
                            style={{ color: 'rgba(154,176,204,0.35)' }}
                        >
                            {NODE_TYPE_LABEL[node.nodeType]} Node
                        </p>
                    </div>

                    {/* ── Content — crossfades on node change ────────────────── */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={node.id}
                            className="flex-1 overflow-y-auto px-5 py-5 space-y-6"
                            style={{ scrollbarWidth: 'none' }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >

                            {/* ── Focus Mode CTA — project nodes only ────────── */}
                            {isProject && onEnterFocus && (
                                <section>
                                    <motion.button
                                        onClick={onEnterFocus}
                                        className="w-full py-4 rounded-xl font-mono text-[10px] tracking-widest uppercase relative overflow-hidden"
                                        style={{
                                            background: 'rgba(61,227,255,0.07)',
                                            border:     '1px solid rgba(61,227,255,0.26)',
                                            color:       ACCENT,
                                            boxShadow:  '0 0 24px rgba(61,227,255,0.07), inset 0 1px 0 rgba(61,227,255,0.12)',
                                        }}
                                        whileHover={{
                                            background: 'rgba(61,227,255,0.12)',
                                            boxShadow:  '0 0 36px rgba(61,227,255,0.14), inset 0 1px 0 rgba(61,227,255,0.18)',
                                        }}
                                        whileTap={{ scale: 0.985 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        ↗ Enter Focus Mode
                                    </motion.button>
                                    <p
                                        className="text-center font-mono text-[8px] mt-2 leading-snug"
                                        style={{ color: 'rgba(154,176,204,0.28)' }}
                                    >
                                        Explore pipeline · tech stack · architecture
                                    </p>
                                </section>
                            )}

                            {/* ── Summary ─────────────────────────────────────── */}
                            <section>
                                <SectionLabel>Summary</SectionLabel>
                                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                                    {node.summary}
                                </p>
                            </section>

                            {/* ── Highlights ──────────────────────────────────── */}
                            {node.bullets.length > 0 && (
                                <section>
                                    <SectionLabel>Highlights</SectionLabel>
                                    <ul className="space-y-2.5">
                                        {node.bullets.map((b, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 text-xs leading-relaxed"
                                                style={{ color: MUTED }}
                                            >
                                                <span
                                                    className="shrink-0 mt-px text-[10px]"
                                                    style={{ color: ACCENT }}
                                                >
                                                    ▸
                                                </span>
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {/* ── Tech Stack ──────────────────────────────────── */}
                            {node.tech && node.tech.length > 0 && (
                                <section>
                                    <SectionLabel>Tech Stack</SectionLabel>
                                    <div className="flex flex-wrap gap-1.5">
                                        {node.tech.map(t => (
                                            <span
                                                key={t}
                                                className="font-mono text-[8px] px-2 py-0.5 rounded-md"
                                                style={{
                                                    background: 'rgba(61,227,255,0.05)',
                                                    border:     '1px solid rgba(61,227,255,0.13)',
                                                    color:      'rgba(61,227,255,0.68)',
                                                }}
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Links ───────────────────────────────────────── */}
                            {node.links && Object.keys(node.links).length > 0 && (
                                <section>
                                    <SectionLabel>Links</SectionLabel>
                                    <div className="flex flex-wrap gap-2">
                                        {node.links.github && (
                                            <a
                                                href={node.links.github}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={linkBtn}
                                                style={linkStyle}
                                                onMouseEnter={linkHover}
                                                onMouseLeave={linkUnhover}
                                            >
                                                <Github size={11} /> GitHub
                                            </a>
                                        )}
                                        {node.links.demo && (
                                            <a
                                                href={node.links.demo}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={linkBtn}
                                                style={linkStyle}
                                                onMouseEnter={linkHover}
                                                onMouseLeave={linkUnhover}
                                            >
                                                <ExternalLink size={11} /> Demo
                                            </a>
                                        )}
                                        {node.links.email && (
                                            <a
                                                href={node.links.email}
                                                className={linkBtn}
                                                style={linkStyle}
                                                onMouseEnter={linkHover}
                                                onMouseLeave={linkUnhover}
                                            >
                                                <Mail size={11} /> Email
                                            </a>
                                        )}
                                        {node.links.linkedin && (
                                            <a
                                                href={node.links.linkedin}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={linkBtn}
                                                style={linkStyle}
                                                onMouseEnter={linkHover}
                                                onMouseLeave={linkUnhover}
                                            >
                                                <Linkedin size={11} /> LinkedIn
                                            </a>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* ── Related nodes ───────────────────────────────── */}
                            {relatedLabels && relatedLabels.length > 0 && (
                                <section>
                                    <SectionLabel>Related</SectionLabel>
                                    <div className="flex flex-wrap gap-1.5">
                                        {relatedLabels.map(label => (
                                            <span
                                                key={label}
                                                className="font-mono text-[8px] px-2.5 py-0.5 rounded-full"
                                                style={{
                                                    background: 'rgba(154,176,204,0.05)',
                                                    border:     '1px solid rgba(154,176,204,0.11)',
                                                    color:      'rgba(154,176,204,0.42)',
                                                }}
                                            >
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Bottom spacer so last section isn't flush against edge */}
                            <div className="h-2" />
                        </motion.div>
                    </AnimatePresence>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p
            className="font-mono text-[8px] uppercase tracking-widest mb-2.5"
            style={{ color: 'rgba(154,176,204,0.38)' }}
        >
            {children}
        </p>
    );
}
