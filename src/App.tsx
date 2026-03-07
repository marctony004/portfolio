import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BootSequence } from './components/BootSequence';
import { Intro } from './components/Intro';
import { BrainMap } from './components/BrainMap';
import { InspectorPanel } from './components/InspectorPanel';
import { CommandPalette } from './components/CommandPalette';
import { RecruiterView } from './components/RecruiterView';
import { MobileLanding } from './components/MobileLanding';
import { ShortcutHelp } from './components/ShortcutHelp';
import { PortfolioAssistant } from './components/PortfolioAssistant';
import type { OrbitNodeData, ChildNodeData } from './data/brainData';

import { SphereTransition } from './components/SphereTransition';

const GestureDemo  = lazy(() => import('./components/GestureDemo'));
const BrainSphere  = lazy(() => import('./components/BrainSphere'));

type SelectedNode = (OrbitNodeData | ChildNodeData) & { id: string };

function App() {
    const [bootDone,      setBootDone]      = useState(false);
    const [entered,       setEntered]       = useState(false);
    const [selected,      setSelected]      = useState<SelectedNode | null>(null);
    const [palette,       setPalette]       = useState(false);
    const [jumpTo,        setJumpTo]        = useState<string | null>(null);
    const [isMobile,        setIsMobile]        = useState(false);
    const [mobilePastGate,  setMobilePastGate]  = useState(false);
    const [mobileViewMap,   setMobileViewMap]   = useState(false);
    const [recruiterMode,   setRecruiterMode]   = useState(false);
    const [gestureDemo,   setGestureDemo]   = useState(false);
    const [spherePhase,   setSpherePhase]   = useState<'off' | 'transitioning' | 'on'>('off');
    const [helpOpen,      setHelpOpen]      = useState(false);
    const sphereTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            if (e.key === '/' && !palette && !helpOpen && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                setPalette(true);
            }
            if (e.key === '?' && !palette && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                setHelpOpen(h => !h);
            }
            if (e.key === 'Escape' && selected && !palette && !helpOpen) {
                setSelected(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [entered, palette, selected, helpOpen]);

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
                        {isMobile && !mobilePastGate && !mobileViewMap ? (
                            /* Mobile: best-on-desktop gate */
                            <MobileLanding
                                onContinue={() => setMobilePastGate(true)}
                                onViewMap={() => setMobileViewMap(true)}
                            />
                        ) : isMobile && mobilePastGate ? (
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
                                        contracting={spherePhase === 'transitioning'}
                                    />
                                </div>

                                {/* Inspector */}
                                <InspectorPanel
                                    node={selected}
                                    onClose={() => setSelected(null)}
                                    onBreadcrumb={() => { setSelected(null); setJumpTo('projects'); }}
                                    onGestureDemo={() => setGestureDemo(true)}
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

                                {/* Gesture demo global trigger */}
                                <button
                                    onClick={() => setGestureDemo(true)}
                                    className="fixed top-12 left-4 z-50 flex items-center gap-1.5 font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-full transition-colors hover:text-accent"
                                    style={{
                                        background: 'rgba(11,18,32,0.85)',
                                        border: '1px solid rgba(61,227,255,0.15)',
                                        backdropFilter: 'blur(10px)',
                                        color: 'rgba(154,176,204,0.6)',
                                        marginTop: '0.4rem',
                                    }}
                                >
                                    <span style={{ color: '#3DE3FF', fontSize: 11 }}>✋</span> Gesture Demo
                                </button>

                                {/* Brain Sphere trigger */}
                                <button
                                    onClick={() => {
                                        if (spherePhase !== 'off') return;
                                        if (sphereTimerRef.current) clearTimeout(sphereTimerRef.current);
                                        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                                        if (reduced) { setSpherePhase('on'); return; }
                                        setSpherePhase('transitioning');
                                        sphereTimerRef.current = setTimeout(() => setSpherePhase('on'), 2500);
                                    }}
                                    className="fixed top-[5.4rem] left-4 z-50 flex items-center gap-1.5 font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-full transition-colors hover:text-accent"
                                    style={{
                                        background: 'rgba(11,18,32,0.85)',
                                        border: '1px solid rgba(61,227,255,0.15)',
                                        backdropFilter: 'blur(10px)',
                                        color: 'rgba(154,176,204,0.6)',
                                    }}
                                >
                                    <span style={{ color: '#3DE3FF', fontSize: 11 }}>◉</span> Brain Sphere
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

            {/* Keyboard shortcut help */}
            <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

            {/* AI Portfolio Assistant */}
            {entered && <PortfolioAssistant />}

            {/* Brain Sphere — preloads during transition, revealed when phase = 'on' */}
            {/* visibility:hidden keeps the WebGL context alive without showing anything */}
            <div style={{ visibility: spherePhase === 'transitioning' ? 'hidden' : 'visible' }}>
                {spherePhase !== 'off' && (
                    <Suspense fallback={
                        spherePhase === 'on' ? (
                            <div
                                className="fixed inset-0 z-[110] flex flex-col items-center justify-center gap-4"
                                style={{ background: '#0B1220' }}
                            >
                                <div className="flex gap-1.5">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={i}
                                            className="rounded-full animate-pulse"
                                            style={{
                                                width: 6, height: 6,
                                                background: '#3DE3FF',
                                                animationDelay: `${i * 0.18}s`,
                                                opacity: 0.7,
                                            }}
                                        />
                                    ))}
                                </div>
                                <p className="font-mono text-[11px]" style={{ color: 'rgba(154,176,204,0.45)' }}>
                                    Loading Brain Sphere…
                                </p>
                                <button
                                    onClick={() => setSpherePhase('off')}
                                    className="font-mono text-[10px] mt-2"
                                    style={{ color: 'rgba(154,176,204,0.25)' }}
                                >
                                    cancel
                                </button>
                            </div>
                        ) : null
                    }>
                        <BrainSphere
                            runWave={spherePhase === 'on'}
                            onClose={() => {
                                if (sphereTimerRef.current) clearTimeout(sphereTimerRef.current);
                                setSpherePhase('off');
                            }}
                        />
                    </Suspense>
                )}
            </div>

            {/* Cinematic morph overlay — plays during 'transitioning' phase */}
            <AnimatePresence>
                {spherePhase === 'transitioning' && (
                    <SphereTransition key="sphere-transition" />
                )}
            </AnimatePresence>

            {/* Gesture Demo overlay — lazy loaded */}
            <AnimatePresence>
                {gestureDemo && (
                    <Suspense fallback={null}>
                        <GestureDemo onClose={() => setGestureDemo(false)} />
                    </Suspense>
                )}
            </AnimatePresence>

        </div>
    );
}

export default App;
