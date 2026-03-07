import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WAVE_TRAVEL_MS = 420;

function WaveEdgePulse({
    from, to, startDelay, waveTimeRef,
}: {
    from: [number,number,number];
    to:   [number,number,number];
    startDelay: number;
    waveTimeRef: React.MutableRefObject<number>;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef  = useRef<THREE.MeshBasicMaterial>(null);
    useFrame(() => {
        if (!meshRef.current || !matRef.current || !waveTimeRef.current) return;
        const elapsed = performance.now() - waveTimeRef.current;
        if (elapsed < startDelay) { matRef.current.opacity = 0; return; }
        const raw  = (elapsed - startDelay) / WAVE_TRAVEL_MS;
        const t    = Math.min(1, Math.max(0, raw));
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        meshRef.current.position.set(
            from[0] + (to[0] - from[0]) * ease,
            from[1] + (to[1] - from[1]) * ease,
            from[2] + (to[2] - from[2]) * ease,
        );
        matRef.current.opacity = Math.sin(t * Math.PI) * 0.28;
    });
    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[0.020, 8, 8]} />
            <meshBasicMaterial ref={matRef} color="#3DE3FF" transparent opacity={0} depthWrite={false} />
        </mesh>
    );
}
import { SphereNode } from './SphereNode';
import { SphereEdges } from './SphereEdges';
import type { SphereNodeData, SphereEdgeData } from '../../data/sphereGraph';

const PREFERS_REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Radius of the constellation ring around an expanded parent node
const CONSTELLATION_R = 0.95;

// Place `count` nodes evenly in a flat ring in the plane perpendicular to the
// parent's radial direction (so the ring faces the sphere center).
function constellationPositions(
    parentPos: [number, number, number],
    count: number,
): [number, number, number][] {
    if (count === 0) return [];
    const [px, py, pz] = parentPos;
    const pLen = Math.sqrt(px * px + py * py + pz * pz) || 1;
    const ux = px / pLen, uy = py / pLen, uz = pz / pLen;

    // Build perpendicular basis
    const useAlt = Math.abs(uy) >= 0.85;
    const ax = useAlt ? 1 : 0, ay = 0, az = useAlt ? 0 : 1;
    const d = ux * ax + uy * ay + uz * az;
    let vx = ax - d * ux, vy = ay - d * uy, vz = az - d * uz;
    const vl = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
    vx /= vl; vy /= vl; vz /= vl;
    const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx;

    return Array.from({ length: count }, (_, i) => {
        const a = (2 * Math.PI * i) / count;
        const ca = Math.cos(a), sa = Math.sin(a);
        return [
            px + (vx * ca + wx * sa) * CONSTELLATION_R,
            py + (vy * ca + wy * sa) * CONSTELLATION_R,
            pz + (vz * ca + wz * sa) * CONSTELLATION_R,
        ] as [number, number, number];
    });
}

function GlobeShell({ active: _ }: { active: boolean }) {
    return (
        <>
            <mesh>
                <icosahedronGeometry args={[2.5, 3]} />
                <meshBasicMaterial color="#3DE3FF" wireframe transparent opacity={0.028} depthWrite={false} />
            </mesh>
            <mesh>
                <sphereGeometry args={[2.5, 18, 18]} />
                <meshBasicMaterial color="#3DE3FF" wireframe transparent opacity={0.010} depthWrite={false} />
            </mesh>
        </>
    );
}

export interface CamState {
    theta:          number;
    phi:            number;
    distance:       number;
    targetTheta:    number;
    targetPhi:      number;
    targetDistance: number;
}

interface Props {
    nodes:             SphereNodeData[];
    edges:             SphereEdgeData[];
    selectedId:        string | null;
    expandedId:        string | null;
    onSelect:          (id: string) => void;
    camRef:            React.MutableRefObject<CamState>;
    focusedNodeIdRef:  React.MutableRefObject<string | null>;
    hasDraggedRef:     React.MutableRefObject<boolean>;
    idleRotate:        boolean;
    waveTimeRef?:      React.MutableRefObject<number>;
    waveActive?:       boolean;
    waveDelays?:       Map<string, number>;
}

// Reusable vector (avoids GC pressure in useFrame)
const _vec = new THREE.Vector3();

// Star field — computed once
const STAR_POSITIONS = (() => {
    const rng = mulberry32(42);
    const pos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
        const r = 18 + rng() * 22;
        const t = rng() * Math.PI * 2;
        const p = Math.acos(2 * rng() - 1);
        pos[i*3]   = r * Math.sin(p) * Math.cos(t);
        pos[i*3+1] = r * Math.cos(p);
        pos[i*3+2] = r * Math.sin(p) * Math.sin(t);
    }
    return pos;
})();

