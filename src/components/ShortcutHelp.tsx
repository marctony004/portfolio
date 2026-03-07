import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    open: boolean;
    onClose: () => void;
}

const SHORTCUTS = [
    { keys: ['/'],          desc: 'Open search' },
    { keys: ['↑', '↓'],    desc: 'Navigate results' },
    { keys: ['↵'],          desc: 'Select node' },
    { keys: ['Esc'],        desc: 'Close inspector / palette' },
    { keys: ['?'],          desc: 'Show this help' },
];

export function ShortcutHelp({ open, onClose }: Props) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

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

                    {/* Modal */}
                    <motion.div
                        className="fixed top-1/2 left-1/2 z-[201] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden"
                        style={{
                            background: 'rgba(17,26,46,0.96)',
                            border: '1px solid rgba(61,227,255,0.18)',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(61,227,255,0.06)',
                        }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-accent/10 flex items-center justify-between">
                            <span className="font-mono text-xs tracking-widest" style={{ color: '#3DE3FF' }}>
                                KEYBOARD SHORTCUTS
                            </span>
                            <span
                                className="font-mono text-[10px] border rounded px-1.5 py-0.5 cursor-pointer"
                                style={{ color: 'rgba(154,176,204,0.4)', borderColor: 'rgba(154,176,204,0.2)' }}
                                onClick={onClose}
                            >
                                ESC
                            </span>
                        </div>

                        {/* Shortcut rows */}
                        <div className="px-5 py-4 flex flex-col gap-3">
                            {SHORTCUTS.map(({ keys, desc }) => (
                                <div key={desc} className="flex items-center justify-between">
                                    <span className="font-mono text-xs" style={{ color: 'rgba(154,176,204,0.6)' }}>
                                        {desc}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {keys.map(k => (
                                            <kbd
                                                key={k}
                                                className="font-mono text-[11px] px-2 py-0.5 rounded"
                                                style={{
                                                    background: 'rgba(61,227,255,0.08)',
                                                    border: '1px solid rgba(61,227,255,0.2)',
                                                    color: '#3DE3FF',
                                                    minWidth: '1.75rem',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {k}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-accent/10">
                            <span className="font-mono text-[10px]" style={{ color: 'rgba(154,176,204,0.25)' }}>
                                press <span style={{ color: 'rgba(61,227,255,0.4)' }}>?</span> to toggle
                            </span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
