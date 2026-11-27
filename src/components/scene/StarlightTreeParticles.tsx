import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const TREE_BASE_Y = -3.35;
export const TREE_TOP_Y = 4.15;
export const TREE_HEIGHT = TREE_TOP_Y - TREE_BASE_Y;
export const TREE_BASE_RADIUS = 2.65;
export const SPIRAL_TURNS = 6.5;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth lush conical pine profile matching the golden starlight tree silhouette */
export function getStarlightTreeRadius(t: number, angle: number): number {
  const ct = Math.max(0, Math.min(1, t));
  const cone = Math.pow(1 - ct, 0.94) * TREE_BASE_RADIUS;
  // Subtle organic bough scallops (9 soft tiers)
  const tier = (ct * 9.0) % 1.0;
  const scallop = 0.84 + 0.24 * Math.pow(1 - tier, 1.3);
  const rib = 1.0 + 0.07 * Math.cos(angle * 7.0 + Math.floor(ct * 9.0) * 1.1);
  return Math.max(0.03, cone * scallop * rib);
}

interface StarlightTreeParticlesProps {
  growthRef: React.MutableRefObject<number>;
  waveYRef: React.MutableRefObject<number>;
  wavePowerRef: React.MutableRefObject<number>;
}

const vertexShader = /* glsl */ `
  attribute float aBirthT;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  attribute float aSparkle;

  uniform float uTime;
  uniform float uGrowth;
  uniform float uWaveY;
  uniform float uWavePower;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vSparkle;

  void main() {
    // Progressive spiral bottom-to-top birth synced with the climbing comet head
    float birth = smoothstep(aBirthT - 0.075, aBirthT + 0.035, uGrowth);
    if (birth <= 0.001) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    vec3 pos = position;

    // Swirl inward gracefully as each particle materializes from the spiral comet wake
    float invBirth = 1.0 - birth;
    float swirlAng = invBirth * 2.4;
    float cs = cos(swirlAng);
    float sn = sin(swirlAng);
    pos.xz = mat2(cs, -sn, sn, cs) * pos.xz * (1.0 + invBirth * 0.55);
    pos.y -= invBirth * 0.45;

    // Living gentle golden breeze shimmer
    float shimmerMove = 0.024 + aSparkle * 0.018;
    pos.x += sin(uTime * 1.15 + aPhase + pos.y * 0.9) * shimmerMove;
    pos.y += cos(uTime * 0.95 + aPhase * 1.3) * shimmerMove * 0.7;
    pos.z += cos(uTime * 1.05 + aPhase + pos.x * 0.8) * shimmerMove;

    // Downward cascading shockwave ripple along the tree body (triggered on apex ignition & blessings!)
    float waveDist = abs(pos.y - uWaveY);
    float waveBand = exp(-waveDist * waveDist * 1.9) * uWavePower;
    vec2 radialDir = normalize(pos.xz + vec2(0.0001));
    pos.xz += radialDir * waveBand * 0.34;
    pos.y += waveBand * 0.08;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float twinkle = 0.62 + 0.38 * sin(uTime * (2.6 + aSparkle * 2.8) + aPhase * 6.2831);
    // Bright incandescent flash right as the particle is born
    float birthFlash = sin(birth * 3.14159265) * 1.35;

    float lum = (0.95 + 0.48 * twinkle + birthFlash + waveBand * 1.65) * (1.0 + aSparkle * 0.45);
    vColor = aColor * lum + vec3(1.0, 0.95, 0.82) * (birthFlash * 0.55 + waveBand * 0.85);
    vAlpha = birth * (0.72 + 0.28 * twinkle);
    vSparkle = aSparkle * twinkle + waveBand * 0.5;

    float sizeScale = aSize * (0.78 + 0.35 * twinkle + birthFlash * 0.4 + waveBand * 0.55);
    gl_PointSize = clamp(sizeScale * uPixelRatio * (19.5 / max(1.0, -mvPos.z)), 1.4, 42.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSparkle;

  void main() {
    if (vAlpha <= 0.005) discard;

    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;

    float softHalo = smoothstep(0.5, 0.04, d);
    float hotCore = smoothstep(0.22, 0.0, d);

    // Delicate 4-point diamond star glint on sparkling particles
    float glint = max(
      exp(-abs(uv.x) * 20.0) * exp(-abs(uv.y) * 5.2),
      exp(-abs(uv.y) * 20.0) * exp(-abs(uv.x) * 5.2)
    ) * clamp(vSparkle, 0.0, 1.4);

    vec3 finalCol = vColor + vec3(1.0, 0.96, 0.86) * (hotCore * 0.5 + glint * 0.72);
    float alpha = clamp((softHalo * 0.88 + glint * 0.45) * vAlpha, 0.0, 1.0);
    gl_FragColor = vec4(finalCol, alpha);
  }
`;

