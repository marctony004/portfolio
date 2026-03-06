import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { orbitNodes } from '../data/brainData';

export const MobileList = () => {
    const [open, setOpen] = useState<string | null>(null);

    return (
        <div className="min-h-screen px-4 py-20 max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <p className="font-mono text-[10px] text-accent/60 tracking-[0.4em] uppercase mb-3">Portfolio · 2025</p>
                <h1 className="font-sans font-bold text-3xl text-text mb-1">Marc Smith</h1>
                <p className="font-mono text-sm text-accent">AI / ML Engineer · Full-Stack Developer</p>
            </div>

            {/* Node list */}
            <div className="space-y-3">
                {orbitNodes.map((node, i) => (
                    <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.35 }}
                    >
                        <button
                            className="w-full text-left rounded-lg p-4 transition-colors"
                            style={{
                                background: open === node.id ? 'rgba(17,26,46,0.95)' : 'rgba(17,26,46,0.7)',
                                border: `1px solid ${open === node.id ? 'rgba(61,227,255,0.3)' : 'rgba(61,227,255,0.1)'}`,
                            }}
                            onClick={() => setOpen(open === node.id ? null : node.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-sans font-semibold text-text">{node.label}</span>
                                    <p className="font-mono text-[11px] text-muted/70 mt-0.5">{node.tooltip}</p>
                                </div>
                                <motion.div animate={{ rotate: open === node.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronDown size={16} color="rgba(154,176,204,0.6)" />
                                </motion.div>
                            </div>
                        </button>

                        <AnimatePresence>
                            {open === node.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="rounded-b-lg p-4 pt-3 space-y-4"
                                        style={{ background: 'rgba(17,26,46,0.6)', border: '1px solid rgba(61,227,255,0.08)', borderTop: 'none' }}>

                                        <p className="text-muted text-sm leading-relaxed">{node.summary}</p>

                                        {node.tech && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {node.tech.map(t => <span key={t} className="chip">{t}</span>)}
                                            </div>
                                        )}

                                        <ul className="space-y-2">
                                            {node.bullets.map((b, j) => (
                                                <li key={j} className="flex items-start gap-2 text-sm text-muted">
                                                    <span className="text-accent mt-0.5 shrink-0">▸</span>
                                                    <span className="leading-relaxed">{b}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Children */}
                                        {node.children && (
                                            <div className="space-y-2 pt-1">
                                                <p className="font-mono text-[10px] text-muted/50 tracking-widest uppercase">Projects</p>
                                                {node.children.map(c => (
                                                    <div key={c.id} className="rounded-md p-3"
                                                        style={{ background: 'rgba(61,227,255,0.04)', border: '1px solid rgba(61,227,255,0.1)' }}>
                                                        <p className="font-sans font-semibold text-sm text-text mb-1">{c.label}</p>
                                                        <p className="font-mono text-[10px] text-muted/60 mb-2">{c.tooltip}</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {c.tech.map(t => <span key={t} className="chip">{t}</span>)}
                                                        </div>
                                                        {c.links?.github && (
                                                            <a href={c.links.github} target="_blank" rel="noreferrer"
                                                                className="inline-flex items-center gap-1 mt-2 font-mono text-[11px] text-accent/70 hover:text-accent transition-colors">
                                                                GitHub →
                                                            </a>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
