import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { SphereNodeData, SphereEdgeData } from '../../data/sphereGraph';

const PREFERS_REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EDGE_STYLE = {
    primary: { color: '#3DE3FF', opacity: 0.15, width: 0.5  },
    child:   { color: '#9AB0CC', opacity: 0.09, width: 0.35 },
    cross:   { color: '#3DE3FF', opacity: 0.07, width: 0.28 },
};

const PULSE_PERIOD = 2.8; // seconds per full pulse cycle

function PulseLine({ src, tgt, width }: {
    src:   [number, number, number];
    tgt:   [number, number, number];
    width: number;
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineRef  = useRef<any>(null);
    const phaseRef = useRef(0);

    useFrame((_, delta) => {
        if (!lineRef.current?.material) return;
        phaseRef.current = (phaseRef.current + delta / PULSE_PERIOD) % 1;
        // 0.2 → 1.0 → 0.2 smooth sine — whole line breathes together
        lineRef.current.material.opacity = 0.20 + 0.80 * Math.sin(phaseRef.current * Math.PI);
    });

    return (
        <Line
            ref={lineRef}
            points={[src, tgt]}
            color="#3DE3FF"
            lineWidth={width}
            opacity={0.35}
            transparent
        />
    );
}

export interface ActiveEdge {
    src: [number, number, number];
    tgt: [number, number, number];
    key: string;
}

interface Props {
    nodes:           SphereNodeData[];
    edges:           SphereEdgeData[];
    selectedId:      string | null;
    activePathKeys?: Set<string>;
    activeEdges?:    ActiveEdge[];
}

export function SphereEdges({ nodes, edges, selectedId, activePathKeys, activeEdges }: Props) {
    const nodeMap = useMemo(() => {
        const m = new Map<string, [number, number, number]>();
        nodes.forEach(n => m.set(n.id, n.position));
        return m;
    }, [nodes]);

    return (
        <>
            {/* Static edges — skip path edges here; they're rendered as PulseLine below */}
            {edges.map(edge => {
                const src = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!src || !tgt) return null;

                const style      = EDGE_STYLE[edge.type];
                const isSelected = selectedId === edge.source || selectedId === edge.target;
                const isPath     = activePathKeys?.has(`${edge.source}|${edge.target}`)
                                || activePathKeys?.has(`${edge.target}|${edge.source}`);

                // Path edges are rendered by PulseLine — skip here to avoid doubling
                if (isPath) return null;

                const opacity = isSelected ? style.opacity * 2.4 : style.opacity;
                const width   = isSelected ? style.width   * 1.6 : style.width;

                return (
                    <Line
                        key={`${edge.source}-${edge.target}`}
                        points={[src, tgt]}
                        color={style.color}
                        lineWidth={width}
                        opacity={opacity}
                        transparent
                    />
                );
            })}

            {/* Pulsating path edges — each mounts in sync (phase = 0) so they throb as one wire */}
            {!PREFERS_REDUCED && activeEdges?.map(e => (
                <PulseLine key={e.key} src={e.src} tgt={e.tgt} width={1.6} />
            ))}
        </>
    );
}
