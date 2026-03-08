import { orbitNodes } from '../data/brainData';
import type { ChildNodeData } from '../data/brainData';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssistantResponse {
    answer: string;
    followUps: string[];
}

type Intent =
    | 'about' | 'projects' | 'computer_vision' | 'llm_nlp' | 'machine_learning'
    | 'full_stack' | 'skills' | 'leadership' | 'experience' | 'education'
    | 'certifications' | 'contact' | 'current_focus' | 'vision' | 'fallback';

// ── Intent patterns ───────────────────────────────────────────────────────────
// Each keyword is weighted by word count (longer phrases score higher),
// so specific patterns like "ai math notes" outrank generic ones like "project".

const INTENT_PATTERNS: Array<{ intent: Intent; keywords: string[] }> = [
    // ── Skill domains ──
    {
        intent: 'computer_vision',
        keywords: ['computer vision', 'cv skills', 'mediapipe', 'opencv', 'gesture tracking', 'visual recognition', 'image recognition', 'hand tracking', 'vision pipeline'],
    },
    {
        intent: 'llm_nlp',
        keywords: ['llm', 'nlp', 'language model', 'gpt', 'gemini', 'openai', 'azure openai', 'rag', 'pgvector', 'embedding', 'natural language', 'vapi', 'prompt engineering'],
    },
    {
        intent: 'machine_learning',
        keywords: ['machine learning', 'deep learning', 'scikit', 'tensorflow', 'pytorch', 'neural network', 'cnn', 'svm', 'linear regression', 'model training', 'ml model'],
    },
    {
        intent: 'full_stack',
        keywords: ['full stack', 'fullstack', 'react', 'supabase', 'fastapi', 'flutter', 'mobile app', 'web app', 'backend', 'frontend', 'edge function', 'zustand'],
    },
    {
        intent: 'skills',
        keywords: ['skill', 'tech stack', 'technology', 'framework', 'tool', 'language', 'know', 'familiar with', 'proficient', 'what does marc use', 'what tools'],
    },

    // ── Professional background ──
    {
        intent: 'leadership',
        keywords: ['leadership', 'manage', 'management', 'team', 'apple', 'zumiez', 'store manager', 'operations', 'event coordinator', 'lead'],
    },
    {
        intent: 'experience',
        keywords: ['work experience', 'job history', 'career', 'professional background', 'company', 'employer', 'work history', 'previous role'],
    },
    {
        intent: 'education',
        keywords: ['education', 'school', 'degree', 'studying', 'college', 'university', 'coursework', 'major', 'miami dade', 'applied ai'],
    },
    {
        intent: 'certifications',
        keywords: ['certification', 'certified', 'cert', 'nvidia', 'microsoft azure', 'azure', 'google cert', 'ibm', 'credential', 'badge'],
    },
    {
        intent: 'contact',
        keywords: ['contact', 'reach marc', 'email', 'hire marc', 'linkedin', 'github profile', 'available', 'open to work', 'get in touch', 'role', 'open to', 'position', 'opportunity'],
    },
    {
        intent: 'current_focus',
        keywords: ['currently', 'right now', 'working on', 'latest project', 'what is marc building', 'what is he doing', 'current project', 'focus'],
    },
    {
        intent: 'vision',
        keywords: ['goal', 'vision', 'future plan', 'aspire', 'interest', 'passion', 'looking for', 'career goal', 'what does marc want'],
    },

    // ── General ──
    {
        intent: 'about',
        keywords: ['who is marc', 'about marc', 'introduce marc', 'tell me about marc', 'describe marc', 'summary', 'overview of marc', 'background'],
    },
    {
        intent: 'projects',
        keywords: ['project', 'built', 'portfolio', 'application', 'app', 'what has marc built', 'show projects', 'all projects'],
    },
];

