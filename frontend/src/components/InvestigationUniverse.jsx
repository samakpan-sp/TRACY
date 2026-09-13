import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const CATEGORIES = [
  { label: 'Website / URL' },
  { label: 'Phone Number' },
  { label: 'Business Ad' },
  { label: 'Video' },
  { label: 'Social Profile' },
  { label: 'Screenshot' },
];

const TRUST_COLOR = new THREE.Color('#2DD4BF');
const RISK_COLOR = new THREE.Color('#F5A623');

function CoreNode() {
  const meshRef = useRef();
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
      meshRef.current.rotation.x += delta * 0.05;
    }
  });
  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[0.9, 1]} />
      <meshStandardMaterial color="#0E1116" emissive="#2DD4BF" emissiveIntensity={0.6} wireframe />
    </mesh>
  );
}

function ConnectionLine({ start, end, phase, reducedMotion }) {
  const lineRef = useRef();
  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ]);
  }, [start, end]);

  useFrame((state) => {
    if (!lineRef.current) return;
    const t = reducedMotion ? 0 : (Math.sin(state.clock.elapsedTime * 0.6 + phase) + 1) / 2;
    const flare = t > 0.8 ? 1 : 0;
    const color = new THREE.Color().lerpColors(TRUST_COLOR, RISK_COLOR, flare);
    lineRef.current.material.color = color;
    lineRef.current.material.opacity = 0.35 + t * 0.35;
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial transparent opacity={0.4} color="#2DD4BF" />
    </line>
  );
}

function CategoryNode({ position, label, index, reducedMotion }) {
  const groupRef = useRef();
  useFrame((state) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.12;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#E7E9EC" emissive="#2DD4BF" emissiveIntensity={0.4} />
      </mesh>
      <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '13px',
            color: '#E7E9EC',
            background: 'rgba(14,17,22,0.6)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(45,212,191,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function Scene({ reducedMotion }) {
  const groupRef = useRef();
  const radius = 2.6;

  const nodes = useMemo(
    () =>
      CATEGORIES.map((cat, i) => {
        const angle = (i / CATEGORIES.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (i % 2 === 0 ? 1 : -1) * 0.3;
        return { ...cat, position: [x, y, z] };
      }),
    []
  );

  useFrame((state, delta) => {
    if (groupRef.current && !reducedMotion) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color="#2DD4BF" />
      <pointLight position={[-3, -2, -3]} intensity={0.6} color="#F5A623" />

      <CoreNode />

      {nodes.map((node, i) => (
        <ConnectionLine key={`line-${i}`} start={[0, 0, 0]} end={node.position} phase={i * 1.3} reducedMotion={reducedMotion} />
      ))}

      {nodes.map((node, i) => (
        <CategoryNode key={`node-${i}`} position={node.position} label={node.label} index={i} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

function InvestigationUniverse() {
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0.6, 6.5], fov: 45 }}>
        <Scene reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

export default InvestigationUniverse;