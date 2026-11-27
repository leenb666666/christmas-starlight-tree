import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { TREE_BASE_Y } from './StarlightTreeParticles';

export interface ShockwavePulseSlot {
  x: number;
  z: number;
  startTime: number;
  strength: number;
}

interface GroundRippleSystemProps {
  growthRef: React.MutableRefObject<number>;
  pulsesRef: React.MutableRefObject<ShockwavePulseSlot[]>;
  onFloorClick?: (x: number, z: number) => void;
}

const ripplePlaneVert = /* glsl */ `
  varying vec2 vWorldXZ;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldXZ = wp.xz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ripplePlaneFrag = /* glsl */ `
  uniform float uTime;
  uniform float uGrowth;
  uniform vec4 uPulses[6]; // xy = center xz, z = age in seconds, w = strength

  varying vec2 vWorldXZ;

  void main() {
    float r = length(vWorldXZ);
    float angle = atan(vWorldXZ.y, vWorldXZ.x);

    // 1. Crisp iconic golden orbital rings around the tree base (matching 00:02 - 00:12!)
    float appear = smoothstep(0.0, 0.14, uGrowth);
    float ring1 = exp(-pow((r - 2.38) * 18.0, 2.0)) * (0.65 + 0.35 * sin(angle * 3.0 - uTime * 1.4));
    float ring2 = exp(-pow((r - 3.02) * 20.0, 2.0)) * (0.55 + 0.45 * sin(angle * 5.0 + uTime * 1.1));
    float ring3 = exp(-pow((r - 3.72) * 16.0, 2.0)) * (0.4 + 0.4 * sin(angle * 2.0 - uTime * 0.8));

    // 2. Continuous outward-rippling golden water-light waves
    float wavePhase = r * 3.6 - uTime * 2.4;
    float continuousWave = pow(max(0.0, sin(wavePhase)), 6.0) * smoothstep(7.5, 1.2, r) * smoothstep(0.4, 1.8, r) * 0.38;

    // Soft warm center puddle reflection beneath tree base
    float baseGlow = exp(-r * r * 0.24) * 0.38 * smoothstep(0.02, 0.35, uGrowth);

    // 3. Up to 6 simultaneous discrete expanding shockwave ripples (apex ignition, quiz, user clicks!)
    float pulseGlow = 0.0;
    for (int i = 0; i < 6; i++) {
      vec4 p = uPulses[i];
      float age = p.z;
      float strength = p.w;
      if (age > 0.0 && age < 2.8 && strength > 0.01) {
        float dist = length(vWorldXZ - p.xy);
        float waveR = age * 3.85;
        float fade = (1.0 - age / 2.8) * (1.0 - age / 2.8) * strength;

        // Sharp incandescent primary crest
        float primary = exp(-pow((dist - waveR) * 6.5, 2.0)) * 1.65;
        // Delicate secondary harmonic ripple trailing right behind
        float secondary = exp(-pow((dist - max(0.0, waveR - 0.55)) * 7.5, 2.0)) * 0.72;
        // Soft inner wash
        float wash = exp(-pow((dist - waveR) * 1.9, 2.0)) * 0.25;

        pulseGlow += (primary + secondary + wash) * fade;
      }
    }

    float intensity = (ring1 * 0.95 + ring2 * 0.65 + ring3 * 0.42 + continuousWave + baseGlow) * appear + pulseGlow;
    float edgeFade = smoothstep(8.2, 5.2, r);
    intensity *= edgeFade;

    if (intensity <= 0.004) discard;

    vec3 warmGold = vec3(1.45, 1.08, 0.48);
    vec3 ivoryHot = vec3(2.1, 1.88, 1.35);
    vec3 col = mix(warmGold, ivoryHot, clamp(pulseGlow * 0.65 + ring1 * 0.35, 0.0, 1.0));

    gl_FragColor = vec4(col * intensity, clamp(intensity, 0.0, 0.95));
  }