function detectIntent(query: string): Intent {
    const q = query.toLowerCase().trim();
    let best: Intent = 'fallback';
    let bestScore = 0;

    for (const { intent, keywords } of INTENT_PATTERNS) {
        let score = 0;
        for (const kw of keywords) {
            if (q.includes(kw)) {
                // Longer keyword matches score proportionally higher
                score += kw.split(' ').length;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            best = intent;
        }
    }

    return bestScore > 0 ? best : 'fallback';
}

// ── Responses ─────────────────────────────────────────────────────────────────

const RESPONSES: Record<Intent, AssistantResponse> = {
    about: {
        answer: "Marc Smith is an AI/ML engineer and full-stack developer based in Miami, FL. He's pursuing a B.S. in Applied Artificial Intelligence at Miami Dade College while building real-world AI tools — spanning computer vision pipelines, LLM-powered apps, and full-stack systems. Before transitioning into AI, he spent over a decade leading operations and teams at Apple and Zumiez. He brings both technical depth and a product-minded approach to what he builds.",
        followUps: ["What projects has Marc built?", "What are his technical skills?", "What is he currently focused on?"],
    },

    projects: {
        answer: "Marc has built six AI/ML applications: AI Math Notes (handwriting OCR → SymPy → GPT-4 math tutor), No Strings Attached (real-time gesture-controlled music via MediaPipe), FlowState 1.0 (AI focus coach Chrome extension for ADHD users), FlowState 2.0 (full-stack voice AI workspace with RAG and pgvector), Smart Calendar (syllabus OCR → conflict-free auto-schedule in JavaFX), and Calories Predictor (biometric regression model, R²=0.96, deployed on Streamlit).",
        followUps: ["Tell me about FlowState 2.0", "What computer vision work has he done?", "Which projects use LLMs?"],
    },

    computer_vision: {
        answer: "Marc has built two dedicated computer vision projects. AI Math Notes uses a dual-model OCR ensemble — Google ML Kit for print and TrOCR for handwritten symbols — to convert handwriting into SymPy-solvable expressions. No Strings Attached uses MediaPipe's 21-point hand landmark detection at 30fps to map real-time gestures to musical parameters, synthesized through a custom Tone.js engine with sub-50ms latency. His CV toolkit includes MediaPipe, OpenCV, TrOCR, Google ML Kit, Python, and Flutter.",
        followUps: ["Tell me more about AI Math Notes", "Tell me more about No Strings Attached", "What other skills does Marc have?"],
    },

    llm_nlp: {
        answer: "Marc has integrated LLMs and NLP across multiple projects. In AI Math Notes, Azure OpenAI GPT-4 Turbo generates step-by-step math explanations from handwritten input. In FlowState 1.0, Gemini LLM delivers ADHD-aware focus coaching based on behavioral context. FlowState 2.0 is his most advanced LLM work — a Vapi + Gemini 1.5 voice AI agent with full RAG over workspace data, pgvector semantic search, and a custom NLP task parser. Tools: Azure OpenAI, Gemini AI, Vapi, RAG, pgvector, SymPy.",
        followUps: ["Tell me about FlowState 2.0", "What Azure credentials does Marc hold?", "What are Marc's ML skills?"],
    },

    machine_learning: {
        answer: "Marc's ML work spans classical and deep learning. His Calories Predictor achieved R²=0.96 using linear regression on real biometric and exercise data. His ML toolkit includes Scikit-learn, TensorFlow, PyTorch, Keras, Pandas, NumPy, OpenCV, CNN, and SVM. He also holds four NVIDIA certifications covering deep learning, LLM development, and Transformer-based NLP, and has built and evaluated Language and Vision models in Azure AI Studio.",
        followUps: ["What certifications does Marc hold?", "What tools does he use?", "Show me all projects"],
    },

    full_stack: {
        answer: "Marc builds full-stack applications across web, mobile, and desktop. His web stack centers on React 19, TypeScript, Tailwind CSS v4, Supabase, and FastAPI. For mobile he uses Flutter and Dart. Desktop work includes JavaFX. He's shipped Chrome extensions with Manifest V3, built Supabase Edge Functions in Deno, and manages real-time state with Zustand. Databases: PostgreSQL with pgvector, MySQL, Firebase, SQL Server, and Oracle.",
        followUps: ["What backend tools does Marc use?", "Tell me about FlowState 2.0", "What mobile projects has he built?"],
    },

    skills: {
        answer: "Marc's technical skills span: Languages — Python, Java, TypeScript, SQL, Dart. ML/AI — Scikit-learn, TensorFlow, PyTorch, OpenCV, CNN, SVM, Keras. LLMs & NLP — Azure OpenAI GPT-4, Gemini AI, Vapi, RAG, pgvector, SymPy. Frameworks — React 19, Flutter, FastAPI, Supabase, Tailwind CSS v4, Chrome MV3. Databases — PostgreSQL, MySQL, SQL Server, Oracle, Firebase. Tools — Azure AI Studio, NVIDIA Labs, Git, Tableau, Power BI.",
        followUps: ["What ML tools does Marc use?", "What LLM work has he done?", "Which projects use these skills?"],
    },

    leadership: {
        answer: "Marc has over a decade of leadership experience. At Apple (2025–present), he works as a Specialist at Brickell City Centre — delivering customer experiences, diagnosing hardware and software issues, and educating clients on the Apple ecosystem. At Zumiez (2014–2024), he was a Senior Store Manager across multiple South Florida locations, overseeing 100+ product launches, 30+ community events, KPI-linked training programs, succession planning, and multi-location operations. He also served as Marketing Event Coordinator, partnering with schools, skate parks, and streetwear brands.",
        followUps: ["What is Marc currently focused on?", "What is Marc's educational background?", "How can I contact Marc?"],
    },

    experience: {
        answer: "Marc's professional background includes three roles: Apple Specialist (2025–present) at Brickell City Centre, Miami — customer experience, hardware diagnostics, and ecosystem education. Zumiez Senior Store Manager (2014–2024) across multiple South Florida locations — multi-location ops, 100+ product lines, 30+ events, KPI-linked training, and succession planning. Zumiez Marketing Event Coordinator (2014–2024) — community events, brand partnerships, and project plans with risk tracking.",
        followUps: ["Tell me about Marc's leadership background", "What is Marc currently building?", "What is his educational background?"],
    },

    education: {
        answer: "Marc is pursuing a B.S. in Applied Artificial Intelligence at Miami Dade College (2024–2027), alongside Business Intelligence Specialist and AI Practitioner credentials (2025). He holds an A.S. in Supply Chain Management from Indian River State College (2016). AI coursework covers Machine Learning, Computer Vision, NLP & LLMs, Data Analytics, Database Design, Robotics, and AI Systems Automation.",
        followUps: ["What certifications does Marc hold?", "What is Marc currently building?", "What are his technical skills?"],
    },

    certifications: {
        answer: "Marc holds nine industry certifications: Microsoft Azure AI Fundamentals; four NVIDIA certifications covering Deep Learning, Rapid Application Development with LLMs, Building LLMs with Prompt Engineering, and Transformer-based NLP; Google certifications in Cybersecurity, Project Management, and AI Essentials; and IBM AI Essentials.",
        followUps: ["What is Marc's education background?", "What LLM work has he done?", "What are his Azure skills?"],
    },

    contact: {
        answer: "You can reach Marc at marc.tonysmith@gmail.com. His GitHub is github.com/marctony004 and his LinkedIn is linkedin.com/in/marc-smith-786685336. He's based in Miami, FL and is open to full-time AI/ML and full-stack engineering roles — remote, hybrid, or in-person.",
        followUps: ["What is Marc currently building?", "What roles is he open to?", "What are his technical skills?"],
    },

    current_focus: {
        answer: "Marc is currently building FlowState 2.0 — a full-stack AI workspace for musicians and producers. It features a Vapi + Gemini 1.5 voice AI agent with RAG over workspace data, pgvector semantic similarity search across ideas and tasks in Supabase PostgreSQL, a custom NLP task parser that converts speech into structured tasks, and real-time sync via Supabase Edge Functions. It's his most architecturally ambitious project to date.",
        followUps: ["Tell me more about FlowState 2.0", "What is Marc's tech stack for this?", "What other projects has he built?"],
    },

    vision: {
        answer: "Marc's focus is on building AI tools that solve real problems — not demos, but production-quality systems. He's drawn to the intersection of AI and human attention (FlowState), creative tools for artists and musicians, and making intelligent systems accessible. He's actively looking for AI/ML engineering roles where he can apply his full-stack and AI background to meaningful products, and is open to research collaboration.",
        followUps: ["What is Marc currently building?", "How can I contact Marc?", "What projects has Marc built?"],
    },

    fallback: {
        answer: "I'm not fully sure about that based on the current portfolio data, but I can tell you about Marc's projects, technical skills, work experience, or education. Try asking something more specific.",
        followUps: ["What projects has Marc built?", "What are Marc's technical skills?", "Tell me about Marc's experience"],
    },
};

// ── Dynamic project matching ───────────────────────────────────────────────────
// Derives searchable terms from each project node in brainData at runtime,
// so new projects added to brainData are automatically discoverable.

const allProjects: ChildNodeData[] =
    orbitNodes.find(n => n.id === 'projects')?.children ?? [];

function buildProjectTerms(node: ChildNodeData): string[] {
    const terms: string[] = [
        node.id.replace(/-/g, ' '),           // "ai math notes", "no strings"
        node.label.toLowerCase(),              // "AI Math Notes" → "ai math notes"
        ...(node.tech ?? []).map(t => t.toLowerCase()),
        ...(node.pipeline ?? []).map(p => p.label.toLowerCase()),
        ...(node.pipeline ?? []).flatMap(p => (p.tools ?? []).map(t => t.toLowerCase())),
    ];
    return [...new Set(terms)];
}

function findProjectNode(query: string): ChildNodeData | null {
    const q = query.toLowerCase();
    let best: ChildNodeData | null = null;
    let bestScore = 0;

    for (const node of allProjects) {
        const terms = buildProjectTerms(node);
        let score = 0;
        for (const term of terms) {
            if (q.includes(term)) score += term.split(' ').length;
        }
        if (score > bestScore) { bestScore = score; best = node; }
    }

    return bestScore > 0 ? best : null;
}

function projectResponse(node: ChildNodeData): AssistantResponse {
    const techLine = node.tech?.length
        ? `Stack: ${node.tech.join(', ')}.`
        : '';
    const pipelineLine = node.pipeline?.length
        ? `Pipeline: ${node.pipeline.map(p => p.label).join(' → ')}.`
        : '';
    const highlights = node.bullets.slice(0, 3).map(b => `• ${b}`).join(' ');

    return {
        answer: `${node.summary} ${highlights} ${pipelineLine} ${techLine}`.trim(),
        followUps: [
            'What other projects has Marc built?',
            'What are his technical skills?',
            'What is Marc currently focused on?',
        ],
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateResponse(query: string): AssistantResponse {
    // Project-specific queries are resolved dynamically from brainData
    const projectNode = findProjectNode(query);
    if (projectNode) return projectResponse(projectNode);

    const intent = detectIntent(query);
    return RESPONSES[intent];
}
