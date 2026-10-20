// Escenas 3D con los mismos modelos de la web: el tomate de la portada (tomato.glb) y la habitación (shelf.glb).
// La iluminación imita js/home-tomato.js y js/room.js. Todo se mueve según el número de fotograma, nunca con el reloj.
import React, {useEffect, useMemo, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {asset} from './lib';

// Carga un .glb una sola vez y para el render hasta que está cargado Y dibujado (ver <Drawn>).
const cache = new Map<string, Promise<THREE.Group>>();
const useGLB = (path: string) => {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender(`Cargando ${path}`, {timeoutInMilliseconds: 120000}));
  useEffect(() => {
    if (!cache.has(path)) {
      cache.set(path, new GLTFLoader().loadAsync(asset(path)).then((g) => g.scene));
    }
    cache.get(path)!.then((scene) => setModel(scene.clone(true)));
  }, [path]);
  return {model, handle};
};

// Dentro del lienzo: cuando el modelo ya está en la escena, fuerza un dibujado y deja seguir al render.
const Drawn: React.FC<{handle: number}> = ({handle}) => {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    advance(performance.now());
    requestAnimationFrame(() => requestAnimationFrame(() => continueRender(handle)));
  }, [advance, handle]);
  return null;
};

// Centra el modelo y lo deja de 1 unidad de alto (como en la portada).
const normalized = (model: THREE.Object3D) => {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.position.sub(box.getCenter(new THREE.Vector3()));
  const holder = new THREE.Group();
  holder.add(model);
  holder.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
  return holder;
};

// ─────────────────────────────────────────────────────────────
// Tomate que gira con el anillo "MARIO DIZ" alrededor (girando al revés), como en la portada.
// spin: vueltas acumuladas en función del fotograma; lo calcula la escena para poder acelerar en los golpes.
// ─────────────────────────────────────────────────────────────
const ringTexture = () => {
  const c = document.createElement('canvas');
  c.width = 3200;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.font = '700 92px "Helvetica Neue", Arial, "Liberation Sans", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('MARIO DIZ', c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

export const Tomato3D: React.FC<{spin: number; ringSpin?: number; scale?: number; y?: number; tilt?: number; ring?: boolean}> = ({
  spin, ringSpin = -spin * 0.6, scale = 3.2, y = 0, tilt = 0, ring = true,
}) => {
  const {width, height} = useVideoConfig();
  const {model, handle} = useGLB('models/tomato.glb');
  const holder = useMemo(() => (model ? normalized(model) : null), [model]);
  const tex = useMemo(ringTexture, []);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.6, 0.6, 0.15, 128, 1, true), []);
  return (
    <ThreeCanvas width={width} height={height} camera={{fov: 35, position: [0, 0, 10]}} gl={{alpha: true, antialias: true}} style={{position: 'absolute', inset: 0}}>
      <group position={[0, y, 0]} scale={scale}>
        <group rotation={[tilt, spin * Math.PI * 2, 0]}>{holder && <primitive object={holder} />}</group>
        {holder && <Drawn handle={handle} />}
        {ring && (
          <group rotation={[0.32, 0, -0.12]}>
            <group rotation={[0, ringSpin * Math.PI * 2, 0]}>
              <mesh geometry={geo} renderOrder={0}>
                <meshBasicMaterial map={tex} side={THREE.BackSide} transparent opacity={0.35} depthWrite={false} />
              </mesh>
              <mesh geometry={geo} renderOrder={2}>
                <meshBasicMaterial map={tex} side={THREE.FrontSide} transparent depthWrite={false} />
              </mesh>
            </group>
          </group>
        )}
      </group>
    </ThreeCanvas>
  );
};

// ─────────────────────────────────────────────────────────────
// La habitación: luz cálida de atardecer, contraluz frío y la lámpara-tomate que se enciende con parpadeo.
// ─────────────────────────────────────────────────────────────
const RoomScene: React.FC<{model: THREE.Group; frame: number; lampOn: number; dur: number}> = ({model, frame, lampOn, dur}) => {
  const {box, size, mid, lamp} = useMemo(() => {
    let tomatoMesh: THREE.Mesh | null = null;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        if ('envMapIntensity' in mat) (mat as THREE.MeshStandardMaterial).envMapIntensity = 0.04;
      });
      if (/tomato/i.test(m.name) && !tomatoMesh) tomatoMesh = m;
    });
    const b = new THREE.Box3().setFromObject(model);
    const s = b.getSize(new THREE.Vector3());
    const c = b.getCenter(new THREE.Vector3());
    let lampPos = c.clone().add(new THREE.Vector3(0, 0, s.z * 0.6));
    if (tomatoMesh) lampPos = new THREE.Box3().setFromObject(tomatoMesh).getCenter(new THREE.Vector3()).add(new THREE.Vector3(0, 0.02, 0.12));
    return {box: b, size: s, mid: c, lamp: lampPos};
  }, [model]);

  // La cámara se acerca despacio y gira un poco: travelling de cine.
  const p = Math.min(1, frame / dur);
  const e = 1 - Math.pow(1 - p, 3);
  const dist = Math.max(size.x, size.y) * (1.3 - e * 0.35);
  const angle = -0.35 + e * 0.5;
  const camPos = new THREE.Vector3(mid.x + Math.sin(angle) * dist, mid.y + size.y * 0.08, mid.z + Math.cos(angle) * dist);

  // Parpadeo determinista de la lámpara al encenderse
  const flicker = lampOn <= 0 ? 0 : lampOn >= 1 ? 1 : [0.2, 0.9, 0.1, 0.7, 0.3, 1][Math.floor(lampOn * 6)];

  return (
    <>
      <CameraRig position={camPos} target={mid} />
      <hemisphereLight args={[0xffd2a8, 0x1a0f0a, 0.07]} />
      <directionalLight color={0xffb27a} intensity={0.12} position={[-4, 5, 6]} />
      <directionalLight color={0x7fa6ff} intensity={0.3} position={[4, 3, -2]} />
      <spotLight
        color={0xff9a52}
        intensity={4 * size.y * size.y}
        angle={Math.PI / 16}
        penumbra={0.6}
        decay={1.4}
        position={[mid.x - size.x * 1.6, mid.y + size.y * 0.55, mid.z + size.z * 1.8]}
        target-position={[mid.x + size.x * 0.15, mid.y + size.y * 0.12, box.min.z]}
      />
      <pointLight color={0xff8a45} intensity={4.3 * flicker} decay={2} position={lamp.toArray()} />
      <primitive object={model} />
    </>
  );
};

const CameraRig: React.FC<{position: THREE.Vector3; target: THREE.Vector3}> = ({position, target}) => {
  // La cámara por defecto se recoloca en cada fotograma
  const camera = useThree((s) => s.camera);
  camera.position.copy(position);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  return null;
};

export const Room3D: React.FC<{dur: number; lampAt: number}> = ({dur, lampAt}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const {model, handle} = useGLB('room/shelf.glb');
  const lampOn = (frame - lampAt) / 8;
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{fov: 35, near: 0.01, far: 1000}}
      gl={{antialias: true}}
      onCreated={({gl, scene}) => {
        gl.toneMapping = THREE.AgXToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        scene.background = new THREE.Color('#140d09');
        const pm = new THREE.PMREMGenerator(gl);
        scene.environment = pm.fromScene(new RoomEnvironment(gl)).texture;
        pm.dispose();
      }}
      style={{position: 'absolute', inset: 0}}
    >
      {model && <RoomScene model={model} frame={frame} lampOn={lampOn} dur={dur} />}
      {model && <Drawn handle={handle} />}
    </ThreeCanvas>
  );
};
