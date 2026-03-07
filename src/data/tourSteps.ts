export interface TourStep {
    id: string;
    title: string;
    targetNodeId: string | null; // null = center node (deselect all)
    caption: string;
    duration: number; // ms
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'identity',
        title: 'Who I Am',
        targetNodeId: null,
        caption: 'Marc Smith is an AI/ML builder focused on computer vision, intelligent systems, and human-centered AI experiences — currently studying Applied AI at Miami Dade College.',
        duration: 7000,
    },
    {
        id: 'projects',
        title: 'What I Build',
        targetNodeId: 'projects',
        caption: 'Six full-stack AI applications across computer vision, NLP, real-time systems, and machine learning — built with Python, Flutter, React, and Java.',
        duration: 6000,
    },
    {
        id: 'ai-math-notes',
        title: 'AI Math Notes',
        targetNodeId: 'ai-math-notes',
        caption: 'Combines handwriting recognition, dual-model OCR, symbolic solving via SymPy, and Azure GPT-4 explanations — all in a stylus-friendly Flutter interface.',
        duration: 7000,
    },
    {
        id: 'no-strings',
        title: 'No Strings Attached',
        targetNodeId: 'no-strings',
        caption: 'A real-time computer vision system that maps 21-point hand landmarks to musical parameters — no instruments or hardware required. Built with MediaPipe, OpenCV, and Tone.js.',
        duration: 7000,
    },
    {
        id: 'flowstate',
        title: 'FlowState',
        targetNodeId: 'flowstate-1',
        caption: 'An AI-powered focus coach that detects digital distraction and delivers calm, personalized interventions — designed for ADHD users using Gemini LLM and Chrome MV3.',
        duration: 7000,
    },
    {
        id: 'cv-skills',
        title: 'Computer Vision',
        targetNodeId: 'cv',
        caption: 'Specialized in real-time vision systems using MediaPipe, OpenCV, TrOCR, and Google ML Kit — from gesture recognition to handwriting-to-math pipelines.',
        duration: 6000,
    },
    {
        id: 'leadership',
        title: 'Leadership & Experience',
        targetNodeId: 'leadership',
        caption: 'Ten years leading high-performance teams at Apple and Zumiez — applying the same systems thinking to operations, event strategy, and AI product design.',
        duration: 6000,
    },
    {
        id: 'education',
        title: 'Education & Credentials',
        targetNodeId: 'education',
        caption: 'Pursuing a B.S. in Applied Artificial Intelligence at Miami Dade College, backed by 9 certifications from Microsoft, NVIDIA, Google, and IBM.',
        duration: 6000,
    },
    {
        id: 'contact',
        title: "Let's Connect",
        targetNodeId: 'contact',
        caption: 'Open to AI/ML engineering roles, research collaborations, and interesting build opportunities. Based in Miami, FL — available remote or hybrid.',
        duration: 8000,
    },
];
