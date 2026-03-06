import { useRef, useState, useCallback } from 'react';

export type GestureName = 'open_palm' | 'fist' | 'pinch' | 'swipe_left' | 'swipe_right' | 'none';

export interface GestureState {
    gesture: GestureName;
    confidence: number;
    landmarks: { x: number; y: number; z: number }[] | null;
}

const SWIPE_THRESHOLD  = 0.16;  // wrist x delta across buffer to trigger swipe
const SWIPE_FRAMES     = 18;    // rolling window size
const SWIPE_COOLDOWN   = 900;   // ms between swipe events
const PINCH_THRESHOLD  = 0.06;  // normalised distance between thumb tip & index tip

// Mediapipe gesture name → our canonical name
function mapGesture(raw: string): GestureName {
    switch (raw) {
        case 'Open_Palm':   return 'open_palm';
        case 'Closed_Fist': return 'fist';
        case 'Thumb_Up':    return 'open_palm'; // treat thumb-up as "hold"
        default:            return 'none';
    }
}

export function useGestureDetection() {
    const videoRef  = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isLoading,    setIsLoading]    = useState(false);
    const [gestureState, setGestureState] = useState<GestureState>({ gesture: 'none', confidence: 0, landmarks: null });

    // Mutable refs — no re-renders needed
    const recognizerRef    = useRef<unknown>(null);
    const streamRef        = useRef<MediaStream | null>(null);
    const rafRef           = useRef<number>(0);
    const lastSwipeRef     = useRef<number>(0);
    const wristHistoryRef  = useRef<number[]>([]);
    const runningRef       = useRef(false);

    const stop = useCallback(() => {
        runningRef.current = false;
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    const start = useCallback(async (): Promise<'granted' | 'denied' | 'error'> => {
        setIsLoading(true);
        try {
            // ── 1. Dynamic import of MediaPipe (lazy — not in main bundle) ──
            const { GestureRecognizer, FilesetResolver } = await import('@mediapipe/tasks-vision');

            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );

            let recognizer: unknown;
            try {
                recognizer = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
                        delegate: 'GPU',
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                });
            } catch {
                // GPU delegate failed — fall back to CPU
                recognizer = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
                        delegate: 'CPU',
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                });
            }
            recognizerRef.current = recognizer;

            // ── 2. Webcam ──
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
            } catch {
                setIsLoading(false);
                return 'denied';
            }
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise<void>(res => {
                    if (!videoRef.current) return res();
                    videoRef.current.onloadedmetadata = () => res();
                });
                await videoRef.current.play();
            }

            setIsLoading(false);
            runningRef.current = true;

            // ── 3. Detection loop ──
            const detect = () => {
                if (!runningRef.current) return;
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas || video.readyState < 2) {
                    rafRef.current = requestAnimationFrame(detect);
                    return;
                }

                // Sync canvas size to video
                canvas.width  = video.videoWidth;
                canvas.height = video.videoHeight;

                const now = performance.now();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const results = (recognizerRef.current as any).recognizeForVideo(video, now);

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }

                const w = canvas.width;
                const h = canvas.height;

                let detectedGesture: GestureName = 'none';
                let detectedConf = 0;
                let detectedLandmarks: GestureState['landmarks'] = null;

                if (results?.landmarks?.length > 0) {
                    const lms = results.landmarks[0] as { x: number; y: number; z: number }[];
                    detectedLandmarks = lms;

                    // ── Draw landmarks (mirrored to match CSS scaleX(-1)) ──
                    if (ctx) {
                        ctx.fillStyle = 'rgba(61,227,255,0.75)';
                        ctx.strokeStyle = 'rgba(61,227,255,0.35)';
                        ctx.lineWidth = 1.5;

                        // Connections: palm (0-1-2-3-4), index (0-5-6-7-8), etc.
                        const connections = [
                            [0,1],[1,2],[2,3],[3,4],
                            [0,5],[5,6],[6,7],[7,8],
                            [0,9],[9,10],[10,11],[11,12],
                            [0,13],[13,14],[14,15],[15,16],
                            [0,17],[17,18],[18,19],[19,20],
                            [5,9],[9,13],[13,17],
                        ];
                        for (const [a, b] of connections) {
                            const ax = (1 - lms[a].x) * w;
                            const ay = lms[a].y * h;
                            const bx = (1 - lms[b].x) * w;
                            const by = lms[b].y * h;
                            ctx.beginPath();
                            ctx.moveTo(ax, ay);
                            ctx.lineTo(bx, by);
                            ctx.stroke();
                        }
                        for (const lm of lms) {
                            const dx = (1 - lm.x) * w;
                            const dy = lm.y * h;
                            ctx.beginPath();
                            ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }

                    // ── Pinch detection (thumb tip #4, index tip #8) ──
                    const thumbTip = lms[4];
                    const indexTip = lms[8];
                    const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
                    if (dist < PINCH_THRESHOLD) {
                        detectedGesture = 'pinch';
                        detectedConf    = Math.max(0, 1 - dist / PINCH_THRESHOLD);
                    } else if (results.gestures?.[0]?.length > 0) {
                        const top = results.gestures[0][0];
                        detectedGesture = mapGesture(top.categoryName);
                        detectedConf    = top.score ?? 0;
                    }

                    // ── Swipe detection (wrist x history) ──
                    const wristX = lms[0].x; // raw, un-mirrored
                    const hist = wristHistoryRef.current;
                    hist.push(wristX);
                    if (hist.length > SWIPE_FRAMES) hist.shift();

                    if (hist.length === SWIPE_FRAMES && now - lastSwipeRef.current > SWIPE_COOLDOWN) {
                        const dx = hist[hist.length - 1] - hist[0];
                        // Camera x decreases when user moves right (mirrored)
                        if (dx < -SWIPE_THRESHOLD) {
                            detectedGesture = 'swipe_right';
                            detectedConf    = 1;
                            lastSwipeRef.current = now;
                            wristHistoryRef.current = [];
                        } else if (dx > SWIPE_THRESHOLD) {
                            detectedGesture = 'swipe_left';
                            detectedConf    = 1;
                            lastSwipeRef.current = now;
                            wristHistoryRef.current = [];
                        }
                    }
                } else {
                    wristHistoryRef.current = [];
                }

                setGestureState({ gesture: detectedGesture, confidence: detectedConf, landmarks: detectedLandmarks });
                rafRef.current = requestAnimationFrame(detect);
            };

            rafRef.current = requestAnimationFrame(detect);
            return 'granted';

        } catch (err) {
            console.error('[GestureDetection]', err);
            setIsLoading(false);
            return 'error';
        }
    }, []);

    return { videoRef, canvasRef, gestureState, isLoading, start, stop };
}
