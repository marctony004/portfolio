import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { SphereNodeData, SphereEdgeData } from '../../data/sphereGraph';

const EDGE_STYLE = {
    primary: { color: '#3DE3FF', opacity: 0.18, width: 0.6 },
    child:   { color: '#9AB0CC', opacity: 0.11, width: 0.4 },
    cross:   { color: '#3DE3FF', opacity: 0.09, width: 0.3 },
};

interface Props {
    nodes:      SphereNodeData[];
    edges:      SphereEdgeData[];
    selectedId: string | null;
}

export function SphereEdges({ nodes, edges, selectedId }: Props) {
    const nodeMap = useMemo(() => {
        const m = new Map<string, [number, number, number]>();
        nodes.forEach(n => m.set(n.id, n.position));
        return m;
    }, [nodes]);

    return (
        <>
            {edges.map(edge => {
                const src = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!src || !tgt) return null;

                const style   = EDGE_STYLE[edge.type];
                const isActive = selectedId === edge.source || selectedId === edge.target;
                const opacity  = isActive ? style.opacity * 3 : style.opacity;
                const width    = isActive ? style.width * 2   : style.width;

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
        </>
    );
}
