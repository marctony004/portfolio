import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SphereNode } from './SphereNode';
import { SphereEdges } from './SphereEdges';
import type { SphereNodeData, SphereEdgeData } from '../../data/sphereGraph';

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
    onSelect:          (id: string) => void;
    camRef:            React.MutableRefObject<CamState>;
    focusedNodeIdRef:  React.MutableRefObject<string | null>;
    hasDraggedRef:     React.MutableRefObject<boolean>;
    idleRotate:        boolean;
}

// Reusable vector for projection math (avoids GC pressure)
const _vec = new THREE.Vector3();

// Star field — computed once outside component
const STAR_POSITIONS = (() => {
    const rng  = mulberry32(42); // deterministic seed
    const pos  = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
        const r  = 18 + rng() * 22;
        const t  = rng() * Math.PI * 2;
        const p  = Math.acos(2 * rng() - 1);
        pos[i*3]   = r * Math.sin(p) * Math.cos(t);
        pos[i*3+1] = r * Math.cos(p);
        pos[i*3+2] = r * Math.sin(p) * Math.sin(t);
    }
    return pos;
})();

function mulberry32(seed: number) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function SphereScene({ nodes, edges, selectedId, onSelect, camRef, focusedNodeIdRef, hasDraggedRef, idleRotate }: Props) {

    const frameRef = useRef(0);

    useFrame(({ camera }) => {
        const s = camRef.current;
        const L = 0.065;

        // Idle slow rotation when no selection
        if (idleRotate) s.targetTheta += 0.00012;

        s.theta    += (s.targetTheta    - s.theta)    * L;
        s.phi      += (s.targetPhi      - s.phi)      * L;
        s.distance += (s.targetDistance - s.distance) * L;

        const sp = Math.sin(s.phi), cp = Math.cos(s.phi);
        const st = Math.sin(s.theta), ct = Math.cos(s.theta);
        camera.position.set(s.distance * sp * ct, s.distance * cp, s.distance * sp * st);
        camera.lookAt(0, 0, 0);

        // Update focused node (closest to screen center) — every 4 frames for perf
        frameRef.current++;
        if (frameRef.current % 4 === 0) {
            let closestId   = null as string | null;
            let closestDist = Infinity;
            for (const node of nodes) {
                _vec.set(...node.position);
                _vec.project(camera as THREE.Camera);
                if (_vec.z >= 1) continue; // behind camera
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
            {/* Lighting */}
            <ambientLight intensity={0.12} color="#9AB0CC" />
            <pointLight position={[0, 0, 0]} intensity={1.2} color="#3DE3FF" distance={7} decay={2} />
            <pointLight position={[5, 5, 5]} intensity={0.3} color="#E6EEF9" distance={15} decay={2} />

            {/* Star field */}
            <points geometry={starGeom}>
                <pointsMaterial color="#9AB0CC" size={0.055} transparent opacity={0.38} sizeAttenuation />
            </points>

            {/* Faint sphere shell — icosahedron wireframe */}
            <mesh>
                <icosahedronGeometry args={[2.5, 3]} />
                <meshBasicMaterial color="#3DE3FF" wireframe transparent opacity={0.028} depthWrite={false} />
            </mesh>
            {/* Second shell — slightly different freq for depth */}
            <mesh>
                <sphereGeometry args={[2.5, 18, 18]} />
                <meshBasicMaterial color="#3DE3FF" wireframe transparent opacity={0.010} depthWrite={false} />
            </mesh>

            {/* Edges */}
            <SphereEdges nodes={nodes} edges={edges} selectedId={selectedId} />

            {/* Nodes */}
            {nodes.map(node => (
                <SphereNode
                    key={node.id}
                    node={node}
                    isSelected={selectedId === node.id}
                    isFocused={focusedNodeIdRef.current === node.id && !selectedId}
                    isDimmed={!!selectedId && selectedId !== node.id && !node.relatedIds.includes(selectedId)}
                    onSelect={onSelect}
                    hasDraggedRef={hasDraggedRef}
                />
            ))}
        </>
    );
}
