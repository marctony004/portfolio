export interface TourStep {
    id: string;
    title: string;
    targetNodeId: string | null; // null = center node (deselect all)
    caption: string;
    subline?: string;
    sublineMobile?: string; // overrides subline on mobile
    duration: number; // ms
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'identity',
        title: 'Marc Smith',
        targetNodeId: null,
        caption: 'At the center is Marc Smith. These connections highlight my 10 years of leadership experience, education in applied artificial intelligence, and the AI systems I design.',
        duration: 8000,
    },
    {
        id: 'projects',
        title: 'Projects',
        targetNodeId: 'projects',
        caption: 'My AI systems live here. Selecting a project reveals how the system works.',
        duration: 6000,
    },
    {
        id: 'flowstate',
        title: 'FlowState 2.0',
        targetNodeId: 'flowstate-2',
        caption: 'Projects open interactive pipelines that show how each system processes information from input to output.',
        duration: 7000,
    },
    {
        id: 'brain-sphere',
        title: 'Brain Sphere',
        targetNodeId: null,
        caption: 'For deeper exploration, the Brain Sphere reveals system architecture and the relationships between technologies.',
        subline: '↑ Open via the Brain Sphere button in the top left.',
        sublineMobile: '↓ Tap Brain Sphere in the More menu below.',
        duration: 6000,
    },
    {
        id: 'focus-mode',
        title: 'Focus Mode',
        targetNodeId: null,
        caption: 'Selecting a system activates Focus Mode, where you can explore architecture, components, and technology stacks.',
        subline: 'Available inside the Brain Sphere when a project node is selected.',
        duration: 6000,
    },
    {
        id: 'assistant',
        title: 'AI Assistant',
        targetNodeId: null,
        caption: 'You can also ask the AI assistant about any project, system, or technology in the portfolio.',
        subline: '↗ Available via the assistant button on the right side of the screen.',
        duration: 6000,
    },
    {
        id: 'recruiter',
        title: 'Recruiter View',
        targetNodeId: null,
        caption: 'Recruiter View provides a simplified overview of my experience, projects, and technical skills. You can also find my full resume there.',
        subline: '↑ Open via the Recruiter View button in the top left.',
        sublineMobile: '↓ Tap RESUME in the tab bar below.',
        duration: 6000,
    },
    {
        id: 'contact',
        title: 'Contact',
        targetNodeId: 'contact',
        caption: 'You can connect with me through LinkedIn, explore my projects on GitHub, send an email, or leave a message here.',
        duration: 7000,
    },
];