export const StarlightTreeParticles: React.FC<StarlightTreeParticlesProps> = ({
  growthRef,
  waveYRef,
  wavePowerRef,
}) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const count = 12500;
    const rng = mulberry32(20261224);

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const birthTs = new Float32Array(count);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const sparkles = new Float32Array(count);

    const paletteWarmGold = [
      new THREE.Color('#ffd97d'),
      new THREE.Color('#f5b844'),
      new THREE.Color('#ffe8a8'),
      new THREE.Color('#e69d2c'),
      new THREE.Color('#f7c98e'),
    ];
    const paletteIvory = [
      new THREE.Color('#fff9e6'),
      new THREE.Color('#ffefc4'),
      new THREE.Color('#ffe29c'),
    ];

    for (let i = 0; i < count; i++) {
      const kind = rng();
      let t: number;
      let angle: number;
      let r: number;
      let col: THREE.Color;
      let size: number;
      let sparkle: number;

      if (kind < 0.2) {
        // 20%: Dazzling luminous spiral garlands hugging the outer silhouette
        t = rng();
        const stream = Math.floor(rng() * 3);
        const baseAng = t * Math.PI * 2 * SPIRAL_TURNS + (stream * Math.PI * 2) / 3;
        angle = baseAng + (rng() - 0.5) * 0.22;
        const maxR = getStarlightTreeRadius(t, angle);
        r = maxR * (0.94 + rng() * 0.14);
        col = paletteIvory[Math.floor(rng() * paletteIvory.length)];
        size = 1.25 + rng() * 1.55;
        sparkle = 0.85 + rng() * 0.35;
      } else if (kind < 0.86) {
        // 66%: Dense golden champagne-amber foliage body
        const u = rng();
        t = 1.0 - Math.pow(1.0 - u, 0.65);
        angle = rng() * Math.PI * 2;
        const maxR = getStarlightTreeRadius(t, angle);
        const radialFill = 0.18 + 0.85 * Math.pow(rng(), 0.44);
        r = maxR * radialFill;
        col = paletteWarmGold[Math.floor(rng() * paletteWarmGold.length)];
        size = 0.85 + rng() * 1.35;
        sparkle = rng() < 0.25 ? 0.7 : 0.18;
      } else {
        // 14%: Floating outer golden fairy-dust aura wrapping softly around the tree
        const u = rng();
        t = 1.0 - Math.pow(1.0 - u, 0.72);
        angle = rng() * Math.PI * 2;
        const maxR = getStarlightTreeRadius(t, angle);
        r = maxR * (1.02 + rng() * 0.32);
        col = paletteIvory[Math.floor(rng() * paletteIvory.length)];
        size = 0.75 + rng() * 1.15;
        sparkle = 0.95;
      }

      const y = TREE_BASE_Y + t * TREE_HEIGHT + (rng() - 0.5) * 0.14;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      // Subtle vertical brightness gradient (warm amber base -> glowing champagne upper crown)
      const gradBoost = 0.92 + t * 0.28;
      colors[i * 3] = col.r * gradBoost;
      colors[i * 3 + 1] = col.g * gradBoost;
      colors[i * 3 + 2] = col.b * gradBoost;

      // Birth timing follows height t with tiny organic scatter
      birthTs[i] = Math.max(0.02, Math.min(0.98, t + (rng() - 0.5) * 0.04));
      sizes[i] = size;
      phases[i] = rng() * Math.PI * 2;
      sparkles[i] = sparkle;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aBirthT', new THREE.BufferAttribute(birthTs, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSparkle', new THREE.BufferAttribute(sparkles, 1));
    return geo;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowth: { value: 0 },
      uWaveY: { value: 10 },
      uWavePower: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    matRef.current.uniforms.uGrowth.value = growthRef.current;
    matRef.current.uniforms.uWaveY.value = waveYRef.current;
    matRef.current.uniforms.uWavePower.value = wavePowerRef.current;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};
