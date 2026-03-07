import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, ExternalLink, Mail, Linkedin } from 'lucide-react';
import { ACCENT, MUTED, TEXT } from '../../theme';
import type { SphereNodeData } from '../../data/sphereGraph';

interface Props {
    node:    SphereNodeData | null;
    onClose: () => void;
}

export function SphereInspector({ node, onClose }: Props) {
    return (
        <AnimatePresence>
            {node && (
                <motion.aside
                    key={node.id}
                    className="absolute top-0 right-0 bottom-0 flex flex-col z-20"
                    style={{
                        width: 'min(340px, 35vw)',
                        background: 'rgba(13,20,38,0.95)',
                        borderLeft: '1px solid rgba(61,227,255,0.12)',
                        backdropFilter: 'blur(18px)',
                        WebkitBackdropFilter: 'blur(18px)',
                        boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
                    }}
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    {/* Top edge highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[1px]"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(61,227,255,0.22), transparent)' }} />

                    {/* Header */}
                    <div className="flex items-start justify-between px-5 py-4 shrink-0"
                        style={{ borderBottom: '1px solid rgba(61,227,255,0.09)' }}>
                        <div className="min-w-0 flex-1">
                            <p className="font-mono text-[9px] tracking-widest uppercase mb-1"
                                style={{ color: 'rgba(61,227,255,0.5)' }}>
                                {node.category}
                            </p>
                            <h2 className="font-sans font-semibold text-lg leading-tight truncate"
                                style={{ color: TEXT }}>
                                {node.label}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-3 mt-0.5 p-1.5 rounded shrink-0 transition-colors"
                            style={{ color: 'rgba(154,176,204,0.4)', background: 'rgba(154,176,204,0.06)' }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                        {/* Summary */}
                        <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest mb-2"
                                style={{ color: 'rgba(154,176,204,0.45)' }}>Summary</p>
                            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{node.summary}</p>
                        </div>

                        {/* Tech stack */}
                        {node.tech && node.tech.length > 0 && (
                            <div>
                                <p className="font-mono text-[9px] uppercase tracking-widest mb-2.5"
                                    style={{ color: 'rgba(154,176,204,0.45)' }}>Tech Stack</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {node.tech.map(t => (
                                        <span
                                            key={t}
                                            className="font-mono text-[9px] px-2 py-0.5 rounded"
                                            style={{
                                                background: 'rgba(61,227,255,0.06)',
                                                border: '1px solid rgba(61,227,255,0.15)',
                                                color: 'rgba(61,227,255,0.7)',
                                            }}
                                        >{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Highlights */}
                        <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest mb-2.5"
                                style={{ color: 'rgba(154,176,204,0.45)' }}>Highlights</p>
                            <ul className="space-y-2">
                                {node.bullets.map((b, i) => (
                                    <motion.li
                                        key={i}
                                        className="flex items-start gap-2 text-xs"
                                        style={{ color: MUTED }}
                                        initial={{ opacity: 0, x: 8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + i * 0.06 }}
                                    >
                                        <span className="shrink-0 mt-0.5" style={{ color: ACCENT }}>▸</span>
                                        <span className="leading-relaxed">{b}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>

                        {/* Links */}
                        {node.links && Object.keys(node.links).length > 0 && (
                            <div>
                                <p className="font-mono text-[9px] uppercase tracking-widest mb-2.5"
                                    style={{ color: 'rgba(154,176,204,0.45)' }}>Links</p>
                                <div className="flex flex-wrap gap-2">
                                    {node.links.github && (
                                        <a href={node.links.github} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors"
                                            style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.15)', color: MUTED }}
                                            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                                            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
                                            <Github size={12} /> GitHub
                                        </a>
                                    )}
                                    {node.links.demo && (
                                        <a href={node.links.demo} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors"
                                            style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.15)', color: MUTED }}
                                            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                                            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
                                            <ExternalLink size={12} /> Demo
                                        </a>
                                    )}
                                    {node.links.email && (
                                        <a href={node.links.email}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors"
                                            style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.15)', color: MUTED }}
                                            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                                            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
                                            <Mail size={12} /> Email
                                        </a>
                                    )}
                                    {node.links.linkedin && (
                                        <a href={node.links.linkedin} target="_blank" rel="noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors"
                                            style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.15)', color: MUTED }}
                                            onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                                            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
                                            <Linkedin size={12} /> LinkedIn
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}
