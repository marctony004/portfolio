import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Send, ChevronDown } from 'lucide-react';
import { ACCENT, MUTED, TEXT } from '../theme';
import { generateResponse, type AssistantResponse } from '../utils/assistantEngine';
import { SUGGESTED_PROMPTS } from '../data/assistantData';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    followUps?: string[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TypingIndicator = () => (
    <motion.div
        className="flex justify-start"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
    >
        <div className="px-3.5 py-3 rounded-[4px_12px_12px_12px]"
            style={{ background: 'rgba(17,26,46,0.7)', border: '1px solid rgba(154,176,204,0.1)' }}>
            <div className="flex gap-1 items-center h-3">
                {[0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        className="rounded-full"
                        style={{ width: 4, height: 4, background: 'rgba(61,227,255,0.5)' }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
                    />
                ))}
            </div>
        </div>
    </motion.div>
);

interface MessageBubbleProps {
    message: Message;
    onFollowUp: (q: string) => void;
}

const MessageBubble = ({ message, onFollowUp }: MessageBubbleProps) => {
    const isUser = message.role === 'user';
    return (
        <motion.div
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
        >
            <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}
                style={{ maxWidth: '88%' }}>
                <div
                    className="text-xs leading-relaxed px-3.5 py-2.5"
                    style={isUser ? {
                        background: 'rgba(61,227,255,0.09)',
                        border: '1px solid rgba(61,227,255,0.18)',
                        color: TEXT,
                        borderRadius: '12px 12px 3px 12px',
                    } : {
                        background: 'rgba(17,26,46,0.7)',
                        border: '1px solid rgba(154,176,204,0.1)',
                        color: MUTED,
                        borderRadius: '3px 12px 12px 12px',
                    }}
                >
                    {message.content}
                </div>

                {/* Follow-up suggestion chips */}
                {!isUser && message.followUps && message.followUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {message.followUps.map(fp => (
                            <FollowUpChip key={fp} label={fp} onClick={() => onFollowUp(fp)} />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

const FollowUpChip = ({ label, onClick }: { label: string; onClick: () => void }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="font-mono text-[9px] px-2.5 py-1 rounded-full transition-all"
            style={{
                background: hovered ? 'rgba(61,227,255,0.1)' : 'rgba(61,227,255,0.04)',
                border: `1px solid ${hovered ? 'rgba(61,227,255,0.3)' : 'rgba(61,227,255,0.12)'}`,
                color: hovered ? ACCENT : 'rgba(61,227,255,0.5)',
            }}
        >
            {label}
        </button>
    );
};

const SuggestedPromptRow = ({ prompt, onClick }: { prompt: string; onClick: () => void }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="w-full text-left px-3.5 py-2.5 rounded-lg font-mono text-xs transition-all"
            style={{
                background: hovered ? 'rgba(61,227,255,0.07)' : 'rgba(61,227,255,0.03)',
                border: `1px solid ${hovered ? 'rgba(61,227,255,0.2)' : 'rgba(61,227,255,0.09)'}`,
                color: hovered ? ACCENT : 'rgba(154,176,204,0.65)',
            }}
        >
            {prompt}
        </button>
    );
};

// ── Main component ────────────────────────────────────────────────────────────

export const PortfolioAssistant = () => {
    const [open, setOpen]         = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput]       = useState('');
    const [loading, setLoading]   = useState(false);
    const bottomRef               = useRef<HTMLDivElement>(null);
    const inputRef                = useRef<HTMLInputElement>(null);

    // Focus input when panel opens
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 260);
    }, [open]);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed || loading) return;

        const userMsg: Message = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: trimmed,
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // Brief natural-feeling delay before response appears
        await new Promise<void>(r => setTimeout(r, 680));

        const { answer, followUps }: AssistantResponse = generateResponse(trimmed);
        const assistantMsg: Message = {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: answer,
            followUps,
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend(input);
    };

    const hasMessages = messages.length > 0;

    return (
        <>
            {/* ── Chat panel ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        className="fixed z-[90] flex flex-col"
                        style={{
                            bottom: '5.5rem',
                            right: '1.25rem',
                            width: 'min(380px, calc(100vw - 2.5rem))',
                            height: 'min(540px, calc(100vh - 130px))',
                            background: 'rgba(13,20,38,0.97)',
                            border: '1px solid rgba(61,227,255,0.14)',
                            borderRadius: 14,
                            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 48px rgba(61,227,255,0.05)',
                            backdropFilter: 'blur(18px)',
                            WebkitBackdropFilter: 'blur(18px)',
                        }}
                        initial={{ opacity: 0, y: 14, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        {/* Top edge highlight */}
                        <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-[14px]"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(61,227,255,0.22), transparent)' }} />

                        {/* ── Header ── */}
                        <div className="flex items-start justify-between px-5 py-4 shrink-0"
                            style={{ borderBottom: '1px solid rgba(61,227,255,0.09)' }}>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Brain size={12} style={{ color: ACCENT }} />
                                    <span className="font-sans font-semibold text-[13px]" style={{ color: TEXT }}>
                                        Ask My Portfolio
                                    </span>
                                </div>
                                <p className="font-mono text-[9px] tracking-wide"
                                    style={{ color: 'rgba(154,176,204,0.4)' }}>
                                    Ask about projects, skills, or experience.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                {hasMessages && (
                                    <button
                                        onClick={() => setMessages([])}
                                        className="font-mono text-[9px] px-2 py-1 rounded transition-colors"
                                        style={{
                                            color: 'rgba(154,176,204,0.35)',
                                            background: 'rgba(154,176,204,0.05)',
                                            border: '1px solid rgba(154,176,204,0.08)',
                                        }}
                                        title="Clear conversation"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-1.5 rounded transition-colors"
                                    style={{
                                        color: 'rgba(154,176,204,0.35)',
                                        background: 'rgba(154,176,204,0.05)',
                                    }}
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        </div>

                        {/* ── Messages area ── */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {!hasMessages ? (
                                // Welcome / suggested prompts state
                                <motion.div
                                    className="space-y-3"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.08 }}
                                >
                                    <p className="font-mono text-[9px] text-center pb-1"
                                        style={{ color: 'rgba(154,176,204,0.3)' }}>
                                        Suggested questions
                                    </p>
                                    {SUGGESTED_PROMPTS.map(prompt => (
                                        <SuggestedPromptRow
                                            key={prompt}
                                            prompt={prompt}
                                            onClick={() => handleSend(prompt)}
                                        />
                                    ))}
                                </motion.div>
                            ) : (
                                <>
                                    {messages.map(msg => (
                                        <MessageBubble
                                            key={msg.id}
                                            message={msg}
                                            onFollowUp={handleSend}
                                        />
                                    ))}
                                    <AnimatePresence>
                                        {loading && <TypingIndicator />}
                                    </AnimatePresence>
                                </>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* ── Input row ── */}
                        <div className="px-4 pb-4 pt-3 shrink-0"
                            style={{ borderTop: '1px solid rgba(61,227,255,0.08)' }}>
                            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask about Marc's portfolio..."
                                    disabled={loading}
                                    className="flex-1 font-mono text-xs outline-none px-3.5 py-2.5 rounded-lg"
                                    style={{
                                        background: 'rgba(61,227,255,0.04)',
                                        border: '1px solid rgba(61,227,255,0.12)',
                                        color: TEXT,
                                        opacity: loading ? 0.6 : 1,
                                    }}
                                />
                                <motion.button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="p-2.5 rounded-lg flex items-center justify-center shrink-0"
                                    style={{
                                        background: 'rgba(61,227,255,0.08)',
                                        border: '1px solid rgba(61,227,255,0.18)',
                                        opacity: input.trim() && !loading ? 1 : 0.35,
                                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                                    }}
                                    whileTap={input.trim() && !loading ? { scale: 0.9 } : {}}
                                >
                                    <Send size={12} style={{ color: ACCENT }} />
                                </motion.button>
                            </form>
                            <p className="font-mono text-[9px] text-center mt-2"
                                style={{ color: 'rgba(154,176,204,0.18)' }}>
                                Powered by portfolio data · no external API
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Orb button ── */}
            <motion.button
                onClick={() => setOpen(o => !o)}
                className="fixed z-[90] rounded-full flex items-center justify-center"
                style={{
                    bottom: '1.25rem',
                    right: '1.25rem',
                    width: 50,
                    height: 50,
                    background: 'rgba(15,22,40,0.98)',
                    border: `1.5px solid rgba(61,227,255,${open ? 0.65 : 0.22})`,
                    boxShadow: open
                        ? '0 0 32px rgba(61,227,255,0.2), 0 8px 24px rgba(0,0,0,0.5)'
                        : '0 0 0px rgba(61,227,255,0), 0 6px 20px rgba(0,0,0,0.4)',
                }}
                animate={!open ? {
                    boxShadow: [
                        '0 0 0px rgba(61,227,255,0.0), 0 6px 20px rgba(0,0,0,0.4)',
                        '0 0 20px rgba(61,227,255,0.15), 0 6px 20px rgba(0,0,0,0.4)',
                        '0 0 0px rgba(61,227,255,0.0), 0 6px 20px rgba(0,0,0,0.4)',
                    ],
                    borderColor: [
                        'rgba(61,227,255,0.18)',
                        'rgba(61,227,255,0.35)',
                        'rgba(61,227,255,0.18)',
                    ],
                } : {}}
                transition={!open ? {
                    duration: 3.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    repeatDelay: 1.2,
                } : { duration: 0.2 }}
                whileHover={{
                    boxShadow: '0 0 28px rgba(61,227,255,0.2), 0 8px 24px rgba(0,0,0,0.5)',
                    borderColor: 'rgba(61,227,255,0.55)',
                }}
                whileTap={{ scale: 0.94 }}
            >
                {/* Inner ring — matches center node aesthetic */}
                <div className="absolute inset-[4px] rounded-full pointer-events-none"
                    style={{ border: '1px solid rgba(61,227,255,0.07)' }} />

                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -80, opacity: 0, scale: 0.7 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 80, opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.18 }}
                        >
                            <ChevronDown size={17} style={{ color: ACCENT }} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="brain"
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                        >
                            <Brain size={17} style={{ color: MUTED }} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </>
    );
};
