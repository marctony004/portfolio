import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { commandItems } from '../data/brainData';

interface Props {
    open: boolean;
    onClose: () => void;
    onAction: (action: string) => void;
}

export const CommandPalette = ({ open, onClose, onAction }: Props) => {
    const [query, setQuery] = useState('');
    const [focusedIdx, setFocusedIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef  = useRef<HTMLDivElement>(null);

    // Stable refs so keydown handler doesn't stale-close
    const filteredRef   = useRef(commandItems);
    const focusedIdxRef = useRef(-1);

    useEffect(() => {
        if (open) { setQuery(''); setFocusedIdx(-1); setTimeout(() => inputRef.current?.focus(), 50); }
    }, [open]);

    const filtered = query
        ? commandItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
        : commandItems;

    // Keep refs current
    filteredRef.current   = filtered;
    focusedIdxRef.current = focusedIdx;

    // Reset focus when query changes
    useEffect(() => { setFocusedIdx(-1); }, [query]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!open) return;
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIdx(i => Math.min(i + 1, filteredRef.current.length - 1));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIdx(i => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter') {
                const item = filteredRef.current[focusedIdxRef.current];
                if (item) { onAction(item.action); onClose(); }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose, onAction]);

    // Scroll focused item into view
    useEffect(() => {
        if (focusedIdx < 0 || !listRef.current) return;
        const item = listRef.current.children[focusedIdx] as HTMLElement;
        item?.scrollIntoView({ block: 'nearest' });
    }, [focusedIdx]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-[200]"
                        style={{ background: 'rgba(11,18,32,0.7)', backdropFilter: 'blur(4px)' }}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Palette */}
                    <motion.div
                        className="fixed top-[20%] left-1/2 z-[201] w-full max-w-md -translate-x-1/2 rounded-lg overflow-hidden"
                        style={{
                            background: 'rgba(17,26,46,0.96)',
                            border: '1px solid rgba(61,227,255,0.18)',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(61,227,255,0.06)',
                        }}
                        initial={{ opacity: 0, y: -12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        {/* Search input */}
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-accent/10">
                            <Search size={15} className="text-muted shrink-0" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search or jump to..."
                                className="flex-1 bg-transparent text-sm font-mono text-text placeholder-muted/50 outline-none"
                            />
                            <span className="font-mono text-[10px] text-muted/50 border border-muted/20 rounded px-1.5 py-0.5">ESC</span>
                        </div>

                        {/* Results */}
                        <div ref={listRef} className="max-h-72 overflow-y-auto py-1.5">
                            {filtered.length === 0 && (
                                <p className="text-center text-muted/50 text-sm font-mono py-6">No results</p>
                            )}
                            {filtered.map((item, i) => (
                                <motion.button
                                    key={item.action}
                                    className="w-full text-left px-4 py-2.5 text-sm font-mono flex items-center gap-3 transition-colors"
                                    style={{
                                        background: focusedIdx === i ? 'rgba(61,227,255,0.08)' : 'transparent',
                                        color: focusedIdx === i ? '#3DE3FF' : 'rgba(154,176,204,0.8)',
                                    }}
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    onMouseEnter={() => setFocusedIdx(i)}
                                    onClick={() => { onAction(item.action); onClose(); }}
                                >
                                    <span className="text-[10px] w-3" style={{ color: focusedIdx === i ? '#3DE3FF' : 'rgba(61,227,255,0.35)' }}>›</span>
                                    {item.label}
                                </motion.button>
                            ))}
                        </div>

                        <div className="px-4 py-2 border-t border-accent/10 flex items-center gap-4">
                            <span className="font-mono text-[10px] text-muted/40">↑↓ navigate</span>
                            <span className="font-mono text-[10px] text-muted/40">↵ select</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
