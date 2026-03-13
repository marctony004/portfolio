import { useRef, useState, useCallback } from 'react';

export type HandGesture = 'open_palm' | 'fist' | 'pinch' | 'victory' | 'none';

export interface HandData {
    landmarks:  { x: number; y: number; z: number }[];
    gesture:    HandGesture;
    wrist:      { x: number; y: number };
    handedness: 'Left' | 'Right';
}

export interface TwoHandState {
    hands:            HandData[];
    rotationDelta:    { dx: number; dy: number };
    zoomDelta:        number;
    freshPinch:       boolean;   // rising edge: any pinch fires
    freshRightFist:   boolean;   // rising edge: RIGHT fist → close inspector
    leftFistHeld:     boolean;   // continuous: LEFT fist held → lock sphere + suppress targeting
    freshVictory:     boolean;   // rising edge: Victory ✌ → focus mode
    freshDoublePinch: boolean;   // second pinch within window → scroll inspector
    pinchProgress:    number;    // 0-1 proximity to pinch threshold
    swipeDetected:    boolean;   // fast horizontal swipe → dismiss focus mode
    isActive:         boolean;   // both hands open palm = controlling
}

const PINCH_DIST          = 0.06;
const ROT_SCALE           = 3.8;
const ZOOM_SCALE          = 7.0;
const ALPHA               = 0.28;   // EWMA smoothing (lower = smoother but laggier)
const PINCH_COOLDOWN      = 600;    // ms between pinch events
const DOUBLE_PINCH_WINDOW = 1100;   // ms — second pinch within this window after the first = double
const FIST_COOLDOWN       = 900;    // ms between fist (close) events
const VICTORY_COOLDOWN    = 900;    // ms between victory (✌) events
const SWIPE_BUFFER_LEN    = 7;     // frames to accumulate for swipe detection
const SWIPE_THRESH        = 0.22;  // total x displacement over buffer to count as swipe
const SWIPE_COOLDOWN      = 1500;  // ms between swipe events

function mapGesture(raw: string): HandGesture {
    if (raw === 'Open_Palm' || raw === 'Thumb_Up') return 'open_palm';
    if (raw === 'Closed_Fist')                      return 'fist';
    if (raw === 'Victory')                           return 'victory';
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
        hands: [], rotationDelta: { dx: 0, dy: 0 }, zoomDelta: 0,
        freshPinch: false, freshRightFist: false, leftFistHeld: false,
        freshVictory: false, freshDoublePinch: false,
        pinchProgress: 0, swipeDetected: false, isActive: false,
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
    const wasVictoryRef  = useRef(false);
    const lastVictoryRef = useRef(0);
    const wasRightFistRef  = useRef(false);
    const lastRightFistRef = useRef(0);
    const wristXBufRef     = useRef<number[]>([]);
    const lastSwipeRef     = useRef(0);

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
                        const lms        = results.landmarks[h] as { x: number; y: number; z: number }[];
                        const pinch      = isPinching(lms);
                        if (pinch) anyPinch = true;
                        const rawGesture  = results.gestures?.[h]?.[0]?.categoryName ?? '';
                        const rawHanded   = results.handedness?.[h]?.[0]?.categoryName ?? 'Right';
                        const handedness: 'Left' | 'Right' = rawHanded === 'Left' ? 'Left' : 'Right';
                        hands.push({
                            landmarks:  lms,
                            gesture:    pinch ? 'pinch' : mapGesture(rawGesture),
                            wrist:      { x: lms[0].x, y: lms[0].y },
                            handedness,
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

                // ── Rising-edge pinch + double-pinch ──────────────────────────
                const freshPinch = anyPinch && !wasPinchRef.current && now - lastPinchRef.current > PINCH_COOLDOWN;
                const freshDoublePinch = freshPinch && (now - lastPinchRef.current) < DOUBLE_PINCH_WINDOW;
                if (freshPinch) lastPinchRef.current = now;
                wasPinchRef.current = anyPinch;

                // ── RIGHT fist rising-edge (close inspector) ───────────────────
                const anyRightFist = hands.some(h => h.gesture === 'fist' && h.handedness === 'Right');
                const freshRightFist = anyRightFist && !wasRightFistRef.current && now - lastRightFistRef.current > FIST_COOLDOWN;
                if (freshRightFist) lastRightFistRef.current = now;
                wasRightFistRef.current = anyRightFist;

                // ── LEFT fist continuous hold (sphere lock) ────────────────────
                const leftFistHeld = hands.some(h => h.gesture === 'fist' && h.handedness === 'Left');

                // ── Rising-edge victory (✌ focus mode) ────────────────────────
                const anyVictory = hands.some(h => h.gesture === 'victory');
                const freshVictory = anyVictory && !wasVictoryRef.current && now - lastVictoryRef.current > VICTORY_COOLDOWN;
                if (freshVictory) lastVictoryRef.current = now;
                wasVictoryRef.current = anyVictory;

                // ── Continuous pinch progress (0 = far, 1 = full pinch) ────────
                const pinchProgress = hands.reduce((max, h) => {
                    const dist = Math.hypot(h.landmarks[4].x - h.landmarks[8].x, h.landmarks[4].y - h.landmarks[8].y);
                    return Math.max(max, Math.max(0, Math.min(1, 1 - dist / (PINCH_DIST * 2))));
                }, 0);

                // ── Swipe detection — fast horizontal wrist movement ───────────
                if (hands.length > 0) {
                    wristXBufRef.current.push(hands[0].wrist.x);
                    if (wristXBufRef.current.length > SWIPE_BUFFER_LEN) wristXBufRef.current.shift();
                } else {
                    wristXBufRef.current = [];
                }
                const swipeDetected = (() => {
                    const buf = wristXBufRef.current;
                    if (buf.length < SWIPE_BUFFER_LEN) return false;
                    return Math.abs(buf[buf.length - 1] - buf[0]) > SWIPE_THRESH
                        && now - lastSwipeRef.current > SWIPE_COOLDOWN;
                })();
                if (swipeDetected) lastSwipeRef.current = now;

                setTwoHandState({
                    hands,
                    rotationDelta:    { dx: rotDx, dy: rotDy },
                    zoomDelta:        zoomD,
                    freshPinch,
                    freshRightFist,
                    leftFistHeld,
                    freshVictory,
                    freshDoublePinch,
                    pinchProgress,
                    swipeDetected,
                    isActive:         bothPalms,
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
