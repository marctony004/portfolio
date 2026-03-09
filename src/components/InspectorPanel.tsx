import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Github, ExternalLink, Mail, Linkedin, ChevronLeft, Copy, Check } from 'lucide-react';
import { orbitNodes } from '../data/brainData';
import type { OrbitNodeData, ChildNodeData } from '../data/brainData';
import { ContactForm } from './ContactForm';
import { ACCENT, MUTED } from '../theme';

type AnyNode = (OrbitNodeData | ChildNodeData) & { id: string };

interface Props {
    node: AnyNode | null;
    onClose: () => void;
    onBreadcrumb?: () => void;
    isMobile?: boolean;
}

// Tab bar height on mobile — keep in sync with App.tsx
const TAB_BAR_H = 56;

export const InspectorPanel = ({ node, onClose, onBreadcrumb, isMobile = false }: Props) => {
    const dragControls = useDragControls();
    const links     = (node as OrbitNodeData)?.links;
    const childNode = node as ChildNodeData;
    const pipeline  = childNode?.pipeline;
    const isChild   = !orbitNodes.some(n => n.id === node?.id) && !!onBreadcrumb;

    const [activeStep, setActiveStep] = useState(0);
    const [copied, setCopied]         = useState(false);

    // Reset active step when node changes
    useEffect(() => { setActiveStep(0); }, [node?.id]);

    const handleCopyPipeline = () => {
        if (!pipeline) return;
        navigator.clipboard.writeText(pipeline.map(s => s.label).join(' → '));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Shared content — used by both desktop panel and mobile sheet
    const panelContent = (
        <>
            {/* Summary */}
            <div>
                <p className="font-mono text-[10px] text-muted/60 tracking-widest uppercase mb-2">Summary</p>
                <p className="text-muted text-sm leading-relaxed">{node?.summary}</p>
            </div>

            {/* Pipeline diagram */}
            {pipeline && pipeline.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="font-mono text-[10px] text-muted/60 tracking-widest uppercase">Pipeline</p>
                        <button
                            onClick={handleCopyPipeline}
                            className="flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded transition-colors"
                            style={{
                                background: 'rgba(61,227,255,0.04)',
                                border: '1px solid rgba(61,227,255,0.10)',
                                color: copied ? ACCENT : 'rgba(154,176,204,0.4)',
                            }}
                        >
                            {copied ? <Check size={9} /> : <Copy size={9} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 mb-3">
                        {pipeline.flatMap((step, i) => {
                            const isActive = activeStep === i;
                            const stepEl = (
                                <motion.button
                                    key={`step-${i}`}
                                    onClick={() => setActiveStep(i)}
                                    className="font-mono text-[10px] px-2 py-1 rounded whitespace-nowrap transition-all"
                                    style={{
                                        background: isActive ? 'rgba(61,227,255,0.10)' : 'rgba(61,227,255,0.04)',
                                        border: `1px solid ${isActive ? 'rgba(61,227,255,0.40)' : 'rgba(154,176,204,0.14)'}`,
                                        color: isActive ? ACCENT : MUTED,
                                        boxShadow: isActive ? '0 0 12px rgba(61,227,255,0.15)' : 'none',
                                        cursor: 'pointer',
                                    }}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.25 + i * 0.08, duration: 0.22 }}
                                >
                                    {step.label}
                                </motion.button>
                            );
                            if (i < pipeline.length - 1) {
                                return [stepEl, (
                                    <motion.span key={`arrow-${i}`} className="font-mono text-[10px]"
                                        style={{ color: 'rgba(61,227,255,0.25)' }}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 + i * 0.08 }}
                                    >→</motion.span>
                                )];
                            }
                            return [stepEl];
                        })}
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.div key={activeStep}
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            className="rounded p-3 space-y-2"
                            style={{ background: 'rgba(61,227,255,0.03)', border: '1px solid rgba(61,227,255,0.08)' }}
                        >
                            <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: 'rgba(61,227,255,0.45)' }}>
                                Stage {activeStep + 1} · {pipeline[activeStep].label}
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>
                                {pipeline[activeStep].detail}
                            </p>
                            {pipeline[activeStep].tools && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                    {pipeline[activeStep].tools!.map(t => (
                                        <span key={t} className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                                            style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.14)', color: 'rgba(61,227,255,0.65)' }}
                                        >{t}</span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            {/* Tech stack */}
            {'tech' in (node ?? {}) && (node as { tech?: string[] }).tech && (node as { tech?: string[] }).tech!.length > 0 && (
                <div>
                    <p className="font-mono text-[10px] text-muted/60 tracking-widest uppercase mb-3">Tech Stack</p>
                    <div className="flex flex-wrap gap-2">
                        {(node as { tech: string[] }).tech.map((t: string) => (
                            <span key={t} className="chip">{t}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Impact bullets */}
            <div>
                <p className="font-mono text-[10px] text-muted/60 tracking-widest uppercase mb-3">Highlights</p>
                <ul className="space-y-2.5">
                    {node?.bullets.map((b, i) => (
                        <motion.li key={i} className="flex items-start gap-2.5 text-sm text-muted"
                            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.07, duration: 0.3 }}
                        >
                            <span className="mt-0.5 shrink-0 leading-none" style={{ color: ACCENT }}>▸</span>
                            <span className="leading-relaxed">{b}</span>
                        </motion.li>
                    ))}
                </ul>
            </div>

            {/* Links */}
            {(links || childNode?.links) && (
                <div>
                    <p className="font-mono text-[10px] text-muted/60 tracking-widest uppercase mb-3">Links</p>
                    <div className="flex flex-wrap gap-2">
                        {(links?.github || childNode?.links?.github) && (
                            <a href={links?.github || childNode?.links?.github} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded text-sm font-mono transition-colors text-muted hover:text-accent"
                                style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.15)' }}>
                                <Github size={13} /> GitHub
                            </a>
                        )}
                        {(links?.demo || childNode?.links?.demo) && (
                            <a href={links?.demo || childNode?.links?.demo} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded text-sm font-mono transition-colors text-muted hover:text-accent"
                                style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.15)' }}>
                                <ExternalLink size={13} /> Demo
                            </a>
                        )}
                        {links?.email && (
                            <a href={links.email}
                                className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded text-sm font-mono transition-colors text-muted hover:text-accent"
                                style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.15)' }}>
                                <Mail size={13} /> Email
                            </a>
                        )}
                        {links?.linkedin && (
                            <a href={links.linkedin} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 rounded text-sm font-mono transition-colors text-muted hover:text-accent"
                                style={{ background: 'rgba(61,227,255,0.06)', border: '1px solid rgba(61,227,255,0.15)' }}>
                                <Linkedin size={13} /> LinkedIn
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Contact form — only on the Contact node */}
            {node?.id === 'contact' && (
                <div>
                    <p className="font-mono text-[10px] text-muted/60 tracking-widest uppercase mb-3">Send a Message</p>
                    <ContactForm />
                </div>
            )}
        </>
    );

    // Shared header content
    const panelHeader = node && (
        <>
            <div className="flex-1 min-w-0">
                {isChild ? (
                    <button onClick={onBreadcrumb}
                        className="flex items-center gap-0.5 font-mono text-[10px] mb-1.5 transition-colors hover:text-accent"
                        style={{ color: 'rgba(61,227,255,0.45)' }}
                    >
                        <ChevronLeft size={11} /> Projects
                    </button>
                ) : (
                    <p className="font-mono text-[10px] tracking-widest uppercase mb-1"
                        style={{ color: 'rgba(61,227,255,0.5)' }}>Overview</p>
                )}
                <h2 className="font-sans font-semibold text-xl text-text leading-tight truncate">{node.label}</h2>
            </div>
            <button onClick={onClose}
                className="p-2 rounded text-muted hover:text-text transition-colors mt-0.5 ml-3 shrink-0"
                style={{ background: 'rgba(154,176,204,0.06)' }}
            >
                <X size={16} />
            </button>
        </>
    );

    return (
        <AnimatePresence>
            {node && (
                isMobile ? (
                    /* ── Mobile: bottom sheet ── */
                    <motion.div
                        key={node.id}
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 80 || info.velocity.y > 500) onClose();
                        }}
                        style={{
                            position: 'fixed',
                            bottom: TAB_BAR_H,
                            left: 0, right: 0,
                            height: '72vh',
                            zIndex: 60,
                            borderRadius: '16px 16px 0 0',
                            background: 'rgba(17,26,46,0.96)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            borderTop: '1px solid rgba(61,227,255,0.12)',
                        }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                    >
                        {/* Drag handle — only this area initiates drag */}
                        <div
                            className="shrink-0 flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
                            onPointerDown={e => dragControls.start(e)}
                        >
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(61,227,255,0.18)' }} />
                        </div>

                        {/* Header */}
                        <div className="flex items-start justify-between px-5 pt-1 pb-3 border-b shrink-0"
                            style={{ borderColor: 'rgba(61,227,255,0.10)' }}
                            onPointerDown={e => e.stopPropagation()}
                        >
                            {panelHeader}
                        </div>

                        {/* Scrollable content — stopPropagation so scrolling doesn't trigger sheet drag */}
                        <div
                            className="flex-1 overflow-y-auto px-5 py-5 space-y-6"
                            onPointerDown={e => e.stopPropagation()}
                        >
                            {panelContent}
                        </div>
                    </motion.div>
                ) : (
                    /* ── Desktop: side panel ── */
                    <motion.aside
                        key={node.id}
                        className="fixed right-0 top-0 h-full w-full md:w-[32%] z-40 flex flex-col"
                        style={{
                            background: 'rgba(17,26,46,0.82)',
                            borderLeft: '1px solid rgba(61,227,255,0.12)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
                        }}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        <div className="absolute top-0 left-0 right-0 h-[1px]"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(61,227,255,0.25), transparent)' }} />

                        <div className="flex items-start justify-between p-6 pb-4 border-b border-accent/10">
                            {panelHeader}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {panelContent}
                        </div>

                        <div className="h-[1px] mx-6 mb-6"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(61,227,255,0.15), transparent)' }} />
                    </motion.aside>
                )
            )}
        </AnimatePresence>
    );
};
