export interface PipelineStep {
    label: string;
    detail: string;
    tools?: string[];
}

export interface ChildNodeData {
    id: string;
    label: string;
    tooltip: string;
    summary: string;
    tech: string[];
    bullets: string[];
    pipeline?: PipelineStep[];
    capabilities?: string[];
    links?: { github?: string; demo?: string; };
}

export interface OrbitNodeData {
    id: string;
    label: string;
    tooltip: string;
    summary: string;
    bullets: string[];
    tech?: string[];
    capabilities?: string[];
    links?: { github?: string; demo?: string; email?: string; linkedin?: string; };
    children?: ChildNodeData[];
}

export const currentStatus = 'Building: FlowState 2.0';

export const CAPABILITY_FILTERS = [
    'Computer Vision', 'NLP/LLMs', 'Full-Stack', 'Azure', 'Real-Time', 'Mobile',
] as const;
export type Capability = typeof CAPABILITY_FILTERS[number];

// ── Skill groups for Recruiter View ─────────────────────────────────────────
export const skillGroups = [
    { label: 'Languages',     items: ['Python', 'Java', 'SQL', 'TypeScript', 'Dart'] },
    { label: 'ML / AI',       items: ['Scikit-learn', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Keras', 'OpenCV', 'CNN', 'SVM'] },
    { label: 'LLMs & NLP',    items: ['Azure OpenAI GPT-4', 'Gemini AI', 'Vapi', 'RAG', 'pgvector', 'SymPy', 'NLP Pipelines'] },
    { label: 'Frameworks',    items: ['React 19', 'Flutter', 'FastAPI', 'Supabase', 'Zustand', 'Tailwind CSS v4', 'Chrome MV3'] },
    { label: 'Databases',     items: ['PostgreSQL', 'MySQL', 'SQL Server', 'Oracle', 'Firebase'] },
    { label: 'Tools & Cloud', items: ['Azure AI Studio', 'NVIDIA Labs', 'Git', 'Tableau', 'Power BI', 'Google ML Kit', 'JavaFX'] },
];

// ── Work experience for Recruiter View ───────────────────────────────────────
export const workExperience = [
    {
        title: 'Apple — Specialist',
        period: '2025–Present',
        location: 'Brickell City Centre, Miami',
        bullets: [
            'Delivered world-class customer experience with personalized product and service recommendations',
            'Troubleshot and diagnosed hardware/software issues using Apple diagnostic tools',
            'Identified recurring technical patterns and communicated insights for root-cause analysis',
            'Maintained expert-level knowledge of Apple ecosystem to guide customers through purchasing and setup',
        ],
    },
    {
        title: 'Zumiez — Sr. Store Manager',
        period: 'June 2014 – May 2024',
        location: 'South Florida — Multi-location',
        bullets: [
            'Led high-volume retail operations across multiple locations through strategic leadership and training',
            'Rolled out 100+ product lines and hosted 30+ in-store events with market research and promotional strategy',
            'Implemented KPI-linked training programs and succession plans; managed financial resources and staffing',
            'Built lasting relationships with schools, youth organizations, and local vendors to drive brand loyalty',
        ],
    },
    {
        title: 'Zumiez — Marketing Event Coordinator',
        period: '2014–2024',
        bullets: [
            'Spearheaded community events including product releases, contests, and charity fundraisers',
            'Partnered with skate parks, streetwear brands, schools, and youth organizations for grassroots promotion',
            'Developed comprehensive project plans with schedules, risk tracking, and executive reporting',
        ],
    },
];

// ── Education & certs for Recruiter View ─────────────────────────────────────
export const educationData = [
    { degree: 'B.S. Applied Artificial Intelligence', school: 'Miami Dade College', period: '2024–2027' },
    { degree: 'Business Intelligence Specialist', school: 'Miami Dade College', period: '2025' },
    { degree: 'AI Practitioner', school: 'Miami Dade College', period: '2025' },
    { degree: 'A.S. Supply Chain Management', school: 'Indian River State College', period: '2016' },
];

export const certifications = [
    'Microsoft Azure AI Fundamentals',
    'NVIDIA — Getting Started with Deep Learning',
    'NVIDIA — Rapid Application Dev with LLMs',
    'NVIDIA — Building LLMs with Prompt Engineering',
    'NVIDIA — Introduction to Transformer-based NLP',
    'Google Cybersecurity Fundamentals',
    'Google Project Management Fundamentals',
    'Google AI Essentials',
    'IBM AI Essentials',
];

// ── Main node data ────────────────────────────────────────────────────────────
export const orbitNodes: OrbitNodeData[] = [
    {
        id: 'projects',
        label: 'Projects',
        tooltip: '6 AI/ML applications built',
        summary: 'Six full-stack AI applications spanning computer vision, NLP, machine learning, and real-time systems — across Flutter, React, Python, and Java.',
        bullets: [
            'Integrated Azure OpenAI, Google ML Kit, Gemini LLM, Vapi, and MediaPipe across projects',
            'Shipped across Chrome extensions, mobile apps, desktop UIs, and web apps',
            'Covered the full ML pipeline: data → model → deployment → UI',
        ],
        children: [
            {
                id: 'ai-math-notes',
                label: 'AI Math Notes',
                tooltip: 'Handwriting → OCR → SymPy → GPT tutor',
                summary: 'AI-powered math note-taking app that converts handwritten equations into step-by-step GPT-4 solutions.',
                tech: ['Flutter', 'FastAPI', 'SymPy', 'Google ML Kit', 'TrOCR', 'Azure OpenAI'],
                pipeline: [
                    { label: 'Handwriting', detail: 'Stylus or finger input captured on Flutter canvas. Supports multi-stroke equations with undo/redo.', tools: ['Flutter Canvas', 'Stylus API'] },
                    { label: 'OCR', detail: 'Dual-model ensemble: Google ML Kit for printed text + TrOCR for handwritten math symbols. Outputs raw LaTeX-ish string.', tools: ['Google ML Kit', 'TrOCR'] },
                    { label: 'Normalize', detail: 'Cleans OCR output — fixes common misreads (1/l, x/×), normalizes spacing, and converts to SymPy-compatible expression syntax.', tools: ['Python', 'Regex'] },
                    { label: 'SymPy Solve', detail: 'Symbolic math engine evaluates and simplifies the expression. Handles algebra, calculus derivatives/integrals, and geometry formulas.', tools: ['SymPy', 'FastAPI'] },
                    { label: 'GPT Tutor', detail: 'Azure OpenAI GPT-4 Turbo generates a step-by-step explanation of the solution path, tailored to student-level clarity.', tools: ['Azure OpenAI', 'GPT-4 Turbo'] },
                ],
                capabilities: ['Computer Vision', 'NLP/LLMs', 'Azure', 'Mobile'],
                bullets: [
                    'Multi-modal handwriting recognition using TrOCR + Google ML Kit',
                    'Azure OpenAI GPT-4 Turbo for contextual step-by-step math explanations',
                    'Covers algebra, calculus, and geometry from raw handwritten input',
                    'Theme selection, date sync, and stylus-exclusive interface options',
                ],
                links: { github: 'https://github.com/marctony004/ai_mathnotes' },
            },
            {
                id: 'no-strings',
                label: 'No Strings Attached',
                tooltip: 'Gestures → music, zero hardware',
                summary: 'Real-time CV system that turns hand and object gestures into music — no instruments or hardware needed.',
                tech: ['Python', 'MediaPipe', 'OpenCV', 'Tone.js'],
                pipeline: [
                    { label: 'Camera Feed', detail: 'Live webcam capture at 30fps. Frame preprocessing handles lighting normalization before landmark detection.', tools: ['OpenCV', 'Python'] },
                    { label: 'MediaPipe', detail: '21-point hand landmark detection running in real-time. Tracks both hands independently with sub-20ms inference time.', tools: ['MediaPipe', 'Python'] },
                    { label: 'Gesture Map', detail: 'Custom classifier interprets landmark positions into musical gestures: pitch control, beat trigger, modulation, and mute.', tools: ['NumPy', 'Python'] },
                    { label: 'Param Map', detail: 'Translates gesture coordinates to audio parameters. x/y position → pitch/velocity; hand spread → reverb width.', tools: ['Python', 'OSC Bridge'] },
                    { label: 'Tone.js', detail: 'Web audio engine synthesizes sound with sub-50ms latency. Supports multiple synth voices, beat sequencing, and real-time effects.', tools: ['Tone.js', 'Web Audio API'] },
                ],
                capabilities: ['Computer Vision', 'Real-Time'],
                bullets: [
                    '21-point hand landmark tracking mapped to musical notes, beats, and effects',
                    'Custom Tone.js audio engine achieving sub-50ms sound latency',
                    'Zero hardware required — fully vision-driven instrument interface',
                    'Full pipeline: camera → gesture detection → CV processing → audio synthesis',
                ],
                links: { github: 'https://github.com/marctony004/No-strings-attached' },
            },
            {
                id: 'flowstate-1',
                label: 'FlowState 1.0',
                tooltip: 'Chrome MV3 + drift detection + Gemini',
                summary: 'Chrome extension that detects real-time digital distraction and delivers context-aware AI coaching for ADHD users.',
                tech: ['React', 'TypeScript', 'Chrome MV3', 'Gemini LLM', 'NLP'],
                pipeline: [
                    { label: 'Tab Activity', detail: 'Chrome MV3 background service worker monitors active tab URL changes and time-on-domain without reading page content.', tools: ['Chrome MV3', 'TypeScript'] },
                    { label: 'Drift Detect', detail: 'Domain-level scoring classifies tabs as focused, distracted, or ambiguous using heuristics and a domain allowlist/blocklist.', tools: ['NLP', 'chrome.storage'] },
                    { label: 'Context Build', detail: 'Assembles a prompt context from current goal, recent drift events, session history, and time-since-last-focus.', tools: ['Zustand', 'TypeScript'] },
                    { label: 'Gemini LLM', detail: 'Gemini generates personalized, non-judgmental coaching responses calibrated for ADHD users — calm nudges, not alarms.', tools: ['Gemini API', 'Prompt Engineering'] },
                    { label: 'Focus Summary', detail: 'Session data (focus time, drift count, coaching interactions) persisted to chrome.storage.local and surfaced in the popup UI.', tools: ['chrome.storage', 'React'] },
                ],
                capabilities: ['NLP/LLMs', 'Full-Stack'],
                bullets: [
                    'Domain-level drift detection via Manifest V3 background service workers',
                    'Gemini LLM generates personalized, non-judgmental focus coaching responses',
                    'Behavioral logging (focus sessions, drift events) via chrome.storage.local',
                    'Designed for ADHD users — calm, non-intrusive UX with smart nudges',
                ],
                links: { github: 'https://github.com/profgarcia-ai/nlp-final-project-fall2025-marctony004' },
            },
            {
                id: 'flowstate-2',
                label: 'FlowState 2.0',
                tooltip: 'AI workspace for creative professionals',
                summary: 'Full-stack AI-powered workspace for musicians and producers — featuring voice AI, RAG, semantic search, and real-time collaboration.',
                tech: ['React 19', 'Supabase', 'Tailwind CSS v4', 'Vapi', 'Gemini AI', 'Zustand', 'PostgreSQL', 'pgvector'],
                pipeline: [
                    { label: 'Voice Input', detail: 'Vapi handles real-time voice capture, transcription, and turn management — enabling natural conversation with the AI workspace agent.', tools: ['Vapi', 'WebRTC'] },
                    { label: 'Vapi + RAG', detail: 'Gemini 1.5 retrieves relevant context from workspace data via RAG before generating a response, grounding answers in your actual notes and tasks.', tools: ['Gemini 1.5', 'Vapi', 'RAG'] },
                    { label: 'pgvector', detail: 'Semantic similarity search over all workspace content — ideas, tasks, projects — using pgvector embeddings stored in Supabase PostgreSQL.', tools: ['pgvector', 'PostgreSQL'] },
                    { label: 'Supabase Sync', detail: 'Real-time data sync and auth via Supabase Edge Functions (Deno). Session memory and attention patterns persisted to backend.', tools: ['Supabase', 'Deno', 'PostgreSQL'] },
                    { label: 'Workspace UI', detail: 'React 19 workspace surfaces parsed tasks, semantic search results, and AI coaching in a unified interface with real-time state via Zustand.', tools: ['React 19', 'Zustand', 'Tailwind v4'] },
                ],
                capabilities: ['NLP/LLMs', 'Full-Stack', 'Real-Time'],
                bullets: [
                    'Voice AI agent (Vapi + Gemini 1.5) with RAG over workspace data via natural language',
                    'pgvector semantic similarity search across ideas, tasks, and projects in Supabase',
                    'Zustand attention-pattern tracking with contextual session memory persisted to backend',
                    'Custom NLP task parser decoding intent → structured tasks with deadlines and assignees',
                    'Supabase Edge Functions (Deno) + real-time data sync + seamless auth flows',
                ],
                links: { github: 'https://github.com/marctony004/Flowstate' },
            },
            {
                id: 'smart-calendar',
                label: 'Smart Calendar',
                tooltip: 'OCR syllabus → auto-schedule',
                summary: 'Intelligent academic scheduler that parses syllabi via OCR and auto-generates conflict-free study plans.',
                tech: ['Java', 'JavaFX', 'Google ML Kit', 'OCR', 'Rule-based AI'],
                pipeline: [
                    { label: 'Syllabus Upload', detail: 'Accepts PDF or DOCX syllabi. Text layer extracted directly from PDFs; image-based PDFs fall back to OCR rendering.', tools: ['JavaFX', 'Apache PDFBox'] },
                    { label: 'OCR Extract', detail: 'Google ML Kit OCR pipeline processes scanned syllabi, identifying date patterns, assignment names, and exam markers.', tools: ['Google ML Kit', 'Java'] },
                    { label: 'Event Parse', detail: 'Rule-based parser identifies due dates, exam blocks, and assignment names from raw OCR text using date regex and keyword matching.', tools: ['Java', 'Regex'] },
                    { label: 'Schedule Plan', detail: 'Scheduling engine distributes study blocks before deadlines with zero conflicts, respecting user-defined availability windows.', tools: ['Java', 'Rule Engine'] },
                    { label: 'Calendar UI', detail: 'Full JavaFX desktop interface with drag-and-drop rescheduling, smart reminders, and monthly/weekly view toggle.', tools: ['JavaFX', 'Java'] },
                ],
                capabilities: ['Computer Vision', 'Full-Stack'],
                bullets: [
                    'OCR pipeline extracts deadlines and assignments from uploaded PDFs',
                    'Rules-based engine distributes study blocks with zero scheduling conflicts',
                    'Full JavaFX desktop UI with drag-and-drop scheduling interface',
                    'Smart reminders and notification alerts for due dates and study blocks',
                ],
                links: { github: 'https://github.com/marctony004/smart-student-calendar' },
            },
            {
                id: 'calories',
                label: 'Calories Predictor',
                tooltip: 'Biometrics → regression → Streamlit',
                summary: 'ML web app predicting calories burned from biometric inputs, deployed on Streamlit with R²=0.96.',
                tech: ['Python', 'Scikit-learn', 'Streamlit', 'Pandas', 'NumPy', 'Matplotlib'],
                pipeline: [
                    { label: 'User Input', detail: 'Streamlit sliders capture biometric inputs: age, weight, height, duration, heart rate, and body temperature.', tools: ['Streamlit', 'Python'] },
                    { label: 'Feature Prep', detail: 'Inputs normalized and combined with engineered features (BMI, intensity ratio) before being passed to the model.', tools: ['Pandas', 'NumPy'] },
                    { label: 'Regression', detail: 'Linear regression model trained on a real-world exercise + biometric dataset. Achieved R²=0.96 on held-out test data.', tools: ['Scikit-learn', 'NumPy'] },
                    { label: 'Prediction', detail: 'Model outputs estimated calories burned. Confidence interval displayed alongside prediction for transparency.', tools: ['Scikit-learn', 'Python'] },
                    { label: 'Streamlit UI', detail: 'Interactive web app with real-time slider inputs and live prediction updates. Deployed via Streamlit Cloud.', tools: ['Streamlit', 'Matplotlib'] },
                ],
                capabilities: ['Full-Stack'],
                bullets: [
                    'Linear regression trained on real-world exercise + biometric dataset',
                    'Achieved R²=0.96 on held-out test data — strong predictive accuracy',
                    'Interactive Streamlit UI with real-time sliders and live prediction output',
                ],
                links: { github: 'https://github.com/marctony004/calorie-predictor' },
            },
        ],
    },
    {
        id: 'cv',
        label: 'Computer Vision',
        tooltip: 'Real-time vision systems',
        summary: 'Specialized in real-time computer vision using MediaPipe, OpenCV, and TrOCR — from gesture tracking to handwriting recognition.',
        tech: ['OpenCV', 'MediaPipe', 'TrOCR', 'Google ML Kit', 'Python', 'Flutter'],
        capabilities: ['Computer Vision', 'Real-Time'],
        bullets: [
            'Built gesture-to-music mapping using 21-point hand landmark detection in real-time',
            'Integrated TrOCR + ML Kit for multi-modal handwriting → math pipeline',
            'Applied OCR across Java and Flutter apps for automated document parsing',
        ],
    },
    {
        id: 'nlp',
        label: 'NLP + LLMs',
        tooltip: 'GPT-4, Gemini, Vapi, RAG pipelines',
        summary: 'Engineered LLM-powered applications using Azure OpenAI, Gemini, and custom NLP parsers for real production use cases.',
        tech: ['Azure OpenAI GPT-4', 'Gemini LLM', 'Vapi', 'RAG', 'NLP', 'SymPy', 'pgvector'],
        capabilities: ['NLP/LLMs', 'Azure'],
        bullets: [
            'GPT-4 Turbo for step-by-step math explanations from raw handwritten input',
            'Built a custom NLP task parser generating structured tasks from free-form text',
            'Gemini + Vapi voice AI agent with RAG and ADHD-aware coaching (FlowState 1.0)',
            'pgvector semantic similarity search across workspace data in FlowState 2.0',
        ],
    },
    {
        id: 'leadership',
        label: 'Leadership',
        tooltip: '10+ years leading teams & ops',
        summary: '10+ years leading high-performance teams in operations, events, and strategy — at Apple, Zumiez, and in the community.',
        bullets: [
            'Apple Specialist (2025): customer experience, hardware diagnostics, and ecosystem education at Brickell City Centre',
            'Zumiez Sr. Store Manager (2014–2024): multi-location ops, 30+ in-store events, 100+ product lines',
            'Marketing Event Coordinator: partnerships with schools, skate parks, streetwear brands, and youth organizations',
            'Built cross-functional project plans with risk tracking, KPI reporting, and succession planning',
        ],
    },
    {
        id: 'education',
        label: 'Education',
        tooltip: 'B.S. Applied AI + 9 certifications',
        summary: 'Pursuing dual degrees in Applied AI and Business Intelligence at Miami Dade College, backed by 9 industry certifications.',
        bullets: [
            'B.S. Applied Artificial Intelligence — Miami Dade College (2024–2027)',
            'Business Intelligence Specialist & AI Practitioner — Miami Dade College (2025)',
            'A.S. Supply Chain Management — Indian River State College (2016)',
            'Microsoft Azure AI Fundamentals · NVIDIA Deep Learning · NVIDIA RAG/LLMs · NVIDIA Transformers · Google PM · Google AI Essentials · Google Cybersecurity · IBM AI Essentials',
        ],
    },
    {
        id: 'contact',
        label: 'Contact',
        tooltip: 'Open to new opportunities',
        summary: 'Currently open to AI/ML engineering roles, research collaborations, and interesting build opportunities.',
        bullets: [
            'Open to full-time AI/ML and full-stack engineering positions',
            'Available for freelance projects and research collaboration',
            'Based in Miami, FL — open to remote and hybrid',
        ],
        links: {
            email: 'mailto:marc.tonysmith@gmail.com',
            github: 'https://github.com/marctony004',
            linkedin: 'https://www.linkedin.com/in/marc-smith-786685336',
        },
    },
];

export const commandItems = [
    { label: 'Go to: Projects',              action: 'node:projects' },
    { label: 'Go to: Computer Vision',       action: 'node:cv' },
    { label: 'Go to: NLP + LLMs',            action: 'node:nlp' },
    { label: 'Go to: Leadership',            action: 'node:leadership' },
    { label: 'Go to: Education',             action: 'node:education' },
    { label: 'Go to: Contact',               action: 'node:contact' },
    { label: 'Open: AI Math Notes',          action: 'node:ai-math-notes' },
    { label: 'Open: No Strings Attached',    action: 'node:no-strings' },
    { label: 'Open: FlowState 1.0',          action: 'node:flowstate-1' },
    { label: 'Open: FlowState 2.0',          action: 'node:flowstate-2' },
    { label: 'Open: Smart Calendar',         action: 'node:smart-calendar' },
    { label: 'Open: Calories Predictor',     action: 'node:calories' },
    { label: 'Open Resume',                  action: 'resume' },
    { label: 'Copy: GitHub Profile URL',     action: 'copy:github' },
    { label: 'Contact: Send Email',          action: 'contact:email' },
    { label: 'View: Recruiter Mode',         action: 'recruiter' },
];
