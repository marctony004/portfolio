import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Network, FileText as FileTextIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BootSequence } from './components/BootSequence';
import { Intro } from './components/Intro';
import { BrainMap } from './components/BrainMap';
import { InspectorPanel } from './components/InspectorPanel';
import { CommandPalette } from './components/CommandPalette';
import { RecruiterView } from './components/RecruiterView';
import { ShortcutHelp } from './components/ShortcutHelp';
import { PortfolioAssistant } from './components/PortfolioAssistant';
import { GuidedTour } from './components/GuidedTour';
import { TOUR_STEPS } from './data/tourSteps';
import type { OrbitNodeData, ChildNodeData } from './data/brainData';

import { SphereTransition } from './components/SphereTransition';

const BrainSphere  = lazy(() => import('./components/BrainSphere'));

type SelectedNode = (OrbitNodeData | ChildNodeData) & { id: string };


function App() {
    const [bootDone,      setBootDone]      = useState(false);
    const [entered,       setEntered]       = useState(false);
    const [selected,      setSelected]      = useState<SelectedNode | null>(null);
    const [palette,       setPalette]       = useState(false);
    const [jumpTo,        setJumpTo]        = useState<string | null>(null);
    const [isMobile,        setIsMobile]        = useState(false);
    const [mobileView,      setMobileView]      = useState<'map' | 'resume'>('map');
    const [recruiterMode,   setRecruiterMode]   = useState(false);
    const [spherePhase,   setSpherePhase]   = useState<'off' | 'transitioning' | 'on'>('off');
    const [helpOpen,      setHelpOpen]      = useState(false);
    const sphereTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Guided tour state ────────────────────────────────────────────────────
    const [isTourActive,     setIsTourActive]     = useState(false);
    const [isTourBooting,    setIsTourBooting]    = useState(false); // boot sequence before step 1
    const [tourStep,         setTourStep]         = useState(0);
    const [isTourPaused,     setIsTourPaused]     = useState(false);
    const [isUserExploring,  setIsUserExploring]  = useState(false);
    const [isTourComplete,   setIsTourComplete]   = useState(false);
    const tourTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tourBootRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tourJumpingRef    = useRef(false);       // true while tour fires a programmatic jump
    const isTourActiveRef   = useRef(false);
    const isTourCompleteRef = useRef(false);
    useEffect(() => { isTourActiveRef.current   = isTourActive; },   [isTourActive]);
    useEffect(() => { isTourCompleteRef.current = isTourComplete; }, [isTourComplete]);

    // Responsive check
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // "/" key opens command palette; Escape closes inspector / tour
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!entered) return;
            // Escape exits the tour before any other handler
            if (e.key === 'Escape' && isTourActive) {
                e.preventDefault();
                if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
                setIsTourActive(false);
                setIsTourComplete(false);
                setIsUserExploring(false);
                setIsTourPaused(false);
                return;
            }
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
    }, [entered, palette, selected, helpOpen, isTourActive]);

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

    // ── Tour handlers ────────────────────────────────────────────────────────

    /** Fire a tour step: programmatically navigate to the step's target node. */
    const fireTourStep = useCallback((step: number) => {
        const s = TOUR_STEPS[step];
        tourJumpingRef.current = true;
        if (s.targetNodeId === null) {
            // Identity step: deselect everything → BrainMap auto-resets camera
            setSelected(null);
        } else {
            setJumpTo(s.targetNodeId);
        }
        // Keep the flag high long enough for BrainMap's 350ms jump + onSelect delay
        setTimeout(() => { tourJumpingRef.current = false; }, 900);
    }, []);

    const startTour = useCallback(() => {
        setIsTourActive(true);
        setTourStep(0);
        setIsTourPaused(false);
        setIsUserExploring(false);
        setIsTourComplete(false);
        // Boot sequence: show "Initializing…" for 1.8s before firing step 0
        setIsTourBooting(true);
        tourBootRef.current = setTimeout(() => {
            setIsTourBooting(false);
            fireTourStep(0);
        }, 1800);
    }, [fireTourStep]);

    const exitTour = useCallback(() => {
        if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
        if (tourBootRef.current)  clearTimeout(tourBootRef.current);
        setIsTourActive(false);
        setIsTourBooting(false);
        setIsTourComplete(false);
        setIsUserExploring(false);
        setIsTourPaused(false);
    }, []);

    const handleTourNext = useCallback(() => {
        if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
        const next = tourStep + 1;
        if (next >= TOUR_STEPS.length) { setIsTourComplete(true); return; }
        setTourStep(next);
        setIsUserExploring(false);
        setIsTourPaused(false);
        fireTourStep(next);
    }, [tourStep, fireTourStep]);

    const handleTourBack = useCallback(() => {
        if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
        const prev = Math.max(0, tourStep - 1);
        setTourStep(prev);
        setIsUserExploring(false);
        setIsTourPaused(false);
        fireTourStep(prev);
    }, [tourStep, fireTourStep]);

    const handleTourPause = useCallback(() => {
        if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
        setIsTourPaused(true);
    }, []);

    const handleTourResume = useCallback(() => {
        setIsUserExploring(false);
        setIsTourPaused(false);
        // Re-fire current step so camera snaps back to where tour was
        fireTourStep(tourStep);
    }, [tourStep, fireTourStep]);

    const handleTourReplay = useCallback(() => {
        setIsTourComplete(false);
        setTourStep(0);
        setIsTourPaused(false);
        setIsUserExploring(false);
        setIsTourBooting(true);
        tourBootRef.current = setTimeout(() => {
            setIsTourBooting(false);
            fireTourStep(0);
        }, 1800);
    }, [fireTourStep]);

    // Auto-advance: fires when step timer expires
    useEffect(() => {
        if (!isTourActive || isTourBooting || isTourPaused || isUserExploring || isTourComplete) {
            if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
            return;
        }
        const step = TOUR_STEPS[tourStep];
        tourTimerRef.current = setTimeout(() => {
            if (tourStep < TOUR_STEPS.length - 1) {
                const next = tourStep + 1;
                setTourStep(next);
                fireTourStep(next);
            } else {
                setIsTourComplete(true);
            }
        }, step.duration);
        return () => { if (tourTimerRef.current) clearTimeout(tourTimerRef.current); };
    }, [isTourActive, isTourBooting, isTourPaused, isUserExploring, isTourComplete, tourStep, fireTourStep]);

    /**
     * Wraps the BrainMap onSelect prop.
     * If the user manually clicks a node while the tour is playing (not a
     * programmatic jump), pause the tour and enter "exploring" mode.
     */
    const handleBrainMapSelect = useCallback((node: (OrbitNodeData | ChildNodeData & { id: string }) | null) => {
        setSelected(node as SelectedNode | null);
        if (isTourActiveRef.current && !tourJumpingRef.current && !isTourCompleteRef.current) {
            if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
            setIsUserExploring(true);
            setIsTourPaused(true);
        }
    }, []);

    // Which BrainMap orbit node edges to glow during the identity step
    const tourHighlightNodeIds = (() => {
        if (!isTourActive || isTourBooting || isTourComplete || isUserExploring) return undefined;
        if (TOUR_STEPS[tourStep]?.id === 'identity') return ['leadership', 'education'];
        return undefined;
    })();

    // Which nav element to highlight during tour — null when not applicable
    const tourHighlightEl = (() => {
        if (!isTourActive || isTourBooting || isTourComplete || isUserExploring) return null;
        const id = TOUR_STEPS[tourStep]?.id;
        if (id === 'brain-sphere') return 'sphere';
        if (id === 'recruiter')    return 'recruiter';
        if (id === 'assistant')    return 'assistant';
        return null;
    })();

    return (
        <div className="w-full" style={{ background: '#0B1220', minHeight: '100dvh' }}>
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
                        className="w-full flex overflow-hidden"
                        style={{ height: '100dvh' }}
                        initial={{ opacity: isMobile ? 1 : 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        {isMobile ? (
                            /* Mobile: brain map with bottom-sheet inspector + tab bar */
                            <div className="w-full flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
                                {mobileView === 'resume' ? (
                                    <div className="w-full flex-1 overflow-y-auto min-h-0">
                                        <RecruiterView showBack onBack={() => setMobileView('map')} />
                                    </div>
                                ) : (
                                    <ErrorBoundary>
                                        <>
                                        {/* BrainMap: flex-1 + min-h-0 ensures it always gets a real measured height */}
                                        <div className="flex-1 relative overflow-hidden min-h-0">
                                            <BrainMap
                                                onSelect={handleBrainMapSelect}
                                                selectedId={selected?.id ?? null}
                                                jumpTo={jumpTo}
                                                onJumpDone={() => setJumpTo(null)}
                                                paletteOpen={false}
                                                contracting={false}
                                                tourActive={false}
                                                tourHighlightNodeIds={[]}
                                                isTourBooting={false}
                                                isMobile={true}
                                            />
                                        </div>

                                        {/* Bottom sheet inspector */}
                                        <InspectorPanel
                                            node={selected}
                                            onClose={() => setSelected(null)}
                                            onBreadcrumb={() => { setSelected(null); setJumpTo('projects'); }}
                                            isMobile={true}
                                        />

                                        {/* Tab bar */}
                                        <div
                                            className="fixed bottom-0 left-0 right-0 z-50 flex"
                                            style={{
                                                height: 56,
                                                background: 'rgba(11,18,32,0.96)',
                                                borderTop: '1px solid rgba(61,227,255,0.10)',
                                                backdropFilter: 'blur(12px)',
                                                paddingBottom: 'env(safe-area-inset-bottom)',
                                            }}
                                        >
                                            <button
                                                onClick={() => setMobileView('map')}
                                                className="flex-1 flex flex-col items-center justify-center gap-0.5 font-mono text-[9px] tracking-widest transition-colors"
                                                style={{ color: '#3DE3FF' }}
                                            >
                                                <Network size={15} />
                                                MAP
                                            </button>
                                            <button
                                                onClick={() => setMobileView('resume')}
                                                className="flex-1 flex flex-col items-center justify-center gap-0.5 font-mono text-[9px] tracking-widest transition-colors"
                                                style={{ color: 'rgba(154,176,204,0.4)' }}
                                            >
                                                <FileTextIcon size={15} />
                                                RESUME
                                            </button>
                                        </div>
                                        </>
                                    </ErrorBoundary>
                                )}
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
                                        onSelect={handleBrainMapSelect}
                                        selectedId={selected?.id ?? null}
                                        jumpTo={jumpTo}
                                        onJumpDone={() => setJumpTo(null)}
                                        paletteOpen={palette}
                                        contracting={spherePhase === 'transitioning'}
                                        tourActive={isTourActive && !isUserExploring}
                                        tourSpotlightId={isTourActive && !isUserExploring ? (TOUR_STEPS[tourStep]?.targetNodeId ?? null) : null}
                                        tourHighlightNodeIds={tourHighlightNodeIds}
                                        isTourBooting={isTourBooting}
                                    />
                                </div>

                                {/* Inspector */}
                                <InspectorPanel
                                    node={isTourActive && !isUserExploring ? null : selected}
                                    onClose={() => setSelected(null)}
                                    onBreadcrumb={() => { setSelected(null); setJumpTo('projects'); }}
                                />

                                {/* Top-left nav cluster */}
                                <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
                                    {/* Recruiter View */}
                                    <motion.button
                                        onClick={() => setRecruiterMode(true)}
                                        className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-full"
                                        style={{
                                            background: 'rgba(11,18,32,0.85)',
                                            border: '1px solid rgba(61,227,255,0.15)',
                                            backdropFilter: 'blur(10px)',
                                            color: 'rgba(154,176,204,0.6)',
                                        }}
                                        animate={tourHighlightEl === 'recruiter' ? {
                                            boxShadow: [
                                                '0 0 0px rgba(61,227,255,0.0)',
                                                '0 0 20px rgba(61,227,255,0.5)',
                                                '0 0 0px rgba(61,227,255,0.0)',
                                            ],
                                        } : {}}
                                        whileHover={{
                                            color: '#3DE3FF',
                                            borderColor: 'rgba(61,227,255,0.5)',
                                            boxShadow: '0 0 18px rgba(61,227,255,0.18)',
                                        }}
                                        transition={{
                                            boxShadow: tourHighlightEl === 'recruiter'
                                                ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                                                : { duration: 0.18 },
                                            default: { duration: 0.18 },
                                        }}
                                    >
                                        <span style={{ color: '#3DE3FF', fontSize: 11 }}>⊞</span> Recruiter View
                                    </motion.button>

                                    {/* Brain Sphere */}
                                    <motion.button
                                        onClick={() => {
                                            if (spherePhase !== 'off') return;
                                            if (sphereTimerRef.current) clearTimeout(sphereTimerRef.current);
                                            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                                            if (reduced) { setSpherePhase('on'); return; }
                                            setSpherePhase('transitioning');
                                            sphereTimerRef.current = setTimeout(() => setSpherePhase('on'), 3000);
                                        }}
                                        className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-full"
                                        style={{
                                            background: 'rgba(11,18,32,0.85)',
                                            border: '1px solid rgba(61,227,255,0.15)',
                                            backdropFilter: 'blur(10px)',
                                            color: 'rgba(154,176,204,0.6)',
                                        }}
                                        animate={tourHighlightEl === 'sphere' ? {
                                            boxShadow: [
                                                '0 0 0px rgba(61,227,255,0.0)',
                                                '0 0 20px rgba(61,227,255,0.5)',
                                                '0 0 0px rgba(61,227,255,0.0)',
                                            ],
                                        } : {}}
                                        whileHover={{
                                            color: '#3DE3FF',
                                            borderColor: 'rgba(61,227,255,0.5)',
                                            boxShadow: '0 0 18px rgba(61,227,255,0.18)',
                                        }}
                                        transition={{
                                            boxShadow: tourHighlightEl === 'sphere'
                                                ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                                                : { duration: 0.18 },
                                            default: { duration: 0.18 },
                                        }}
                                    >
                                        <span style={{ color: '#3DE3FF', fontSize: 11 }}>◉</span> Brain Sphere
                                    </motion.button>

                                    {/* Guided tour */}
                                    {!isTourActive && (
                                        <motion.button
                                            onClick={startTour}
                                            className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest px-3 py-1.5 rounded-full"
                                            style={{
                                                background: 'rgba(11,18,32,0.85)',
                                                border: '1px solid rgba(61,227,255,0.15)',
                                                backdropFilter: 'blur(10px)',
                                                color: 'rgba(154,176,204,0.6)',
                                            }}
                                            whileHover={{
                                                color: '#3DE3FF',
                                                borderColor: 'rgba(61,227,255,0.5)',
                                                boxShadow: '0 0 18px rgba(61,227,255,0.18)',
                                            }}
                                            transition={{ duration: 0.18 }}
                                        >
                                            <span style={{ color: '#3DE3FF', fontSize: 11 }}>▷</span> Take a 60-second tour
                                        </motion.button>
                                    )}
                                </div>
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
            {entered && <PortfolioAssistant tourActive={isTourActive} tourHighlightAssistant={tourHighlightEl === 'assistant'} isMobile={isMobile} />}

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

            {/* Guided tour panel */}
            <AnimatePresence>
                {isTourActive && (
                    <GuidedTour
                        key={tourStep === 0 ? 'tour-right' : 'tour-left'}
                        step={tourStep}
                        stepData={TOUR_STEPS[tourStep]}
                        isPaused={isTourPaused}
                        isBooting={isTourBooting}
                        isUserExploring={isUserExploring}
                        isComplete={isTourComplete}
                        alignRight={tourStep === 0}
                        onNext={handleTourNext}
                        onBack={handleTourBack}
                        onPause={handleTourPause}
                        onResume={handleTourResume}
                        onExit={exitTour}
                        onReplay={handleTourReplay}
                    />
                )}
            </AnimatePresence>

        </div>
    );
}

export default App;
