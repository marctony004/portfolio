import { useEffect, useRef } from 'react';

interface Options {
    onPan:   (dx: number, dy: number) => void;
    onPinch: (scaleDelta: number) => void;
    enabled: boolean;
}

/**
 * Attaches pointer-based pan (1 finger) and pinch-to-zoom (2 fingers) to a container.
 *
 * - Pan begins only after > 8px travel, so single taps reach child onClick handlers.
 * - Pointer capture is deferred until pan is confirmed (1 finger) or immediately on
 *   the second pointer (pinch), ensuring node taps are never intercepted.
 *
 * Returns `isPanningRef` — true from the moment a pan is confirmed until the next
 * pointerdown. Callers use this to suppress background tap-to-deselect.
 */
export function useMapGestures(
    containerRef: React.RefObject<HTMLDivElement | null>,
    { onPan, onPinch, enabled }: Options,
) {
    const pointersRef   = useRef<Map<number, { x: number; y: number }>>(new Map());
    const prevSpreadRef = useRef<number | null>(null);
    const isPanningRef  = useRef(false);

    // Stable callback refs so the effect doesn't re-attach on every render
    const onPanRef   = useRef(onPan);
    const onPinchRef = useRef(onPinch);
    useEffect(() => { onPanRef.current   = onPan;   }, [onPan]);
    useEffect(() => { onPinchRef.current = onPinch; }, [onPinch]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !enabled) return;

        const onDown = (e: PointerEvent) => {
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (pointersRef.current.size === 1) {
                // First finger — reset pan flag; capture deferred until > 8px travel
                isPanningRef.current = false;
            } else if (pointersRef.current.size === 2) {
                // Second finger — definitely a pinch; capture immediately
                try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
            }
        };

        const onMove = (e: PointerEvent) => {
            const prev = pointersRef.current.get(e.pointerId);
            if (!prev) return;

            const curr = { x: e.clientX, y: e.clientY };

            if (pointersRef.current.size === 1) {
                const dx   = curr.x - prev.x;
                const dy   = curr.y - prev.y;
                if (!isPanningRef.current && Math.hypot(dx, dy) > 8) {
                    isPanningRef.current = true;
                    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
                }
                if (isPanningRef.current) onPanRef.current(dx, dy);

            } else if (pointersRef.current.size === 2) {
                const ids        = [...pointersRef.current.keys()];
                const other      = pointersRef.current.get(ids.find(id => id !== e.pointerId)!)!;
                const prevSpread = Math.hypot(prev.x - other.x, prev.y - other.y);
                const currSpread = Math.hypot(curr.x - other.x, curr.y - other.y);
                if (prevSpreadRef.current !== null && prevSpread > 0) {
                    onPinchRef.current(currSpread / prevSpread);
                }
                prevSpreadRef.current = currSpread;
            }

            pointersRef.current.set(e.pointerId, curr);
        };

        const onUp = (e: PointerEvent) => {
            pointersRef.current.delete(e.pointerId);
            if (pointersRef.current.size < 2) prevSpreadRef.current = null;
            try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
        };

        el.addEventListener('pointerdown', onDown, { passive: true });
        el.addEventListener('pointermove', onMove, { passive: true });
        el.addEventListener('pointerup',     onUp);
        el.addEventListener('pointercancel', onUp);

        return () => {
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup',     onUp);
            el.removeEventListener('pointercancel', onUp);
        };
    }, [containerRef, enabled]);

    return { isPanningRef };
}