function mulberry32(seed: number) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function SphereScene({ nodes, edges, selectedId, expandedId, onSelect, camRef, focusedNodeIdRef, hasDraggedRef, idleRotate, waveTimeRef, waveActive, waveDelays }: Props) {
    const frameRef = useRef(0);

    // Visible nodes: top-level only, plus constellation children when a parent is expanded.
    // Children get dynamically computed positions so they cluster around their parent.
    const visibleNodes = useMemo((): SphereNodeData[] => {
        const topLevel = nodes.filter(n => !n.parentId);
        if (!expandedId) return topLevel;

        const parent = nodes.find(n => n.id === expandedId);
        if (!parent) return topLevel;

        const children = nodes.filter(n => n.parentId === expandedId);
        const cPositions = constellationPositions(parent.position, children.length);

        return [
            ...topLevel,
            ...children.map((child, i) => ({ ...child, position: cPositions[i] })),
        ];
    }, [nodes, expandedId]);

    useFrame(({ camera }) => {
        const s = camRef.current;
        const L = 0.065;

        if (idleRotate && !PREFERS_REDUCED) s.targetTheta += 0.00012;

        s.theta    += (s.targetTheta    - s.theta)    * L;
        s.phi      += (s.targetPhi      - s.phi)      * L;
        s.distance += (s.targetDistance - s.distance) * L;

        const sp = Math.sin(s.phi), cp = Math.cos(s.phi);
        const st = Math.sin(s.theta), ct = Math.cos(s.theta);
        camera.position.set(s.distance * sp * ct, s.distance * cp, s.distance * sp * st);
        camera.lookAt(0, 0, 0);

        // Update focused node (nearest to screen center) — every 4 frames
        frameRef.current++;
        if (frameRef.current % 4 === 0) {
            let closestId   = null as string | null;
            let closestDist = Infinity;
            for (const node of visibleNodes) {
                _vec.set(...node.position);
                _vec.project(camera as THREE.Camera);
                if (_vec.z >= 1) continue;
                const d = _vec.x * _vec.x + _vec.y * _vec.y;
                if (d < closestDist) { closestDist = d; closestId = node.id; }
            }
            focusedNodeIdRef.current = closestId;
        }
    });

    const starGeom = useMemo(() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(STAR_POSITIONS, 3));
        return g;
    }, []);

    return (
        <>
            {/* Lighting — soft and cinematic */}
            <ambientLight intensity={0.16} color="#9AB0CC" />
            <pointLight position={[3, 5, 4]}    intensity={0.32} color="#E6EEF9" distance={20} decay={2} />
            <pointLight position={[0, 0, 0]}    intensity={0.70} color="#3DE3FF" distance={6}  decay={2} />
            <pointLight position={[-3, -3, -3]} intensity={0.10} color="#3DE3FF" distance={14} decay={2} />

            {/* Star field */}
            <points geometry={starGeom}>
                <pointsMaterial color="#9AB0CC" size={0.052} transparent opacity={0.30} sizeAttenuation />
            </points>

            {/* Globe shell */}
            <GlobeShell active={!!selectedId} />

            {/* Edges — nodeMap built from visibleNodes so hidden children auto-drop */}
            <SphereEdges nodes={visibleNodes} edges={edges} selectedId={selectedId} />

            {/* Nodes */}
            {(() => {
                // Precompute selected node's parentId once so the map below is O(n)
                const selParentId = selectedId
                    ? visibleNodes.find(n => n.id === selectedId)?.parentId
                    : undefined;

                return visibleNodes.map(node => {
                    const dimmed =
                        !!selectedId
                        && selectedId !== node.id
                        && node.nodeType !== 'center'            // center is never dimmed
                        && !node.relatedIds.includes(selectedId)  // directly related → keep bright
                        && !(selParentId && node.parentId === selParentId); // constellation siblings stay bright

                    return (
                        <SphereNode
                            key={node.id}
                            node={node}
                            isSelected={selectedId === node.id}
                            isFocused={focusedNodeIdRef.current === node.id && !selectedId}
                            isDimmed={dimmed}
                            onSelect={onSelect}
                            hasDraggedRef={hasDraggedRef}
                            waveDelay={waveDelays?.get(node.id) ?? null}
                            waveTimeRef={waveTimeRef}
                        />
                    );
                });
            })()}

            {/* Wave edge pulses — one orb per primary spoke, travels from center outward */}
            {waveActive && waveTimeRef && waveDelays && visibleNodes
                .filter(n => n.nodeType === 'orbit')
                .map(n => {
                    const delay = waveDelays.get(n.id);
                    if (delay == null) return null;
                    const center = nodes.find(c => c.nodeType === 'center');
                    if (!center) return null;
                    return (
                        <WaveEdgePulse
                            key={`wave-${n.id}`}
                            from={center.position}
                            to={n.position}
                            startDelay={delay - WAVE_TRAVEL_MS}
                            waveTimeRef={waveTimeRef}
                        />
                    );
                })
            }
        </>
    );
}
