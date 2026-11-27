import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { StarlightTreeParticles, TREE_BASE_Y, TREE_TOP_Y } from './StarlightTreeParticles';
import { SpiralCometWeaver } from './SpiralCometWeaver';
import { GroundRippleSystem, ShockwavePulseSlot } from './GroundRippleSystem';
import { ApexStarAndShockwave } from './ApexStarAndShockwave';
import { SkyFireworksAndSnow } from './SkyFireworksAndSnow';
import { christmasAudio } from '../../utils/christmasAudio';

interface StarlightSceneProps {
  active: boolean;
  replaySignal: number;
  celebrateSignal: number;
  onTreeGrown: () => void;
}

const backdropVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const backdropFrag = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - vec2(0.5, 0.56);
    float d = length(p * vec2(1.0, 1.35));

    // Rich velvety midnight-obsidian sky with subtle cool teal aurora glow behind the tree
    vec3 deepNight = vec3(0.004, 0.009, 0.018);
    vec3 tealAurora = vec3(0.014, 0.044, 0.068);
    vec3 warmCore = vec3(0.062, 0.042, 0.016);

    float wave = 0.5 + 0.5 * sin(vUv.x * 4.5 + uTime * 0.25) * cos(vUv.y * 3.0 - uTime * 0.18);
    vec3 col = mix(deepNight, tealAurora, exp(-d * d * 2.8) * (0.65 + 0.35 * wave));
    col += warmCore * exp(-length(vUv - vec2(0.5, 0.42)) * 4.6) * 0.55;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const SceneOrchestrator: React.FC<StarlightSceneProps> = ({
  active,
  replaySignal,
  celebrateSignal,
  onTreeGrown,
}) => {
  const treeGroupRef = useRef<THREE.Group>(null);
  const backdropMatRef = useRef<THREE.ShaderMaterial>(null);

  const growthRef = useRef(0);
  const startClockRef = useRef<number | null>(null);
  const ignitionTimeRef = useRef<number | null>(null);
  const waveYRef = useRef(12);
  const wavePowerRef = useRef(0);
  const waveActiveRef = useRef(false);
  const grownNotifiedRef = useRef(false);
  const midRippleFiredRef = useRef(false);
  const fireworkTriggerRef = useRef(0);

  const pulsesRef = useRef<ShockwavePulseSlot[]>([]);
  const pulseWriteIdxRef = useRef(0);
  const latestClockRef = useRef(0);

  const onTreeGrownRef = useRef(onTreeGrown);
  useEffect(() => {
    onTreeGrownRef.current = onTreeGrown;
  }, [onTreeGrown]);

  const emitFloorRipple = useCallback((x: number, z: number, strength = 1.15) => {
    const idx = pulseWriteIdxRef.current % 6;
    pulseWriteIdxRef.current++;
    pulsesRef.current[idx] = {
      x,
      z,
      startTime: latestClockRef.current,
      strength,
    };
  }, []);

  const triggerTreeWave = useCallback(() => {
    waveYRef.current = TREE_TOP_Y + 0.3;
    wavePowerRef.current = 1.0;
    waveActiveRef.current = true;
  }, []);

  // Reset timeline on replay
  useEffect(() => {
    if (!active) return;
    growthRef.current = 0;
    startClockRef.current = null;
    ignitionTimeRef.current = null;
    grownNotifiedRef.current = false;
    midRippleFiredRef.current = false;
    waveActiveRef.current = false;
    wavePowerRef.current = 0;
  }, [active, replaySignal]);

  // Celebratory shockwave + fireworks + ripple when quiz wish is submitted
  useEffect(() => {
    if (celebrateSignal === 0) return;
    ignitionTimeRef.current = latestClockRef.current;
    triggerTreeWave();
    emitFloorRipple(0, 0, 1.55);
    fireworkTriggerRef.current += 1;
    christmasAudio.playApexIgnitionChord();
  }, [celebrateSignal, emitFloorRipple, triggerTreeWave]);

  const backdropUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const now = clock.getElapsedTime();
    latestClockRef.current = now;

    if (backdropMatRef.current) {
      backdropMatRef.current.uniforms.uTime.value = now;
    }

    if (!active) return;

    if (startClockRef.current === null) {
      startClockRef.current = now;
      // Opening concentric floor ripple right at 00:02!
      emitFloorRipple(0, 0, 1.25);
    }

    const elapsed = now - startClockRef.current;
    // 3.6s crisp bottom-to-top spiral construction matching 00:02 -> 00:06
    const growthDuration = 3.6;
    const rawG = Math.min(1, Math.max(0, elapsed / growthDuration));
    // Smooth organic spiral acceleration curve
    const easedG = rawG < 0.5
      ? 2 * rawG * rawG
      : 1 - Math.pow(-2 * rawG + 2, 2) / 2;
    growthRef.current = easedG;

    // Emit a graceful mid-growth floor ripple at ~1.45s
    if (!midRippleFiredRef.current && elapsed > 1.45) {
      midRippleFiredRef.current = true;
      emitFloorRipple(0, 0, 1.0);
    }

    // 00:06 Apex Star Ignition + Circular Shockwave + Downward Tree Energy Cascade!
    if (rawG >= 1 && !grownNotifiedRef.current) {
      grownNotifiedRef.current = true;
      ignitionTimeRef.current = now;
      emitFloorRipple(0, 0, 1.65);
      triggerTreeWave();
      christmasAudio.playApexIgnitionChord();
      onTreeGrownRef.current();
    }

    // Animate downward cascading golden energy wave along the tree body
    if (waveActiveRef.current) {
      waveYRef.current -= delta * 4.6;
      wavePowerRef.current = Math.max(0, wavePowerRef.current - delta * 0.42);
      if (waveYRef.current < TREE_BASE_Y - 1.2 || wavePowerRef.current <= 0.005) {
        waveActiveRef.current = false;
        wavePowerRef.current = 0;
      }
    }

    // Gentle living rotation of the golden particle tree
    if (treeGroupRef.current) {
      const spinSpeed = rawG < 1 ? 0.28 : 0.14;
      treeGroupRef.current.rotation.y += delta * spinSpeed;
    }
  });

  const handleFloorClick = useCallback(
    (x: number, z: number) => {
      emitFloorRipple(x, z, 1.3);
      christmasAudio.playRipplePluck();
      // Clicking near the tree also ripples a golden shimmer wave down its branches!
      if (Math.hypot(x, z) < 3.6 && growthRef.current >= 0.98) {
        triggerTreeWave();
      }
    },
    [emitFloorRipple, triggerTreeWave]
  );

  return (
    <>
      <color attach="background" args={['#040b13']} />
      <fogExp2 attach="fog" args={['#040b13', 0.02]} />

      {/* Subtle deep-sky midnight-teal aurora backdrop plane */}
      <mesh position={[0, 1.2, -16]}>
        <planeGeometry args={[52, 34]} />
        <shaderMaterial
          ref={backdropMatRef}
          vertexShader={backdropVert}
          fragmentShader={backdropFrag}
          uniforms={backdropUniforms}
          depthWrite={false}
        />
      </mesh>

      {/* Ambient sky fireworks & gentle falling snow */}
      <SkyFireworksAndSnow ready={grownNotifiedRef.current} fireworkTriggerRef={fireworkTriggerRef} />

      {/* Core rotating golden starlight tree assembly (positioned cleanly below calligraphic header) */}
      <group ref={treeGroupRef} position={[0, -0.95, 0]}>
        <StarlightTreeParticles
          growthRef={growthRef}
          waveYRef={waveYRef}
          wavePowerRef={wavePowerRef}
        />
        <SpiralCometWeaver growthRef={growthRef} />
        <ApexStarAndShockwave ignitionTimeRef={ignitionTimeRef} />
      </group>

      {/* Ground concentric water-light ripples & interactive click shockwaves */}
      <group position={[0, -0.95, 0]}>
        <GroundRippleSystem
          growthRef={growthRef}
          pulsesRef={pulsesRef}
          onFloorClick={handleFloorClick}
        />
      </group>

      {/* Smooth interactive camera orbit & zoom */}
      <OrbitControls
        enableDamping
        dampingFactor={0.055}
        enablePan={false}
        minDistance={8.0}
        maxDistance={20}
        minPolarAngle={0.45}
        maxPolarAngle={Math.PI / 1.92}
        target={[0, 0.1, 0]}
      />

      {/* Cinema-grade selective Bloom & subtle vignette */}
      <EffectComposer multisampling={4}>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.82}
          luminanceSmoothing={0.28}
          intensity={1.15}
          radius={0.74}
        />
        <Vignette eskil={false} offset={0.22} darkness={0.52} />
      </EffectComposer>
    </>
  );
};

export const StarlightScene: React.FC<StarlightSceneProps> = (props) => {
  return (
    <div className="canvas-stage">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.4, 14.2], fov: 44, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <SceneOrchestrator {...props} />
      </Canvas>
    </div>
  );
};
