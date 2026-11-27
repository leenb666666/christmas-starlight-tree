import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SkyFireworksAndSnowProps {
  ready: boolean;
  fireworkTriggerRef: React.MutableRefObject<number>;
}

const FW_PARTICLES = 150;

const fwVert = /* glsl */ `
  attribute vec3 aDir;
  attribute float aSpeed;
  attribute float aSize;
  attribute float aPhase;

  uniform float uAge;
  uniform float uPixelRatio;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (uAge < 0.0 || uAge > 2.8) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    float t = uAge;
    // Authentic air-drag spherical firework expansion + gentle gravity droop
    float expand = (1.0 - exp(-t * 2.6)) * aSpeed;
    vec3 pos = aDir * expand + vec3(0.0, -0.32 * t * t, 0.0);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float twinkle = 0.6 + 0.4 * sin(t * 14.0 + aPhase * 6.2831);
    float fade = smoothstep(0.0, 0.08, t) * pow(1.0 - t / 2.8, 1.45);
    vColor = mix(uColorA, uColorB, clamp(t * 0.55 + aPhase * 0.25, 0.0, 1.0)) * (1.2 + 0.5 * twinkle);
    vAlpha = fade * twinkle;

    gl_PointSize = clamp(aSize * (1.15 - t * 0.22) * uPixelRatio * (19.0 / max(1.0, -mvPos.z)), 1.0, 22.0);
  }
`;

const fwFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    if (vAlpha <= 0.01) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, glow * vAlpha);
  }
`;

const fwRingVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fwRingFrag = /* glsl */ `
  uniform float uAge;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    if (uAge < 0.0 || uAge > 1.35) discard;
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float prog = uAge / 1.35;
    float targetR = 0.08 + pow(prog, 0.7) * 0.85;
    float ring = exp(-pow((r - targetR) * 22.0, 2.0)) * pow(1.0 - prog, 1.5) * 0.9;
    if (ring <= 0.005) discard;
    gl_FragColor = vec4(uColor * ring, ring);
  }
