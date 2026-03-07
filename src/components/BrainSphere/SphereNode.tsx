import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import type { Mesh } from 'three';
import type { SphereNodeData } from '../../data/sphereGraph';

const NODE_RADIUS: Record<SphereNodeData['nodeType'], number> = {
    center: 0.18,
    orbit:  0.11,
    child:  0.075,
};

const BASE_COLOR: Record<SphereNodeData['nodeType'], string> = {
    center: '#3DE3FF',
    orbit:  '#3DE3FF',
    child:  '#9AB0CC',
};

interface Props {
    node: SphereNodeData;
    isSelected: boolean;
    isFocused: boolean;     // nearest to screen center (gesture target)
    isDimmed: boolean;      // when another node is selected
    onSelect: (id: string) => void;
    hasDraggedRef: React.MutableRefObject<boolean>;
}

export function SphereNode({ node, isSelected, isFocused, isDimmed, onSelect, hasDraggedRef }: Props) {
    const meshRef  = useRef<Mesh>(null);
    const [hovered, setHovered] = useState(false);

    const r      = NODE_RADIUS[node.nodeType];
    const active = isSelected || hovered || isFocused;
    const color  = BASE_COLOR[node.nodeType];

    const emissiveIntensity = isSelected ? 1.4 : hovered ? 0.9 : isFocused ? 0.7 : 0.35;
    const opacity           = isDimmed ? 0.28 : 1;
    const scale             = isSelected ? 1.45 : hovered ? 1.2 : isFocused ? 1.1 : 1;

    return (
        <group position={node.position}>
            {/* Outer glow sphere */}
            <mesh scale={scale * 2.4} renderOrder={0}>
                <sphereGeometry args={[r, 12, 12]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={active ? (isSelected ? 0.12 : 0.06) : 0.025}
                    depthWrite={false}
                />
            </mesh>

            {/* Core node */}
            <mesh
                ref={meshRef}
                scale={scale}
                onClick={e => {
                    e.stopPropagation();
                    if (!hasDraggedRef.current) onSelect(node.id);
                }}
                onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
            >
                <sphereGeometry args={[r, 20, 20]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={emissiveIntensity}
                    transparent
                    opacity={opacity}
                    roughness={0.2}
                    metalness={0.4}
                />
            </mesh>

            {/* Selected ring */}
            {isSelected && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[r * 2.6, r * 0.15, 8, 48]} />
                    <meshBasicMaterial color={color} transparent opacity={0.45} />
                </mesh>
            )}

            {/* Label */}
            <Html
                position={[0, r * (node.nodeType === 'center' ? 2.2 : 2), 0]}
                center
                distanceFactor={node.nodeType === 'center' ? 8 : 10}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
                <div style={{
                    fontFamily: 'monospace',
                    fontSize: node.nodeType === 'center' ? 13 : 10,
                    fontWeight: node.nodeType === 'center' ? 600 : 400,
                    color: isSelected ? '#3DE3FF' : hovered ? '#E6EEF9' : isDimmed ? 'rgba(154,176,204,0.3)' : '#9AB0CC',
                    background: 'rgba(11,18,32,0.80)',
                    border: `1px solid ${active ? 'rgba(61,227,255,0.3)' : 'rgba(61,227,255,0.1)'}`,
                    borderRadius: 4,
                    padding: node.nodeType === 'center' ? '3px 8px' : '2px 6px',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.04em',
                    transition: 'color 0.2s, border-color 0.2s',
                }}>
                    {node.label}
                </div>
            </Html>
        </group>
    );
}