`;

const floorDustVert = /* glsl */ `
  attribute float aRadius;
  attribute float aAngle;
  attribute float aSize;
  attribute float aPhase;

  uniform float uTime;
  uniform float uGrowth;
  uniform float uPixelRatio;
  uniform vec4 uPulses[6];

  varying float vAlpha;
  varying float vHot;

  void main() {
    float appear = smoothstep(0.0, 0.25, uGrowth);
    float ang = aAngle + uTime * (0.14 / max(1.2, aRadius * 0.45));
    vec2 xz = vec2(cos(ang), sin(ang)) * aRadius;

    // Gentle concentric water-ripple vertical undulation
    float rippleY = sin(aRadius * 3.6 - uTime * 2.4) * 0.075;
    float pulseBoost = 0.0;

    for (int i = 0; i < 6; i++) {
      vec4 p = uPulses[i];
      if (p.z > 0.0 && p.z < 2.8 && p.w > 0.01) {
        float dist = length(xz - p.xy);
        float waveR = p.z * 3.85;
        float fade = (1.0 - p.z / 2.8) * p.w;
        float lift = exp(-pow((dist - waveR) * 4.2, 2.0)) * fade;
        rippleY += lift * 0.26;
        pulseBoost += lift * 1.4;
      }
    }

    vec3 pos = vec3(xz.x, rippleY, xz.y);
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float twinkle = 0.55 + 0.45 * sin(uTime * 2.8 + aPhase * 6.2831);
    vAlpha = appear * twinkle * (0.55 + pulseBoost * 0.7) * smoothstep(7.2, 2.2, aRadius);
    vHot = clamp(pulseBoost, 0.0, 1.2);

    float s = aSize * (0.85 + 0.35 * twinkle + pulseBoost * 0.55);
    gl_PointSize = clamp(s * uPixelRatio * (17.0 / max(1.0, -mvPos.z)), 1.0, 28.0);
  }
`;

const floorDustFrag = /* glsl */ `
  varying float vAlpha;
  varying float vHot;

  void main() {
    if (vAlpha <= 0.01) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.05, d);
    vec3 col = mix(vec3(1.35, 1.04, 0.52), vec3(2.2, 1.98, 1.48), vHot);
    gl_FragColor = vec4(col, core * vAlpha);
  }
`;

export const GroundRippleSystem: React.FC<GroundRippleSystemProps> = ({
  growthRef,
  pulsesRef,
  onFloorClick,
}) => {
  const planeMatRef = useRef<THREE.ShaderMaterial>(null);
  const dustMatRef = useRef<THREE.ShaderMaterial>(null);

  const pulseUniformArray = useMemo(
    () => Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -1, 0)),
    []
  );

  const planeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowth: { value: 0 },
      uPulses: { value: pulseUniformArray },
    }),
    [pulseUniformArray]
  );

  const dustUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowth: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uPulses: { value: pulseUniformArray },
    }),
    [pulseUniformArray]
  );

  // 2,200 golden stardust particles arranged in undulating concentric floor rings
  const dustGeometry = useMemo(() => {
    const count = 2200;
    const positions = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    const ringRadii = [2.38, 3.02, 3.72, 4.55];
    for (let i = 0; i < count; i++) {
      let r: number;
      if (i < 1300) {
        const baseR = ringRadii[i % ringRadii.length];
        r = baseR + (Math.random() - 0.5) * 0.24;
      } else {
        r = 1.4 + Math.random() * 5.6;
      }
      const ang = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(ang) * r;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(ang) * r;

      radii[i] = r;
      angles[i] = ang;
      sizes[i] = i < 1300 ? 0.9 + Math.random() * 1.15 : 0.65 + Math.random() * 0.9;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    const pulses = pulsesRef.current;

    for (let i = 0; i < 6; i++) {
      const p = pulses[i];
      if (p) {
        const age = now - p.startTime;
        pulseUniformArray[i].set(p.x, p.z, age, p.strength);
      } else {
        pulseUniformArray[i].set(0, 0, -1, 0);
      }
    }

    if (planeMatRef.current) {
      planeMatRef.current.uniforms.uTime.value = now;
      planeMatRef.current.uniforms.uGrowth.value = growthRef.current;
    }
    if (dustMatRef.current) {
      dustMatRef.current.uniforms.uTime.value = now;
      dustMatRef.current.uniforms.uGrowth.value = growthRef.current;
    }
  });

  const handleFloorPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!onFloorClick) return;
    e.stopPropagation();
    onFloorClick(e.point.x, e.point.z);
  };

  return (
    <group position={[0, TREE_BASE_Y - 0.08, 0]}>
      {/* Continuous glowing ripple disc + interactive shockwaves */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={handleFloorPointerDown}>
        <planeGeometry args={[17, 17, 1, 1]} />
        <shaderMaterial
          ref={planeMatRef}
          vertexShader={ripplePlaneVert}
          fragmentShader={ripplePlaneFrag}
          uniforms={planeUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Concentric rippling golden stardust particles hovering above floor */}
      <points geometry={dustGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={dustMatRef}
          vertexShader={floorDustVert}
          fragmentShader={floorDustFrag}
          uniforms={dustUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
};
