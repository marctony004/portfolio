import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SphereNodeData, SphereEdgeData } from '../../data/sphereGraph';

const PREFERS_REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EDGE_STYLE = {
    primary: { color: '#3DE3FF', opacity: 0.15, width: 0.5  },
    child:   { color: '#9AB0CC', opacity: 0.09, width: 0.35 },
    cross:   { color: '#3DE3FF', opacity: 0.07, width: 0.28 },
};

// Pulse duration in seconds
const PULSE_DURATION = 1.3;

interface PulseEdgeProps {
    src:    [number, number, number];
    tgt:    [number, number, number];
    active: boolean;
    color:  string;
}

// A small glowing dot that travels along the edge when active.
function PulseEdge({ src, tgt, active, color }: PulseEdgeProps) {
    const meshRef    = useRef<THREE.Mesh>(null);
    const matRef     = useRef<THREE.MeshBasicMaterial>(null);
    const progressRef = useRef(0);

    useFrame((_, delta) => {
        const mesh = meshRef.current;
        const mat  = matRef.current;
        if (!mesh || !mat) return;

        if (!active || PREFERS_REDUCED) {
            mesh.visible     = false;
            progressRef.current = 0;
            return;
        }

        progressRef.current = (progressRef.current + delta / PULSE_DURATION) % 1;
        const t = progressRef.current;

        // Ease-in-out so the dot accelerates through the middle of the route
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        mesh.position.set(
            src[0] + (tgt[0] - src[0]) * eased,
            src[1] + (tgt[1] - src[1]) * eased,
            src[2] + (tgt[2] - src[2]) * eased,
        );

        // Fade in from source, bright through mid, fade out near target
        mat.opacity  = Math.sin(t * Math.PI) * 0.72;
        mesh.visible = true;
    });

    return (
        <mesh ref={meshRef} visible={false}>
            <sphereGeometry args={[0.022, 6, 6]} />
            <meshBasicMaterial ref={matRef} color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
    );
}

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

                const style    = EDGE_STYLE[edge.type];
                const isActive = selectedId === edge.source || selectedId === edge.target;
                const opacity  = isActive ? style.opacity * 2.8 : style.opacity;
                const width    = isActive ? style.width * 1.8   : style.width;

                return (
                    <group key={`${edge.source}-${edge.target}`}>
                        <Line
                            points={[src, tgt]}
                            color={style.color}
                            lineWidth={width}
                            opacity={opacity}
                            transparent
                        />
                        <PulseEdge src={src} tgt={tgt} active={isActive} color={style.color} />
                    </group>
                );
            })}
        </>
    );
}
