import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  getStarlightTreeRadius,
  SPIRAL_TURNS,
  TREE_BASE_Y,
  TREE_HEIGHT,
} from './StarlightTreeParticles';

interface SpiralCometWeaverProps {
  growthRef: React.MutableRefObject<number>;
}

const TRAIL_COUNT = 220;

const trailVert = /* glsl */ `
  attribute float aFrac;
  attribute float aSize;
  uniform float uPixelRatio;
  uniform float uVisibility;
  varying float vFrac;
  varying float vVis;

  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;
    vFrac = aFrac;
    vVis = uVisibility;
    float s = aSize * (1.0 - aFrac * 0.72) * uVisibility;
    gl_PointSize = clamp(s * uPixelRatio * (22.0 / max(1.0, -mvPos.z)), 0.0, 52.0);
  }
`;

const trailFrag = /* glsl */ `
  varying float vFrac;
  varying float vVis;

  void main() {
    if (vVis <= 0.01) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float glow = smoothstep(0.5, 0.02, d);
    vec3 headCol = vec3(2.2, 1.95, 1.35);
    vec3 tailCol = vec3(1.5, 0.92, 0.25);
    vec3 col = mix(headCol, tailCol, vFrac);
    float alpha = glow * (1.0 - vFrac) * vVis;
    gl_FragColor = vec4(col, alpha);
  }
`;

/**
 * Blazing golden comet head & sparkling spiral ember tail that races from base to apex
 * during the growth animation, weaving the 12,500 tree particles into existence.
 */
export const SpiralCometWeaver: React.FC<SpiralCometWeaverProps> = ({ growthRef }) => {
  const headMeshRef = useRef<THREE.Mesh>(null);
  const headLightRef = useRef<THREE.PointLight>(null);
  const trailMatRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, posArray } = useMemo(() => {
    const pos = new Float32Array(TRAIL_COUNT * 3);
    const fracs = new Float32Array(TRAIL_COUNT);
    const sizes = new Float32Array(TRAIL_COUNT);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      fracs[i] = i / (TRAIL_COUNT - 1);
      sizes[i] = i === 0 ? 3.8 : 1.0 + Math.random() * 1.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aFrac', new THREE.BufferAttribute(fracs, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return { geometry: geo, posArray: pos };
  }, []);

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uVisibility: { value: 0 },
    }),
    []
  );

  useFrame(({ clock }) => {
    const g = growthRef.current;
    const t = clock.getElapsedTime();

    // Active while growing (0.005 .. 0.998), smoothly fades out right as apex star ignites
    const vis = g > 0.002 && g < 1.0 ? Math.min(1, g * 8) * Math.min(1, (1.0 - g) * 14) : 0;

    if (trailMatRef.current) {
      trailMatRef.current.uniforms.uVisibility.value = vis;
    }

    if (vis <= 0.001) {
      if (headMeshRef.current) headMeshRef.current.visible = false;
      if (headLightRef.current) headLightRef.current.intensity = 0;
      return;
    }

    // Update spiral trail behind current growth head
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const frac = i / (TRAIL_COUNT - 1);
      const sampleG = Math.max(0, g - frac * 0.16);
      const angle = sampleG * Math.PI * 2 * SPIRAL_TURNS + t * 0.6;
      const radius = getStarlightTreeRadius(sampleG, angle) + 0.16;
      const y = TREE_BASE_Y + sampleG * TREE_HEIGHT;

      const jitter = frac * 0.14;
      const px = Math.cos(angle) * radius + Math.sin(i * 12.7 + t * 8) * jitter;
      const py = y + Math.cos(i * 9.3 + t * 7) * jitter * 0.5;
      const pz = Math.sin(angle) * radius + Math.cos(i * 15.1 + t * 8) * jitter;

      posArray[i * 3] = px;
      posArray[i * 3 + 1] = py;
      posArray[i * 3 + 2] = pz;

      if (i === 0) {
        if (headMeshRef.current) {
          headMeshRef.current.visible = true;
          headMeshRef.current.position.set(px, py, pz);
          headMeshRef.current.scale.setScalar(0.14 * vis);
        }
        if (headLightRef.current) {
          headLightRef.current.position.set(px, py, pz);
          headLightRef.current.intensity = 4.5 * vis;
        }
      }
    }

    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={headMeshRef} visible={false}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={[2.5, 2.15, 1.35]} toneMapped={false} />
      </mesh>
      <pointLight ref={headLightRef} color="#ffe499" intensity={0} distance={8} decay={2} />
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={trailMatRef}
          vertexShader={trailVert}
          fragmentShader={trailFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
};
