import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BootSequence } from './components/BootSequence';
import { Intro } from './components/Intro';
import { BrainMap } from './components/BrainMap';
import { InspectorPanel } from './components/InspectorPanel';
import { CommandPalette } from './components/CommandPalette';
import { RecruiterView } from './components/RecruiterView';
import type { OrbitNodeData, ChildNodeData } from './data/brainData';

type SelectedNode = (OrbitNodeData | ChildNodeData) & { id: string };

function App() {
    const [bootDone,      setBootDone]      = useState(false);
    const [entered,       setEntered]       = useState(false);
    const [selected,      setSelected]      = useState<SelectedNode | null>(null);
    const [palette,       setPalette]       = useState(false);
    const [jumpTo,        setJumpTo]        = useState<string | null>(null);
    const [isMobile,      setIsMobile]      = useState(false);
    const [recruiterMode, setRecruiterMode] = useState(false);

    // Responsive check
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // "/" key opens command palette; Escape closes inspector
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!entered) return;
            if (e.key === '/' && !palette && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                setPalette(true);
            }
            if (e.key === 'Escape' && selected && !palette) {
                setSelected(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [entered, palette, selected]);

    // Write URL hash when selection changes
    useEffect(() => {
        if (!entered) return;
        if (selected) window.history.replaceState(null, '', `#node:${selected.id}`);
        else window.history.replaceState(null, '', window.location.pathname);
    }, [selected, entered]);

    // Read URL hash on enter to deep-link into a node
    useEffect(() => {
        if (!entered) return;
        const hash = window.location.hash;
        if (hash.startsWith('#node:')) setTimeout(() => setJumpTo(hash.slice(6)), 500);
    }, [entered]);

    const handleCommand = useCallback((action: string) => {
        if (action === 'resume')          { window.open('/resume.html', '_blank'); return; }
        if (action === 'copy:github')     { navigator.clipboard.writeText('https://github.com/marctony004'); return; }
        if (action === 'contact:email')   { window.open('mailto:marc.tonysmith@gmail.com', '_blank'); return; }
        if (action === 'recruiter')       { setRecruiterMode(true); return; }
        if (action.startsWith('node:'))   { setJumpTo(action.slice(5)); }
    }, []);

    return (
        <div className="w-full min-h-screen" style={{ background: '#0B1220' }}>
            {/* Noise SVG filter (subtle texture) */}
            <svg className="absolute w-0 h-0">
                <defs>
                    <filter id="noise">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                        <feColorMatrix type="saturate" values="0" />
                        <feBlend in="SourceGraphic" mode="overlay" />
                    </filter>
                </defs>
            </svg>

            <AnimatePresence mode="wait">
                {!bootDone ? (
                    <BootSequence key="boot" onComplete={() => setBootDone(true)} />
                ) : !entered ? (
                    <Intro key="intro" onEnter={() => setEntered(true)} />
                ) : (
                    <motion.div
                        key="app"
                        className="w-full h-screen flex overflow-hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        {isMobile ? (
                            /* Mobile: recruiter-style scrollable view */
                            <div className="w-full overflow-y-auto">
                                <RecruiterView showBack={false} onBack={() => {}} />
                            </div>
                        ) : recruiterMode ? (
                            /* Recruiter view */
                            <AnimatePresence mode="wait">
                                <RecruiterView key="recruiter" onBack={() => setRecruiterMode(false)} />
                            </AnimatePresence>
                        ) : (
                            /* Desktop: brain map + inspector */
                            <>
                                {/* Brain map — fills remaining space */}
                                <div className="flex-1 relative" style={{ minWidth: 0 }}>
                                    <BrainMap
                                        onSelect={node => setSelected(node)}
                                        selectedId={selected?.id ?? null}
                                        jumpTo={jumpTo}
                                        onJumpDone={() => setJumpTo(null)}
                                        paletteOpen={palette}
                                    />
                                </div>

                                {/* Inspector */}
                                <InspectorPanel
                                    node={selected}
                                    onClose={() => setSelected(null)}
                                    onBreadcrumb={() => { setSelected(null); setJumpTo('projects'); }}
                                />

                                {/* Recruiter mode toggle */}
                                <button
                                    onClick={() => setRecruiterMode(true)}
                                    className="fixed top-4 left-4 z-50 flex items-center gap-1.5 font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-full transition-colors hover:text-accent"
                                    style={{
                                        background: 'rgba(11,18,32,0.85)',
                                        border: '1px solid rgba(61,227,255,0.15)',
                                        backdropFilter: 'blur(10px)',
                                        color: 'rgba(154,176,204,0.6)',
                                    }}
                                >
                                    <span style={{ color: '#3DE3FF', fontSize: 11 }}>⊞</span> Recruiter View
                                </button>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Command palette */}
            <CommandPalette
                open={palette}
                onClose={() => setPalette(false)}
                onAction={handleCommand}
            />

            {/* "/" hint when no inspector open */}
            {entered && !isMobile && !selected && (
                <div className="fixed bottom-4 right-4 pointer-events-none z-10">
                    <p className="font-mono text-[10px] text-muted/30 tracking-widest">
                        Press <span className="text-accent/40">/</span> to search
                    </p>
                </div>
            )}
        </div>
    );
}

export default App;
