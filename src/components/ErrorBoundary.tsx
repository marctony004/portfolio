import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div className="fixed inset-0 flex flex-col items-center justify-center p-8"
                    style={{ background: '#0B1220' }}>
                    <p className="font-mono text-[11px] text-accent/60 tracking-widest mb-3">RENDER ERROR</p>
                    <p className="font-mono text-xs text-muted/60 text-center max-w-sm">
                        {this.state.error.message}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 font-mono text-[10px] tracking-widest px-4 py-2 rounded"
                        style={{ border: '1px solid rgba(61,227,255,0.2)', color: 'rgba(61,227,255,0.6)' }}
                    >
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
