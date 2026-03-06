import { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

// Create a free account at formspree.io and replace this with your form ID
const FORMSPREE_ID = 'YOUR_FORM_ID';
const ENDPOINT     = `https://formspree.io/f/${FORMSPREE_ID}`;

export const ContactForm = () => {
    const [name,    setName]    = useState('');
    const [message, setMessage] = useState('');
    const [status,  setStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const canSubmit = name.trim().length > 0 && message.trim().length > 0 && status !== 'sending';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        // Fallback to mailto if Formspree ID not configured
        if (FORMSPREE_ID === 'YOUR_FORM_ID') {
            window.open(
                `mailto:marc.tonysmith@gmail.com?subject=Portfolio contact from ${encodeURIComponent(name)}&body=${encodeURIComponent(message)}`,
                '_blank'
            );
            setStatus('sent');
            return;
        }

        setStatus('sending');
        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ name, message }),
            });
            setStatus(res.ok ? 'sent' : 'error');
        } catch {
            setStatus('error');
        }
    };

    if (status === 'sent') {
        return (
            <div className="flex items-center gap-2 text-sm font-mono" style={{ color: '#3DE3FF' }}>
                <CheckCircle size={13} />
                <span>Message sent — I'll get back to you soon.</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-2.5" onClick={e => e.stopPropagation()}>
            <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full text-sm font-mono placeholder-muted/40 outline-none px-3 py-2 rounded"
                style={{
                    background: 'rgba(61,227,255,0.03)',
                    border: '1px solid rgba(61,227,255,0.12)',
                    color: '#E6EEF9',
                }}
            />
            <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Message..."
                rows={3}
                className="w-full text-sm font-mono placeholder-muted/40 outline-none px-3 py-2 rounded resize-none"
                style={{
                    background: 'rgba(61,227,255,0.03)',
                    border: '1px solid rgba(61,227,255,0.12)',
                    color: '#E6EEF9',
                }}
            />

            {status === 'error' && (
                <div className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: 'rgba(255,120,120,0.85)' }}>
                    <AlertCircle size={11} /> Something went wrong. Try emailing directly.
                </div>
            )}

            <button
                type="submit"
                disabled={!canSubmit}
                className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1.5 rounded transition-all"
                style={{
                    background: 'rgba(61,227,255,0.08)',
                    border: '1px solid rgba(61,227,255,0.22)',
                    color: '#3DE3FF',
                    opacity: canSubmit ? 1 : 0.45,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
            >
                <Send size={11} />
                {status === 'sending' ? 'Sending…' : 'Send Message'}
            </button>
        </form>
    );
};
