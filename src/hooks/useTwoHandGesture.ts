import { useRef, useState, useCallback } from 'react';

export type HandGesture = 'open_palm' | 'fist' | 'pinch' | 'none';

export interface HandData {
    landmarks: { x: number; y: number; z: number }[];
    gesture: HandGesture;
    wrist: { x: number; y: number };
}

export interface TwoHandState {
    hands: HandData[];
    rotationDelta: { dx: number; dy: number };
    zoomDelta: number;
    freshPinch: boolean;   // true only on the single frame when pinch first fires
    freshFist:  boolean;   // true only on the single frame when fist first fires (close gesture)
    isActive: boolean;     // true when both hands are in open-palm control mode
}

const PINCH_DIST     = 0.06;
const ROT_SCALE      = 3.8;
const ZOOM_SCALE     = 7.0;
const ALPHA          = 0.28;   // EWMA smoothing (lower = smoother but laggier)
const PINCH_COOLDOWN = 700;    // ms between pinch events
const FIST_COOLDOWN  = 900;    // ms between fist (close) events

function mapGesture(raw: string): HandGesture {
    if (raw === 'Open_Palm' || raw === 'Thumb_Up') return 'open_palm';
    if (raw === 'Closed_Fist')                      return 'fist';
    return 'none';
}

function isPinching(lms: { x: number; y: number }[]): boolean {
    return Math.hypot(lms[4].x - lms[8].x, lms[4].y - lms[8].y) < PINCH_DIST;
}

