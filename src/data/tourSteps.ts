export interface TourStep {
    id: string;
    title: string;
    targetNodeId: string | null; // null = center node (deselect all)
    caption: string;
    subline?: string;
    duration: number; // ms
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'identity',
        title: 'Who I Am',
        targetNodeId: null,
        caption: 'Marc Smith builds AI systems focused on computer vision, intelligent interfaces, and tools that feel as good as they perform.',
        subline: 'Currently studying Applied AI while shipping production-ready machine learning applications.',
        duration: 7000,
    },
    {
        id: 'projects',
        title: 'My AI Systems',
        targetNodeId: 'projects',
        caption: 'Six applied AI projects spanning handwriting recognition, gesture control, focus coaching, and real-time computer vision — across mobile, web, and desktop.',
        subline: 'Each project covers the full ML pipeline: data, model, and production interface.',
        duration: 6000,
    },
    {
        id: 'ai-math-notes',
        title: 'AI Math Notes',
        targetNodeId: 'ai-math-notes',
        caption: 'Write a math problem by hand. The app reads it, solves it symbolically, and explains every step — powered by OCR, SymPy, and GPT-4.',
        subline: 'Built with Flutter, TrOCR, Google ML Kit, and Azure OpenAI.',
        duration: 7000,
    },
    {
        id: 'no-strings',
        title: 'Gesture-Driven Music',
        targetNodeId: 'no-strings',
        caption: 'No instruments. No hardware. Just hand gestures mapped to music in real time through computer vision and a custom audio engine.',
        subline: 'MediaPipe tracks 21 hand landmarks. Tone.js synthesizes sound in under 50ms.',
        duration: 7000,
    },
    {
        id: 'flowstate',
        title: 'FlowState 2.0',
        targetNodeId: 'flowstate-2',
        caption: 'An AI-powered creative workspace that connects ideas, tasks, and context — built for deep focus with voice AI, semantic search, and spatial memory.',
        subline: 'Built with Vapi, Gemini 1.5, pgvector, and Supabase real-time sync.',
        duration: 7000,
    },
    {
        id: 'leadership',
        title: 'Leadership + Systems Thinking',
        targetNodeId: 'leadership',
        caption: 'A decade leading teams, scaling operations, and orchestrating large events — the same operational clarity now applied to AI product design.',
        subline: 'Real-world leadership shapes how Marc designs technology for real workflows and real people.',
        duration: 6000,
    },
    {
        id: 'education',
        title: 'Education + Technical Growth',
        targetNodeId: 'education',
        caption: 'Pursuing a B.S. in Applied Artificial Intelligence, backed by nine certifications from Microsoft, NVIDIA, Google, and IBM.',
        subline: 'Building in machine learning, NLP, and computer vision while studying full time.',
        duration: 6000,
    },
    {
        id: 'contact',
        title: "Let's Connect",
        targetNodeId: 'contact',
        caption: 'Open to AI/ML engineering roles, research collaborations, and ambitious build opportunities. Based in Miami — remote and hybrid welcome.',
        subline: 'Email, GitHub, and LinkedIn are all right here.',
        duration: 8000,
    },
];