`;

interface FireworkSlotConfig {
  id: number;
  offset: number;
  interval: number;
  side: -1 | 1;
  isCyan: boolean;
}

const SingleFirework: React.FC<{
  cfg: FireworkSlotConfig;
  ready: boolean;
  externalTriggerRef: React.MutableRefObject<number>;
}> = ({ cfg, ready, externalTriggerRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const fwMatRef = useRef<THREE.ShaderMaterial>(null);
  const ringMatRef = useRef<THREE.ShaderMaterial>(null);

  const stateRef = useRef({
    lastStart: -99,
    lastExtSeen: 0,
    x: cfg.side * 5.8,
    y: 2.5,
    z: -4.2,
  });

  const geometry = useMemo(() => {
    const pos = new Float32Array(FW_PARTICLES * 3);
    const dirs = new Float32Array(FW_PARTICLES * 3);
    const speeds = new Float32Array(FW_PARTICLES);
    const sizes = new Float32Array(FW_PARTICLES);
    const phases = new Float32Array(FW_PARTICLES);

    for (let i = 0; i < FW_PARTICLES; i++) {
      // Multi-ring rosette shell + inner core sparkles (matching 00:08 ethereal ring firework!)
      const isRingShell = i < 100;
      const theta = isRingShell ? (i / 100) * Math.PI * 2 + (Math.random() - 0.5) * 0.08 : Math.random() * Math.PI * 2;
      const phi = isRingShell ? Math.PI * 0.5 + (Math.random() - 0.5) * 0.55 : Math.acos(2 * Math.random() - 1);

      dirs[i * 3] = Math.sin(phi) * Math.cos(theta);
      dirs[i * 3 + 1] = Math.cos(phi) * 0.8 + (isRingShell ? Math.sin(theta) * 0.45 : 0);
      dirs[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 0.4;

      speeds[i] = isRingShell ? 2.15 + Math.random() * 0.65 : 0.8 + Math.random() * 1.45;
      sizes[i] = isRingShell ? 1.15 + Math.random() * 1.15 : 0.85 + Math.random() * 0.95;
      phases[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return geo;
  }, []);

  const fwUniforms = useMemo(
    () => ({
      uAge: { value: -1 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uColorA: { value: cfg.isCyan ? new THREE.Color('#c8f1ff') : new THREE.Color('#fff1bd') },
      uColorB: { value: cfg.isCyan ? new THREE.Color('#64c8f5') : new THREE.Color('#f5b942') },
    }),
    [cfg.isCyan]
  );

  const ringUniforms = useMemo(
    () => ({
      uAge: { value: -1 },
      uColor: { value: cfg.isCyan ? new THREE.Color('#9be3ff') : new THREE.Color('#ffe094') },
    }),
    [cfg.isCyan]
  );

  useFrame(({ clock, camera }) => {
    const now = clock.getElapsedTime();
    const st = stateRef.current;

    // External celebration trigger (quiz wish completion)
    if (externalTriggerRef.current !== st.lastExtSeen) {
      st.lastExtSeen = externalTriggerRef.current;
      st.lastStart = now - cfg.id * 0.25;
      st.x = cfg.side * (4.4 + Math.random() * 3.0);
      st.y = 1.8 + Math.random() * 2.5;
      st.z = -3.8 - Math.random() * 2.0;
    } else if (ready && now - st.lastStart > cfg.interval) {
      if (st.lastStart < 0) {
        st.lastStart = now - cfg.interval + cfg.offset;
      } else {
        st.lastStart = now;
        st.x = cfg.side * (4.6 + Math.random() * 3.4);
        st.y = 1.6 + Math.random() * 2.8;
        st.z = -4.2 - Math.random() * 2.2;
      }
    }

    const age = now - st.lastStart;
    if (groupRef.current) {
      groupRef.current.position.set(st.x, st.y, st.z);
    }
    if (ringRef.current) {
      ringRef.current.quaternion.copy(camera.quaternion);
    }
    if (fwMatRef.current) {
      fwMatRef.current.uniforms.uAge.value = age;
    }
    if (ringMatRef.current) {
      ringMatRef.current.uniforms.uAge.value = age;
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={fwMatRef}
          vertexShader={fwVert}
          fragmentShader={fwFrag}
          uniforms={fwUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <mesh ref={ringRef}>
        <planeGeometry args={[4.4, 4.4]} />
        <shaderMaterial
          ref={ringMatRef}
          vertexShader={fwRingVert}
          fragmentShader={fwRingFrag}
          uniforms={ringUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

// Gentle winter falling snow & twinkling distant stars
const snowVert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aGold;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vAlpha;
  varying float vGold;

  void main() {
    vec3 pos = position;
    pos.y = mod(pos.y - uTime * aSpeed + 12.0, 24.0) - 12.0;
    pos.x += sin(uTime * 0.45 + aPhase + pos.y * 0.25) * 0.55;
    pos.z += cos(uTime * 0.35 + aPhase * 1.2) * 0.35;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float twinkle = 0.45 + 0.55 * sin(uTime * 1.8 + aPhase * 6.2831);
    vAlpha = twinkle * 0.72;
    vGold = aGold;

    gl_PointSize = clamp(aSize * uPixelRatio * (18.0 / max(1.0, -mvPos.z)), 1.0, 18.0);
  }
`;

const snowFrag = /* glsl */ `
  varying float vAlpha;
  varying float vGold;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.06, d);
    vec3 col = mix(vec3(0.84, 0.93, 1.05), vec3(1.35, 1.12, 0.65), vGold);
    gl_FragColor = vec4(col, glow * vAlpha);
  }
`;

const FIREWORK_SLOTS: FireworkSlotConfig[] = [
  { id: 0, offset: 0.4, interval: 5.2, side: -1, isCyan: true },
  { id: 1, offset: 2.0, interval: 5.8, side: 1, isCyan: false },
  { id: 2, offset: 3.4, interval: 6.4, side: -1, isCyan: false },
  { id: 3, offset: 4.5, interval: 6.9, side: 1, isCyan: true },
];

export const SkyFireworksAndSnow: React.FC<SkyFireworksAndSnowProps> = ({
  ready,
  fireworkTriggerRef,
}) => {
  const snowMatRef = useRef<THREE.ShaderMaterial>(null);

  const snowGeometry = useMemo(() => {
    const count = 880;
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const golds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 28;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 2] = -10 + Math.random() * 18;
      sizes[i] = 0.7 + Math.random() * 1.65;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.25 + Math.random() * 0.55;
      golds[i] = Math.random() < 0.28 ? 1.0 : 0.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aGold', new THREE.BufferAttribute(golds, 1));
    return geo;
  }, []);

  const snowUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (snowMatRef.current) {
      snowMatRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <group>
      {FIREWORK_SLOTS.map((slot) => (
        <SingleFirework
          key={slot.id}
          cfg={slot}
          ready={ready}
          externalTriggerRef={fireworkTriggerRef}
        />
      ))}

      <points geometry={snowGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={snowMatRef}
          vertexShader={snowVert}
          fragmentShader={snowFrag}
          uniforms={snowUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
};
