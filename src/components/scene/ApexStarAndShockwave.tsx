import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TREE_TOP_Y } from './StarlightTreeParticles';

interface ApexStarAndShockwaveProps {
  ignitionTimeRef: React.MutableRefObject<number | null>;
}

const starFlareVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const starFlareFrag = /* glsl */ `
  uniform float uTime;
  uniform float uAge;
  varying vec2 vUv;

  void main() {
    if (uAge < 0.0) discard;
    vec2 p = (vUv - 0.5) * 2.0;
    float d = length(p);

    // Smooth explosive fade-in on ignition
    float ignitionFlash = exp(-uAge * 2.2) * 1.5;
    float appear = smoothstep(0.0, 0.12, uAge);
    float breathe = 0.92 + 0.1 * sin(uTime * 3.1);

    // Incandescent solar center
    float core = exp(-d * 9.5) * (2.6 + ignitionFlash);
    float innerHalo = exp(-d * 3.6) * (0.95 + ignitionFlash * 0.7);

    // Razor-sharp 4-point celestial lens flare cross beams (matching 00:06 - 00:08!)
    float horizBeam = exp(-abs(p.y) * 44.0) * exp(-abs(p.x) * 2.4) * (1.85 + ignitionFlash);
    float vertBeam = exp(-abs(p.x) * 44.0) * exp(-abs(p.y) * 2.2) * (1.85 + ignitionFlash);

    // Delicate 45-degree diagonal secondary glint
    vec2 dp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p;
    float diag1 = exp(-abs(dp.y) * 56.0) * exp(-abs(dp.x) * 5.2) * 0.72;
    float diag2 = exp(-abs(dp.x) * 56.0) * exp(-abs(dp.y) * 5.2) * 0.72;

    float total = (core + innerHalo + horizBeam + vertBeam + diag1 + diag2) * appear * breathe;
    if (total <= 0.005) discard;

    vec3 warmGold = vec3(1.5, 1.16, 0.56);
    vec3 pureWhite = vec3(2.4, 2.25, 1.85);
    vec3 col = mix(warmGold, pureWhite, clamp(core * 0.55 + horizBeam * 0.35, 0.0, 1.0));

    gl_FragColor = vec4(col * total, clamp(total, 0.0, 1.0));
  }
`;

const shockwaveFrag = /* glsl */ `
  uniform float uAge;
  varying vec2 vUv;

  void main() {
    if (uAge < 0.0 || uAge > 2.2) discard;
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);

    // Expanding circular halo shockwave matching 00:06 frame-for-frame!
    float progress = uAge / 2.2;
    float ringR = 0.06 + pow(progress, 0.72) * 0.94;
    float fade = pow(1.0 - progress, 1.65);

    // Primary incandescent luminous halo ring
    float ring1 = exp(-pow((r - ringR) * 18.0, 2.0)) * 2.1;
    // Soft golden outer volumetric aureole
    float aura = exp(-pow((r - ringR * 0.94) * 5.0, 2.0)) * 0.62;
    // Secondary crisp inner ripple ring
    float ring2 = exp(-pow((r - max(0.0, ringR - 0.12)) * 24.0, 2.0)) * 0.85;

    float total = (ring1 + aura + ring2) * fade * smoothstep(1.0, 0.82, r);
    if (total <= 0.004) discard;

    vec3 col = mix(vec3(1.6, 1.24, 0.62), vec3(2.5, 2.38, 2.05), clamp(ring1 * 0.6, 0.0, 1.0));
    gl_FragColor = vec4(col * total, clamp(total, 0.0, 1.0));
  }
`;

const burstVert = /* glsl */ `
  attribute vec3 aVel;
  attribute float aSize;
  uniform float uAge;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    if (uAge < 0.0 || uAge > 2.6) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      return;
    }

    float t = uAge;
    // Radial burst with air drag and soft golden snowfall gravity
    float drag = 1.0 - exp(-t * 2.1);
    vec3 pos = aVel * drag * 2.4 + vec3(0.0, -0.45 * t * t, 0.0);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    vAlpha = smoothstep(0.0, 0.06, t) * pow(1.0 - t / 2.6, 1.5);
    gl_PointSize = clamp(aSize * uPixelRatio * (18.0 / max(1.0, -mvPos.z)), 1.0, 26.0);
  }
`;

const burstFrag = /* glsl */ `
  varying float vAlpha;
  void main() {
    if (vAlpha <= 0.01) discard;
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float glow = smoothstep(0.5, 0.04, d);
    gl_FragColor = vec4(vec3(2.1, 1.85, 1.15), glow * vAlpha);
  }
`;

export const ApexStarAndShockwave: React.FC<ApexStarAndShockwaveProps> = ({ ignitionTimeRef }) => {
  const starGroupRef = useRef<THREE.Group>(null);
  const flareMatRef = useRef<THREE.ShaderMaterial>(null);
  const shockMatRef = useRef<THREE.ShaderMaterial>(null);
  const burstMatRef = useRef<THREE.ShaderMaterial>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  const flareUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAge: { value: -1 },
    }),
    []
  );

  const shockUniforms = useMemo(
    () => ({
      uAge: { value: -1 },
    }),
    []
  );

  const burstUniforms = useMemo(
    () => ({
      uAge: { value: -1 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    }),
    []
  );

  const burstGeometry = useMemo(() => {
    const count = 260;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 1.45;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.cos(phi) * speed;
      vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      sizes[i] = 0.8 + Math.random() * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  useFrame(({ clock, camera }) => {
    const now = clock.getElapsedTime();
    const ignTime = ignitionTimeRef.current;
    const age = ignTime === null ? -1 : now - ignTime;

    if (starGroupRef.current) {
      // Billboard star flare & circular shockwave squarely toward active camera
      starGroupRef.current.quaternion.copy(camera.quaternion);
    }

    if (flareMatRef.current) {
      flareMatRef.current.uniforms.uTime.value = now;
      flareMatRef.current.uniforms.uAge.value = age;
    }
    if (shockMatRef.current) {
      shockMatRef.current.uniforms.uAge.value = age;
    }
    if (burstMatRef.current) {
      burstMatRef.current.uniforms.uAge.value = age;
    }
    if (pointLightRef.current) {
      if (age < 0) {
        pointLightRef.current.intensity = 0;
      } else {
        const flash = Math.exp(-age * 2.2) * 8.0;
        pointLightRef.current.intensity = 3.2 + flash + Math.sin(now * 2.8) * 0.4;
      }
    }
  });

  return (
    <group position={[0, TREE_TOP_Y + 0.16, 0]}>
      {/* Camera-facing celestial lens flare & 00:06 expanding shockwave halo */}
      <group ref={starGroupRef}>
        <mesh>
          <planeGeometry args={[4.2, 4.2]} />
          <shaderMaterial
            ref={flareMatRef}
            vertexShader={starFlareVert}
            fragmentShader={starFlareFrag}
            uniforms={flareUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[12.5, 12.5]} />
          <shaderMaterial
            ref={shockMatRef}
            vertexShader={starFlareVert}
            fragmentShader={shockwaveFrag}
            uniforms={shockUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* 3D radial golden ember burst upon star ignition */}
      <points geometry={burstGeometry} frustumCulled={false}>
        <shaderMaterial
          ref={burstMatRef}
          vertexShader={burstVert}
          fragmentShader={burstFrag}
          uniforms={burstUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      <pointLight ref={pointLightRef} color="#ffebc2" intensity={0} distance={14} decay={2} />
    </group>
  );
};
