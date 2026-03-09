import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Github, ExternalLink, Mail, Linkedin, FileText, Share2, X, Monitor } from 'lucide-react';
import { orbitNodes, skillGroups, workExperience, educationData, certifications } from '../data/brainData';

import { ACCENT, MUTED, TEXT } from '../theme';

interface Props { onBack: () => void; showBack?: boolean; }

const canShare = typeof navigator !== 'undefined' && !!navigator.share;

const ShareButton = () => {
    if (!canShare) return null;
    return (
        <button
            onClick={() => navigator.share({ title: 'Marc Smith — Portfolio', url: window.location.href })}
            className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded transition-colors sm:hidden"
            style={{
                background: 'rgba(61,227,255,0.06)',
                border: '1px solid rgba(61,227,255,0.15)',
                color: MUTED,
            }}
        >
            <Share2 size={11} /> Share
        </button>
    );
};

const DesktopBanner = () => {
    const [dismissed, setDismissed] = useState(false);
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <AnimatePresence>
            {!dismissed && (
                <motion.div
                    className="sm:hidden flex items-center justify-between gap-3 px-4 py-2.5"
                    style={{
                        background: 'rgba(61,227,255,0.04)',
                        borderBottom: '1px solid rgba(61,227,255,0.08)',
                    }}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <Monitor size={11} style={{ color: 'rgba(61,227,255,0.5)', flexShrink: 0 }} />
                        <span className="font-mono text-[10px] truncate" style={{ color: 'rgba(154,176,204,0.6)' }}>
                            Full interactive experience on desktop
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={copy}
                            className="font-mono text-[10px] px-2.5 py-1 rounded transition-colors"
                            style={{
                                background: copied ? 'rgba(61,227,255,0.12)' : 'rgba(61,227,255,0.07)',
                                border: '1px solid rgba(61,227,255,0.2)',
                                color: copied ? '#3DE3FF' : 'rgba(154,176,204,0.7)',
                            }}
                        >
                            {copied ? '✓ copied' : 'copy link'}
                        </button>
                        <button onClick={() => setDismissed(true)} style={{ color: 'rgba(154,176,204,0.35)' }}>
                            <X size={13} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="font-mono text-[10px] tracking-[0.35em] uppercase mb-5"
        style={{ color: 'rgba(61,227,255,0.5)', borderBottom: '1px solid rgba(61,227,255,0.08)', paddingBottom: '10px' }}>
        {children}
    </p>
);

const fadeUp = (i = 0) => ({
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.4, delay: i * 0.06, ease: 'easeOut' as const },
});

export const RecruiterView = ({ onBack, showBack = true }: Props) => {
    const projects  = orbitNodes.find(n => n.id === 'projects');
    const contact   = orbitNodes.find(n => n.id === 'contact');

    return (
        <motion.div
            className="w-full min-h-screen overflow-y-auto"
            style={{ background: '#0B1220' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* Sticky nav */}
            <div
                className="sticky top-0 z-50 px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
                style={{
                    background: 'rgba(11,18,32,0.96)',
                    borderBottom: '1px solid rgba(61,227,255,0.08)',
                    backdropFilter: 'blur(14px)',
                }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="font-sans font-bold text-text whitespace-nowrap">Marc Smith</span>
                    <span className="font-mono text-[11px] hidden sm:block" style={{ color: MUTED }}>
                        AI/ML Engineer · Full-Stack Developer
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <ShareButton />
                    <a
                        href="/resume.html"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-2.5 sm:py-1.5 rounded transition-colors"
                        style={{
                            background: 'rgba(61,227,255,0.06)',
                            border: '1px solid rgba(61,227,255,0.15)',
                            color: MUTED,
                        }}
                    >
                        <FileText size={11} /> Resume
                    </a>
                    {showBack && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-2.5 sm:py-1.5 rounded transition-colors hover:text-accent"
                            style={{
                                background: 'rgba(61,227,255,0.06)',
                                border: '1px solid rgba(61,227,255,0.15)',
                                color: MUTED,
                            }}
                        >
                            <ArrowLeft size={11} /> Back to Map
                        </button>
                    )}
                </div>
            </div>

            <DesktopBanner />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-14 sm:space-y-20">

                {/* ── Hero ── */}
                <motion.section {...fadeUp(0)}>
                    <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: ACCENT }}>
                        Portfolio · {new Date().getFullYear()}
                    </p>
                    <h1 className="font-sans font-bold text-3xl sm:text-4xl mb-2" style={{ color: TEXT, letterSpacing: '-0.5px' }}>
                        Marc Smith
                    </h1>
                    <p className="font-mono text-base mb-5" style={{ color: ACCENT }}>
                        AI / ML Engineer · Full-Stack Developer
                    </p>
                    <p className="text-sm leading-relaxed max-w-2xl" style={{ color: MUTED }}>
                        AI/ML practitioner with a background in leading high-impact projects — from building full-stack AI tools
                        that solve real problems to managing large retail teams. Trained machine learning models, deployed
                        computer vision pipelines, and integrated LLM APIs. Pursuing dual degrees in Applied AI and Business
                        Intelligence. I build tools that are functional and meaningful for real-world application.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-5">
                        {contact?.links?.email && (
                            <a href={contact.links.email}
                                className="flex items-center gap-1.5 font-mono text-[11px] px-4 py-2.5 sm:py-1.5 rounded transition-colors text-muted hover:text-accent"
                                style={{ background: 'rgba(61,227,255,0.05)', border: '1px solid rgba(61,227,255,0.12)' }}>
                                <Mail size={12} /> Email
                            </a>
                        )}
                        {contact?.links?.github && (
                            <a href={contact.links.github} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 font-mono text-[11px] px-4 py-2.5 sm:py-1.5 rounded transition-colors text-muted hover:text-accent"
                                style={{ background: 'rgba(61,227,255,0.05)', border: '1px solid rgba(61,227,255,0.12)' }}>
                                <Github size={12} /> GitHub
                            </a>
                        )}
                        {contact?.links?.linkedin && (
                            <a href={contact.links.linkedin} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 font-mono text-[11px] px-4 py-2.5 sm:py-1.5 rounded transition-colors text-muted hover:text-accent"
                                style={{ background: 'rgba(61,227,255,0.05)', border: '1px solid rgba(61,227,255,0.12)' }}>
                                <Linkedin size={12} /> LinkedIn
                            </a>
                        )}
                    </div>
                </motion.section>

                {/* ── Projects ── */}
                <section>
                    <motion.div {...fadeUp(0)}>
                        <SectionLabel>Projects</SectionLabel>
                    </motion.div>
                    <div className="space-y-5">
                        {projects?.children?.map((proj, i) => (
                            <motion.div
                                key={proj.id}
                                {...fadeUp(i)}
                                className="rounded-lg p-5"
                                style={{
                                    background: 'rgba(17,26,46,0.7)',
                                    border: '1px solid rgba(61,227,255,0.10)',
                                }}
                            >
                                {/* Project header */}
                                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                                    <div>
                                        <h3 className="font-sans font-semibold text-base" style={{ color: TEXT }}>
                                            {proj.label}
                                        </h3>
                                        <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(61,227,255,0.5)' }}>
                                            {proj.tooltip}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {proj.links?.github && (
                                            <a href={proj.links.github} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-1 font-mono text-[10px] px-2.5 py-2 sm:py-1 rounded transition-colors text-muted hover:text-accent"
                                                style={{ background: 'rgba(61,227,255,0.05)', border: '1px solid rgba(61,227,255,0.12)' }}>
                                                <Github size={11} /> GitHub
                                            </a>
                                        )}
                                        {proj.links?.demo && (
                                            <a href={proj.links.demo} target="_blank" rel="noreferrer"
                                                className="flex items-center gap-1 font-mono text-[10px] px-2.5 py-2 sm:py-1 rounded transition-colors text-muted hover:text-accent"
                                                style={{ background: 'rgba(61,227,255,0.05)', border: '1px solid rgba(61,227,255,0.12)' }}>
                                                <ExternalLink size={11} /> Demo
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Tech chips */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {proj.tech.map(t => (
                                        <span key={t} className="chip" style={{ fontSize: 9 }}>{t}</span>
                                    ))}
                                </div>

                                {/* Pipeline */}
                                {proj.pipeline && (
                                    <div className="flex items-center flex-wrap gap-1 mb-3 py-2 px-3 rounded"
                                        style={{ background: 'rgba(61,227,255,0.03)', border: '1px solid rgba(61,227,255,0.07)' }}>
                                        {proj.pipeline.flatMap((step, si) => {
                                            const el = (
                                                <span key={`s-${si}`} className="font-mono text-[9px]" style={{ color: MUTED }}>
                                                    {step.label}
                                                </span>
                                            );
                                            return si < proj.pipeline!.length - 1
                                                ? [el, <span key={`a-${si}`} className="font-mono text-[9px]" style={{ color: 'rgba(61,227,255,0.3)' }}>→</span>]
                                                : [el];
                                        })}
                                    </div>
                                )}

                                {/* Bullets */}
                                <ul className="space-y-1.5">
                                    {proj.bullets.slice(0, 3).map((b, bi) => (
                                        <li key={bi} className="flex items-start gap-2 text-xs" style={{ color: MUTED }}>
                                            <span className="shrink-0 mt-0.5" style={{ color: ACCENT }}>▸</span>
                                            <span className="leading-relaxed">{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── Skills ── */}
                <section>
                    <motion.div {...fadeUp(0)}>
                        <SectionLabel>Technical Skills</SectionLabel>
                    </motion.div>
                    <div className="space-y-3">
                        {skillGroups.map((group, i) => (
                            <motion.div key={group.label} {...fadeUp(i)} className="flex gap-4 flex-wrap sm:flex-nowrap">
                                <span className="font-mono text-[10px] w-28 shrink-0 pt-0.5" style={{ color: 'rgba(61,227,255,0.5)' }}>
                                    {group.label}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {group.items.map(item => (
                                        <span key={item} className="chip" style={{ fontSize: 10 }}>{item}</span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── Experience ── */}
                <section>
                    <motion.div {...fadeUp(0)}>
                        <SectionLabel>Work Experience</SectionLabel>
                    </motion.div>
                    <div className="space-y-8">
                        {workExperience.map((job, i) => (
                            <motion.div key={job.title} {...fadeUp(i)}>
                                <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
                                    <h3 className="font-sans font-semibold text-sm" style={{ color: TEXT }}>{job.title}</h3>
                                    <span className="font-mono text-[10px]" style={{ color: MUTED }}>{job.period}</span>
                                </div>
                                {job.location && (
                                    <p className="font-mono text-[10px] mb-2" style={{ color: 'rgba(61,227,255,0.4)' }}>{job.location}</p>
                                )}
                                <ul className="space-y-1.5">
                                    {job.bullets.map((b, bi) => (
                                        <li key={bi} className="flex items-start gap-2 text-xs" style={{ color: MUTED }}>
                                            <span className="shrink-0 mt-0.5" style={{ color: ACCENT }}>▸</span>
                                            <span className="leading-relaxed">{b}</span>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── Education & Certs ── */}
                <section>
                    <motion.div {...fadeUp(0)}>
                        <SectionLabel>Education & Certifications</SectionLabel>
                    </motion.div>
                    <div className="grid sm:grid-cols-2 gap-8">
                        {/* Education */}
                        <motion.div {...fadeUp(0)} className="space-y-3">
                            {educationData.map((ed, i) => (
                                <div key={i}>
                                    <p className="font-sans font-medium text-sm" style={{ color: TEXT }}>{ed.degree}</p>
                                    <p className="font-mono text-[10px]" style={{ color: 'rgba(61,227,255,0.5)' }}>
                                        {ed.school} · {ed.period}
                                    </p>
                                </div>
                            ))}
                        </motion.div>
                        {/* Certs */}
                        <motion.div {...fadeUp(1)} className="space-y-2">
                            {certifications.map((cert, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                                    <span style={{ color: ACCENT }}>·</span> {cert}
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* ── Footer ── */}
                <motion.div {...fadeUp(0)} className="border-t pt-8 flex items-center justify-between flex-wrap gap-4"
                    style={{ borderColor: 'rgba(61,227,255,0.08)' }}>
                    <p className="font-mono text-[10px]" style={{ color: 'rgba(154,176,204,0.4)' }}>
                        Based in Miami, FL · Open to remote & hybrid
                    </p>
                    {showBack && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1.5 rounded transition-colors hover:text-accent"
                            style={{ background: 'rgba(61,227,255,0.05)', border: '1px solid rgba(61,227,255,0.12)', color: MUTED }}
                        >
                            <ArrowLeft size={11} /> Back to Brain Map
                        </button>
                    )}
                </motion.div>

            </div>
        </motion.div>
    );
};