export function useTwoHandGesture() {
    const videoRef  = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isLoading,     setIsLoading]     = useState(false);
    const [twoHandState,  setTwoHandState]  = useState<TwoHandState>({
        hands: [], rotationDelta: { dx: 0, dy: 0 }, zoomDelta: 0, freshPinch: false, freshFist: false, isActive: false,
    });

    const recognizerRef  = useRef<unknown>(null);
    const streamRef      = useRef<MediaStream | null>(null);
    const rafRef         = useRef(0);
    const runningRef     = useRef(false);

    // Per-frame delta tracking
    const smoothRef      = useRef({ dx: 0, dy: 0, dz: 0 });
    const prevMidRef     = useRef<{ x: number; y: number } | null>(null);
    const prevSpreadRef  = useRef<number | null>(null);
    const wasPinchRef    = useRef(false);
    const lastPinchRef   = useRef(0);
    const wasFistRef     = useRef(false);
    const lastFistRef    = useRef(0);

    const stop = useCallback(() => {
        runningRef.current = false;
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    const start = useCallback(async (): Promise<'granted' | 'denied' | 'error'> => {
        setIsLoading(true);
        try {
            const { GestureRecognizer, FilesetResolver } = await import('@mediapipe/tasks-vision');
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );
            const mkOpts = (delegate: 'GPU' | 'CPU') => ({
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
                    delegate,
                },
                runningMode: 'VIDEO' as const,
                numHands: 2,
            });
            let recognizer: unknown;
            try   { recognizer = await GestureRecognizer.createFromOptions(vision, mkOpts('GPU')); }
            catch { recognizer = await GestureRecognizer.createFromOptions(vision, mkOpts('CPU')); }
            recognizerRef.current = recognizer;

            let stream: MediaStream;
            try   { stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } }); }
            catch { setIsLoading(false); return 'denied'; }
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise<void>(res => { if (videoRef.current) videoRef.current.onloadedmetadata = () => res(); });
                await videoRef.current.play();
            }

            setIsLoading(false);
            runningRef.current = true;

            const detect = () => {
                if (!runningRef.current) return;
                const video  = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(detect); return; }

                const now     = performance.now();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const results = (recognizerRef.current as any).recognizeForVideo(video, now);

                // ── Draw landmarks ─────────────────────────────────────────────
                if (canvas) {
                    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                        canvas.width  = video.videoWidth;
                        canvas.height = video.videoHeight;
                    }
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        const w = canvas.width, h = canvas.height;
                        const CONN = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],
                                      [0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]];
                        const FINGERTIPS = [4, 8, 12, 16, 20];

                        results?.landmarks?.forEach((lms: { x: number; y: number }[], handIdx: number) => {
                            const pinching   = isPinching(lms);
                            const rawGesture = results.gestures?.[handIdx]?.[0]?.categoryName ?? '';
                            const gesture    = pinching ? 'pinch' : mapGesture(rawGesture);

                            const lineColor = gesture === 'pinch'      ? 'rgba(255,255,255,0.85)'
                                            : gesture === 'open_palm'  ? 'rgba(61,227,255,0.6)'
                                            : 'rgba(154,176,204,0.3)';
                            const dotColor  = gesture === 'pinch'      ? 'rgba(255,255,255,0.95)'
                                            : gesture === 'open_palm'  ? 'rgba(61,227,255,0.9)'
                                            : 'rgba(154,176,204,0.45)';

                            // Skeleton connections
                            ctx.strokeStyle = lineColor;
                            ctx.lineWidth   = 2;
                            ctx.setLineDash([]);
                            for (const [a, b] of CONN) {
                                ctx.beginPath();
                                ctx.moveTo(lms[a].x * w, lms[a].y * h);
                                ctx.lineTo(lms[b].x * w, lms[b].y * h);
                                ctx.stroke();
                            }

                            // Landmark dots — fingertips larger
                            for (let i = 0; i < lms.length; i++) {
                                const lm = lms[i];
                                ctx.fillStyle = dotColor;
                                ctx.beginPath();
                                ctx.arc(lm.x * w, lm.y * h, FINGERTIPS.includes(i) ? 5 : 3, 0, Math.PI * 2);
                                ctx.fill();
                            }

                            // Pinch distance indicator — dashed line between thumb and index tip
                            const thumb = lms[4], index = lms[8];
                            const dist  = Math.hypot(thumb.x - index.x, thumb.y - index.y);
                            const pinchProgress = Math.max(0, Math.min(1, 1 - dist / 0.12));
                            ctx.strokeStyle = `rgba(255,255,255,${0.15 + pinchProgress * 0.75})`;
                            ctx.lineWidth   = 1 + pinchProgress * 2.5;
                            ctx.setLineDash([5, 5]);
                            ctx.beginPath();
                            ctx.moveTo(thumb.x * w, thumb.y * h);
                            ctx.lineTo(index.x * w, index.y * h);
                            ctx.stroke();
                            ctx.setLineDash([]);
                        });
                    }
                }

                // ── Process hands ──────────────────────────────────────────────
                const hands: HandData[] = [];
                let anyPinch = false;

                if (results?.landmarks?.length > 0) {
                    for (let h = 0; h < results.landmarks.length; h++) {
                        const lms  = results.landmarks[h] as { x: number; y: number; z: number }[];
                        const pinch = isPinching(lms);
                        if (pinch) anyPinch = true;
                        const rawGesture = results.gestures?.[h]?.[0]?.categoryName ?? '';
                        hands.push({
                            landmarks: lms,
                            gesture:   pinch ? 'pinch' : mapGesture(rawGesture),
                            wrist:     { x: lms[0].x, y: lms[0].y },
                        });
                    }
                }

                // ── Two-hand rotate / zoom ─────────────────────────────────────
                let rotDx = 0, rotDy = 0, zoomD = 0;
                const bothPalms = hands.length === 2 && hands.every(h => h.gesture === 'open_palm');

                if (bothPalms) {
                    const midX   = (hands[0].wrist.x + hands[1].wrist.x) / 2;
                    const midY   = (hands[0].wrist.y + hands[1].wrist.y) / 2;
                    const spread = Math.hypot(
                        hands[0].wrist.x - hands[1].wrist.x,
                        hands[0].wrist.y - hands[1].wrist.y,
                    );

                    if (prevMidRef.current) {
                        const rdx = -(midX - prevMidRef.current.x) * ROT_SCALE;
                        const rdy = -(midY - prevMidRef.current.y) * ROT_SCALE;
                        smoothRef.current.dx = ALPHA * rdx + (1 - ALPHA) * smoothRef.current.dx;
                        smoothRef.current.dy = ALPHA * rdy + (1 - ALPHA) * smoothRef.current.dy;
                        rotDx = smoothRef.current.dx;
                        rotDy = smoothRef.current.dy;
                    }
                    if (prevSpreadRef.current !== null) {
                        const rdz = (spread - prevSpreadRef.current) * ZOOM_SCALE;
                        smoothRef.current.dz = ALPHA * rdz + (1 - ALPHA) * smoothRef.current.dz;
                        zoomD = smoothRef.current.dz;
                    }
                    prevMidRef.current  = { x: midX, y: midY };
                    prevSpreadRef.current = spread;
                } else {
                    prevMidRef.current  = null;
                    prevSpreadRef.current = null;
                    smoothRef.current   = { dx: 0, dy: 0, dz: 0 };
                }

                // ── Rising-edge pinch ──────────────────────────────────────────
                const freshPinch = anyPinch && !wasPinchRef.current && now - lastPinchRef.current > PINCH_COOLDOWN;
                if (freshPinch) lastPinchRef.current = now;
                wasPinchRef.current = anyPinch;

                // ── Rising-edge fist (close gesture) ───────────────────────────
                const anyFist = hands.some(h => h.gesture === 'fist');
                const freshFist = anyFist && !wasFistRef.current && now - lastFistRef.current > FIST_COOLDOWN;
                if (freshFist) lastFistRef.current = now;
                wasFistRef.current = anyFist;

                setTwoHandState({
                    hands,
                    rotationDelta: { dx: rotDx, dy: rotDy },
                    zoomDelta:     zoomD,
                    freshPinch,
                    freshFist,
                    isActive:      bothPalms,
                });

                rafRef.current = requestAnimationFrame(detect);
            };

            rafRef.current = requestAnimationFrame(detect);
            return 'granted';
        } catch (err) {
            console.error('[TwoHandGesture]', err);
            setIsLoading(false);
            return 'error';
        }
    }, []);

    return { videoRef, canvasRef, twoHandState, isLoading, start, stop };
}
