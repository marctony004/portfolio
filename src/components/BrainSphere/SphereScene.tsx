import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SphereNode } from './SphereNode';
import { SphereEdges, type ActiveEdge } from './SphereEdges';
import type { SphereNodeData, SphereEdgeData } from '../../data/sphereGraph';

const WAVE_TRAVEL_MS = 420;

// BFS shortest path between two nodes (undirected graph)
function findPath(fromId: string, toId: string, edges: SphereEdgeData[]): string[] | null {
    if (fromId === toId) return null;
    const adj = new Map<string, string[]>();
    for (const e of edges) {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source)!.push(e.target);
        adj.get(e.target)!.push(e.source);
    }
    const visited = new Set([fromId]);
    const queue: string[][] = [[fromId]];
    while (queue.length > 0) {
        const path = queue.shift()!;
        for (const nb of adj.get(path[path.length - 1]) ?? []) {
            if (!visited.has(nb)) {
                const next = [...path, nb];
                if (nb === toId) return next;
                visited.add(nb);
                queue.push(next);
            }
        }
    }
    return null;
}

// Faint traveling orb for background neural activity
function IdleNeuralPulse({ from, to, startTime, duration, onComplete }: {
    from:       [number, number, number];
    to:         [number, number, number];
    startTime:  number;
    duration:   number;
    onComplete: () => void;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef  = useRef<THREE.MeshBasicMaterial>(null);
    const doneRef = useRef(false);

    useFrame(() => {
        if (!meshRef.current || !matRef.current || doneRef.current) return;
        const elapsed = performance.now() - startTime;
        if (elapsed >= duration) {
            matRef.current.opacity = 0;
            doneRef.current = true;
            onComplete();
            return;
        }
        const t    = elapsed / duration;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        meshRef.current.position.set(
            from[0] + (to[0] - from[0]) * ease,
            from[1] + (to[1] - from[1]) * ease,
            from[2] + (to[2] - from[2]) * ease,
        );
        matRef.current.opacity = Math.sin(t * Math.PI) * 0.14;
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshBasicMaterial ref={matRef} color="#3DE3FF" transparent opacity={0} depthWrite={false} />
        </mesh>
    );
}

export interface IdlePulseData {
    from:      [number, number, number];
    to:        [number, number, number];
    startTime: number;
    duration:  number;
    key:       string;
}

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
    waveTimeRef?:          React.MutableRefObject<number>;
    waveActive?:           boolean;
    waveDelays?:           Map<string, number>;
    idlePulse?:            IdlePulseData | null;
    idleGlowTimes?:        Map<string, number>;
    onIdlePulseComplete?:  () => void;
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

// Precompute icosahedron wireframe edges once — sparks travel along these lines
const GLOBE_EDGE_PAIRS: [[number,number,number],[number,number,number]][] = (() => {
    const base = new THREE.IcosahedronGeometry(2.5, 3);
    const eg   = new THREE.EdgesGeometry(base);
    const pos  = eg.attributes.position;
    const out: [[number,number,number],[number,number,number]][] = [];
    for (let i = 0; i < pos.count; i += 2) {
        out.push([
            [pos.getX(i),   pos.getY(i),   pos.getZ(i)  ],
            [pos.getX(i+1), pos.getY(i+1), pos.getZ(i+1)],
        ]);
    }
    base.dispose();
    eg.dispose();
    return out;
})();

// Pool size — sparks reuse these mesh slots; no React state or re-renders needed
const BUZZ_POOL = 5;

interface BuzzSlot {
    from: [number,number,number];
    to:   [number,number,number];
    start:    number;
    duration: number;
}

function GlobeElectricBuzz() {
    const meshes  = useRef<(THREE.Mesh | null)[]>(Array(BUZZ_POOL).fill(null));
    const mats    = useRef<(THREE.MeshBasicMaterial | null)[]>(Array(BUZZ_POOL).fill(null));
    const slots   = useRef<(BuzzSlot | null)[]>(Array(BUZZ_POOL).fill(null));
    const nextFire = useRef(performance.now() + 800 + Math.random() * 1800);
    const slotIdx  = useRef(0);

    useFrame(() => {
        if (PREFERS_REDUCED) return;
        const now = performance.now();

        // Update every active slot imperatively — no setState, no re-renders
        for (let i = 0; i < BUZZ_POOL; i++) {
            const slot = slots.current[i];
            const mesh = meshes.current[i];
            const mat  = mats.current[i];
            if (!mesh || !mat) continue;
            if (!slot) { mat.opacity = 0; continue; }

            const elapsed = now - slot.start;
            if (elapsed < 0) { mat.opacity = 0; continue; }

            const t = Math.min(1, elapsed / slot.duration);
            if (t >= 1) { mat.opacity = 0; slots.current[i] = null; continue; }

            const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2;
            const [ax, ay, az] = slot.from;
            const [bx, by, bz] = slot.to;
            mesh.position.set(ax + (bx-ax)*ease, ay + (by-ay)*ease, az + (bz-az)*ease);

            // Sharp electric flash: fast spike (0→10%), plateau (10→25%), smooth decay
            const flash = t < 0.10 ? t / 0.10
                        : t < 0.25 ? 1.0
                        : Math.pow(1 - (t - 0.25) / 0.75, 1.8);
            mat.opacity = flash * 0.22;
        }

        // Spawn burst when timer fires
        if (now < nextFire.current) return;
        nextFire.current = now + 2200 + Math.random() * 3000;

        // 25% chance: double burst on two different edges in quick succession
        const burstCount = Math.random() < 0.25 ? 2 : 1;
        for (let b = 0; b < burstCount; b++) {
            const si   = slotIdx.current++ % BUZZ_POOL;
            const edge = GLOBE_EDGE_PAIRS[Math.floor(Math.random() * GLOBE_EDGE_PAIRS.length)];
            slots.current[si] = {
                from:     edge[0],
                to:       edge[1],
                start:    now + b * 90,
                duration: 200 + Math.random() * 300,
            };
        }
    });

    return (
        <>
            {Array.from({ length: BUZZ_POOL }, (_, i) => (
                <mesh key={i} ref={(el: THREE.Mesh | null) => { meshes.current[i] = el; }}>
                    <sphereGeometry args={[0.020, 6, 6]} />
                    <meshBasicMaterial
                        ref={(el: THREE.MeshBasicMaterial | null) => { mats.current[i] = el; }}
                        color="#7EEDFF"
                        transparent
                        opacity={0}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </>
    );
}

export function SphereScene({ nodes, edges, selectedId, expandedId, onSelect, camRef, focusedNodeIdRef, hasDraggedRef, idleRotate, waveTimeRef, waveActive, waveDelays, idlePulse, idleGlowTimes, onIdlePulseComplete }: Props) {
    const frameRef = useRef(0);

    // Visible nodes: progressive disclosure model.
    //   Base layer:   center + orbit nodes — always visible.
    //   Contextual:   capability nodes appear only when a related node is selected.
    //   Constellation: project/tool children appear when their parent is expanded.
    const visibleNodes = useMemo((): SphereNodeData[] => {
        // Always-visible top-level: center + orbit (non-capability, no parentId)
        const base = nodes.filter(n => !n.parentId && n.nodeType !== 'capability');

        // Capability nodes are revealed contextually — when the selected node is in their relatedIds,
        // or when the capability itself is the selected node.
        const contextualCaps = selectedId
            ? nodes.filter(n =>
                n.nodeType === 'capability' &&
                (n.id === selectedId || n.relatedIds.includes(selectedId))
              )
            : [];

        // Overview mode: center node selected — spread all projects at their pre-placed
        // overviewPositions across the sphere (bypasses constellation clustering).
        if (selectedId === 'marc-smith') {
            const overviewProjects = nodes
                .filter(n => n.nodeType === 'project' && n.overviewPosition)
                .map(n => ({ ...n, position: n.overviewPosition! }));
            const allCaps = nodes.filter(n => n.nodeType === 'capability');
            return [...base, ...overviewProjects, ...allCaps];
        }

        const topLevel = [...base, ...contextualCaps];
        if (!expandedId) return topLevel;

        const parent = nodes.find(n => n.id === expandedId);
        if (!parent) return topLevel;

        const children = nodes.filter(n => n.parentId === expandedId);
        const cPositions = constellationPositions(parent.position, children.length);

        return [
            ...topLevel,
            ...children.map((child, i) => ({ ...child, position: cPositions[i] })),
        ];
    }, [nodes, expandedId, selectedId]);

    // Position lookup for visible nodes — used by activePath
    const visiblePosMap = useMemo(() => {
        const m = new Map<string, [number, number, number]>();
        visibleNodes.forEach(n => m.set(n.id, n.position));
        return m;
    }, [visibleNodes]);

    // BFS path from center → selectedId; drives EdgeBuzz overlays and path node glow
    const { activePath, activePathNodeIds } = useMemo(() => {
        const empty = { activePath: { keys: new Set<string>(), edges: [] as ActiveEdge[] }, activePathNodeIds: new Set<string>() };
        if (!selectedId || selectedId === 'marc-smith') return empty;
        const path = findPath('marc-smith', selectedId, edges);
        if (!path || path.length < 2) return empty;
        const numEdges = path.length - 1;
        const keys     = new Set<string>();
        const edgeList: ActiveEdge[] = [];
        const nodeIds  = new Set(path);
        for (let i = 0; i < numEdges; i++) {
            const fromPos = visiblePosMap.get(path[i]);
            const toPos   = visiblePosMap.get(path[i + 1]);
            keys.add(`${path[i]}|${path[i + 1]}`);
            keys.add(`${path[i + 1]}|${path[i]}`);
            if (fromPos && toPos) {
                edgeList.push({ src: fromPos, tgt: toPos, key: `buzz-${path[i]}-${path[i + 1]}` });
            }
        }
        return { activePath: { keys, edges: edgeList }, activePathNodeIds: nodeIds };
    }, [selectedId, edges, visiblePosMap]);

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
            {/* Atmospheric depth field — camera is inside this sphere (dist 6.5 < radius 9).
                BackSide renders the inner face, creating a dark atmospheric shell behind the
                nodes but in front of the far star field. Dims distant elements for spatial depth. */}
            <mesh>
                <sphereGeometry args={[9, 12, 12]} />
                <meshBasicMaterial color="#070d1a" transparent opacity={0.26} side={THREE.BackSide} depthWrite={false} />
            </mesh>

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

            {/* Electric buzz — faint sparks that travel along the icosahedron wireframe */}
            <GlobeElectricBuzz />

            {/* Edges — nodeMap built from visibleNodes so hidden children auto-drop */}
            <SphereEdges nodes={visibleNodes} edges={edges} selectedId={selectedId} activePathKeys={activePath.keys} activeEdges={activePath.edges} />

            {/* Nodes */}
            {visibleNodes.map(node => {
                    // Dim logic — two triggers:
                    // 1. A specific node is selected → dim everything not directly related to it.
                    //    Bidirectional: a node stays bright if it lists the selected node OR
                    //    if the selected node lists it (covers project → capability edges).
                    // 2. A constellation is expanded but no child selected (e.g. 'projects' orbit) →
                    //    dim everything outside that parent's cluster.
                    const dimmed = (() => {
                        if (node.nodeType === 'center') return false;
                        if (selectedId === 'marc-smith') return false; // overview — nothing dims

                        if (selectedId) {
                            const selNode = nodes.find(n => n.id === selectedId);
                            return selectedId !== node.id
                                && !node.relatedIds.includes(selectedId)
                                && !selNode?.relatedIds.includes(node.id)
                                && !activePathNodeIds.has(node.id);
                        }

                        if (expandedId) {
                            return node.id !== expandedId          // the expanded parent stays bright
                                && node.parentId !== expandedId;   // its children stay bright
                        }

                        return false;
                    })();

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
                            isOnActivePath={activePathNodeIds.has(node.id)}
                            idleGlowAt={idleGlowTimes?.get(node.id) ?? null}
                        />
                    );
            })}

            {/* Idle neural pulse — single faint orb traveling a random edge, all state managed outside Canvas */}
            {idlePulse && (
                <IdleNeuralPulse
                    key={idlePulse.key}
                    from={idlePulse.from}
                    to={idlePulse.to}
                    startTime={idlePulse.startTime}
                    duration={idlePulse.duration}
                    onComplete={onIdlePulseComplete ?? (() => {})}
                />
            )}

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
