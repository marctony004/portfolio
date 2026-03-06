// Structured portfolio context for the AI assistant.
// Future-friendly: this object can be serialized as system context for an LLM API.

export const SUGGESTED_PROMPTS = [
    "What projects has Marc built?",
    "What is Marc currently working on?",
    "Tell me about FlowState 2.0",
    "What computer vision work has he done?",
    "What's Marc's leadership background?",
];

// Summary strings used by the engine — kept here so swapping to an API later
// only requires passing ASSISTANT_PROFILE as a system prompt.
export const ASSISTANT_PROFILE = {
    name: 'Marc Smith',
    title: 'AI/ML Engineer · Full-Stack Developer',
    location: 'Miami, FL',
    email: 'marc.tonysmith@gmail.com',
    github: 'github.com/marctony004',
    linkedin: 'linkedin.com/in/marc-smith-786685336',
    openTo: 'Full-time AI/ML and full-stack engineering roles — remote, hybrid, or in-person',
    summary: `Marc Smith is an AI/ML engineer and full-stack developer based in Miami, FL. He's pursuing a B.S. in Applied Artificial Intelligence at Miami Dade College while building real-world AI tools across computer vision, NLP/LLMs, and full-stack systems. Before transitioning into AI, he spent over a decade in leadership and operations at Apple and Zumiez. He brings technical depth and a product-minded approach to everything he builds.`,
    currentFocus: 'Building FlowState 2.0 — a full-stack voice AI workspace for musicians and producers.',
    vision: `Marc focuses on building AI tools that solve real problems — not demos, but production-quality systems. He's drawn to the intersection of AI and human attention, creative tools for artists and musicians, and making intelligent systems accessible. He's actively seeking AI/ML engineering roles where he can apply his full-stack and AI background to meaningful products.`,
};
