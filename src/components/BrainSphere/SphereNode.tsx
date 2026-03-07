import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SphereNodeData } from '../../data/sphereGraph';

const PREFERS_REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    isFocused: boolean;
    isDimmed: boolean;
    onSelect: (id: string) => void;
    hasDraggedRef: React.MutableRefObject<boolean>;
    // Neural activation wave — null means this node is not part of the wave path
    waveDelay?:      number | null;
    waveTimeRef?:    React.MutableRefObject<number>;
    // Continuous path glow — true while this node sits on the active selection path
    isOnActivePath?: boolean;
    // Idle neural activity — timestamp when a background pulse touched this node
    idleGlowAt?:     number | null;
}

export function SphereNode({ node, isSelected, isFocused, isDimmed, onSelect, hasDraggedRef, waveDelay = null, waveTimeRef, isOnActivePath = false, idleGlowAt = null }: Props) {
    // Inner group ref for ambient hum — no position prop on this group so the
    // reconciler never resets our imperatively-set offsets during re-renders.
    const humGroupRef = useRef<THREE.Group>(null);
    const meshRef     = useRef<THREE.Mesh>(null);
    const coreMatRef  = useRef<THREE.MeshStandardMaterial>(null);
    const glowMatRef  = useRef<THREE.MeshBasicMaterial>(null);
    const [hovered, setHovered] = useState(false);

    // Per-node organic drift — random phase, frequency (10–15s), tiny amplitude
    const humRef = useRef({
        t0:   Math.random() * 100,
        freq: 1 / (10 + Math.random() * 5),
        ax:   (Math.random() - 0.5) * 0.020,
        ay:   (Math.random() - 0.5) * 0.020,
        az:   (Math.random() - 0.5) * 0.020,
    });

    const r     = NODE_RADIUS[node.nodeType];
    const color = BASE_COLOR[node.nodeType];

    // Child nodes fade in from 0 on mount; all others start fully visible.
    const appearRef = useRef(node.nodeType === 'child' ? 0 : 1);

    // Mirror reactive values so useFrame always reads fresh state
    const stateRef = useRef({ isSelected, hovered, isFocused, isDimmed, isOnActivePath, idleGlowAt });
    useEffect(() => {
        stateRef.current = { isSelected, hovered, isFocused, isDimmed, isOnActivePath, idleGlowAt };
    });

    useFrame(({ camera }) => {
        const coreM = coreMatRef.current;
        const glowM = glowMatRef.current;
        if (!coreM || !glowM) return;


        // Lerp appearing opacity (child nodes only)
        if (appearRef.current < 1) {
            appearRef.current = Math.min(1, appearRef.current + 0.035);
        }
        const af = appearRef.current;

        const { isSelected, hovered, isFocused, isDimmed, isOnActivePath, idleGlowAt } = stateRef.current;

        // Ambient hum — tiny organic drift on inner group; outer group position
        // is managed by JSX prop, inner group has no position prop so reconciler
        // never interferes with our imperatively-set offsets.
        if (humGroupRef.current && node.nodeType !== 'center' && !PREFERS_REDUCED) {
            const h = humRef.current;
            const t = performance.now() * 0.001 + h.t0;
            humGroupRef.current.position.set(
                Math.sin(t * h.freq * Math.PI * 2)          * h.ax,
                Math.cos(t * h.freq * Math.PI * 2 * 0.73)   * h.ay,
                Math.sin(t * h.freq * Math.PI * 2 * 0.51 + 1.2) * h.az,
            );
        }
        const act = isSelected || hovered || isFocused;

        // Depth factor: nodes facing camera are brighter; back-hemisphere nodes are dimmer.
        // Center node stays full brightness (sits at origin).
        let df = 1.0;
        if (node.nodeType !== 'center') {
            const [nx, ny, nz] = node.position;
            const cp    = camera.position;
            const cpLen = Math.sqrt(cp.x * cp.x + cp.y * cp.y + cp.z * cp.z) || 1;
            const nLen  = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            const dot   = (cp.x / cpLen * nx / nLen) + (cp.y / cpLen * ny / nLen) + (cp.z / cpLen * nz / nLen);
            const depth = 0.5 + dot * 0.5;
            df = 0.38 + depth * 0.62;
        }

        coreM.opacity           = (isDimmed ? 0.22 : 1.0) * df * af;
        coreM.emissiveIntensity = (isSelected ? 1.4 : hovered ? 0.9 : isFocused ? 0.7 : 0.35) * (0.5 + df * 0.5);

        const glowBase = act ? (isSelected ? 0.12 : 0.06) : 0.02;
        glowM.opacity  = glowBase * df * af;

        // Active path glow — intermediate nodes on the selected path stay slightly brighter
        if (isOnActivePath && !isSelected && !act) {
            coreM.emissiveIntensity = Math.min(2.0, coreM.emissiveIntensity + 0.28);
            glowM.opacity           = Math.min(0.14, glowM.opacity + 0.04);
        }

        // Idle neural glow — very faint flash when a background pulse touches this node
        if (idleGlowAt != null) {
            const elapsed = performance.now() - idleGlowAt;
            if (elapsed < 600) {
                const wave = Math.sin((elapsed / 600) * Math.PI) * 0.10;
                coreM.emissiveIntensity = Math.min(2.0, coreM.emissiveIntensity + wave);
                glowM.opacity           = Math.min(0.05, glowM.opacity + wave * 0.08);
            }
        }

        // Neural activation wave — bell curve contribution (0→peak→0)
        if (waveDelay != null && waveTimeRef?.current) {
            const elapsed     = performance.now() - waveTimeRef.current;
            const nodeElapsed = Math.max(0, elapsed - waveDelay);
            const t           = Math.min(1, nodeElapsed / 700);
            if (t > 0 && t < 1) {
                const wave = Math.sin(t * Math.PI);
                coreM.emissiveIntensity = Math.min(2.0, coreM.emissiveIntensity + wave * 0.22);
                glowM.opacity           = Math.min(0.18, glowM.opacity + wave * 0.045);
            }
        }
    });

    const scale  = isSelected ? 1.45 : hovered ? 1.2 : isFocused ? 1.1 : 1;
    const active = isSelected || hovered || isFocused;

    return (
        <group position={node.position}>
        {/* Inner group has NO position prop — reconciler won't reset hum offsets */}
        <group ref={humGroupRef}>
            {/* Outer glow halo */}
            <mesh scale={scale * 2.4} renderOrder={0}>
                <sphereGeometry args={[r, 12, 12]} />
                <meshBasicMaterial
                    ref={glowMatRef}
                    color={color}
                    transparent
                    opacity={active ? (isSelected ? 0.12 : 0.06) : 0.02}
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
                    ref={coreMatRef}
                    color={color}
                    emissive={color}
                    emissiveIntensity={isSelected ? 1.4 : hovered ? 0.9 : isFocused ? 0.7 : 0.35}
                    transparent
                    opacity={isDimmed ? 0.22 : 1.0}
                    roughness={0.2}
                    metalness={0.4}
                />
            </mesh>

            {/* Selection ring */}
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
                    color: isSelected ? '#3DE3FF' : hovered ? '#E6EEF9' : isDimmed ? 'rgba(154,176,204,0.22)' : '#9AB0CC',
                    background: 'rgba(11,18,32,0.82)',
                    border: `1px solid ${active ? 'rgba(61,227,255,0.28)' : 'rgba(61,227,255,0.07)'}`,
                    borderRadius: 4,
                    padding: node.nodeType === 'center' ? '3px 8px' : '2px 6px',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.04em',
                    transition: 'color 0.2s, border-color 0.2s, opacity 0.2s',
                    opacity: isDimmed ? 0.45 : 1,
                }}>
                    {node.label}
                </div>
            </Html>
        </group>
        </group>
    );
}
