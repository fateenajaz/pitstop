import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_ASSETS = {
  sedan: '/sedan.glb',
  suv: '/suv.glb',
};

const MODEL_CONFIG = {
  sedan: {
    scaleMultiplier: 1,
    rotationX: 0,
    rotationY: -Math.PI / 4,
    rotationZ: 0,
    camera: { x: 4.8, y: 2.7, z: 4.8 },
    lookAt: { x: 0, y: 0.5, z: 0 },
  },
  suv: {
    scaleMultiplier: 1.15,
    rotationX: 0,
    rotationY: -Math.PI / 4,
    rotationZ: 0,
    camera: { x: 5.4, y: 3.1, z: 5.4 },
    lookAt: { x: 0, y: 0.7, z: 0 },
  },
};

const VIEW_FOCUS = {
  front: { lookAt: { x: 1.18, y: 0.44, z: 0 }, zoom: 1.14, marker: { x: 1.32, y: 0.4, z: 0 } },
  rear: { lookAt: { x: -1.18, y: 0.42, z: 0 }, zoom: 1.14, marker: { x: -1.32, y: 0.38, z: 0 } },
  left: { lookAt: { x: 0, y: 0.45, z: 0.82 }, zoom: 1.06, marker: { x: 0, y: 0.42, z: 0.96 } },
  right: { lookAt: { x: 0, y: 0.45, z: -0.82 }, zoom: 1.06, marker: { x: 0, y: 0.42, z: -0.96 } },
  top: { lookAt: { x: 0, y: 0.96, z: 0 }, zoom: 1.2, marker: { x: 0, y: 1.04, z: 0 } },
  underbody: { lookAt: { x: 0, y: -0.16, z: 0 }, zoom: 1.22, marker: { x: 0, y: -0.18, z: 0 } },
  wheel_closeup: { lookAt: { x: 0.72, y: 0.16, z: 0.84 }, zoom: 1.44, marker: { x: 0.8, y: 0.13, z: 0.98 } },
  front_left: { lookAt: { x: 0.92, y: 0.3, z: 0.74 }, zoom: 1.26, marker: { x: 1.04, y: 0.26, z: 0.9 } },
  front_right: { lookAt: { x: 0.92, y: 0.3, z: -0.74 }, zoom: 1.26, marker: { x: 1.04, y: 0.26, z: -0.9 } },
  rear_left: { lookAt: { x: -0.92, y: 0.3, z: 0.74 }, zoom: 1.26, marker: { x: -1.04, y: 0.26, z: 0.9 } },
  rear_right: { lookAt: { x: -0.92, y: 0.3, z: -0.74 }, zoom: 1.26, marker: { x: -1.04, y: 0.26, z: -0.9 } },
};

const MODEL_HOTSPOTS = {
  sedan: {
    engine_bay: { lookAt: { x: 1.08, y: 0.52, z: 0 }, zoom: 1.24, marker: { x: 1.18, y: 0.55, z: 0 } },
    radiator_front: { lookAt: { x: 1.28, y: 0.32, z: 0 }, zoom: 1.3, marker: { x: 1.38, y: 0.3, z: 0 } },
    battery_area: { lookAt: { x: 0.84, y: 0.56, z: -0.24 }, zoom: 1.28, marker: { x: 0.9, y: 0.58, z: -0.24 } },
    front_left_brake: { lookAt: { x: 0.92, y: 0.18, z: 0.76 }, zoom: 1.58, marker: { x: 1.0, y: 0.14, z: 0.92 } },
    front_right_brake: { lookAt: { x: 0.92, y: 0.18, z: -0.76 }, zoom: 1.58, marker: { x: 1.0, y: 0.14, z: -0.92 } },
    rear_left_suspension: { lookAt: { x: -0.92, y: 0.18, z: 0.72 }, zoom: 1.52, marker: { x: -1.0, y: 0.16, z: 0.88 } },
    rear_right_suspension: { lookAt: { x: -0.92, y: 0.18, z: -0.72 }, zoom: 1.52, marker: { x: -1.0, y: 0.16, z: -0.88 } },
    underbody_mid: { lookAt: { x: 0.02, y: -0.14, z: 0 }, zoom: 1.3, marker: { x: 0.02, y: -0.16, z: 0 } },
    exhaust_rear: { lookAt: { x: -1.18, y: 0.08, z: -0.28 }, zoom: 1.45, marker: { x: -1.28, y: 0.06, z: -0.32 } },
    roof_center: { lookAt: { x: 0, y: 0.96, z: 0 }, zoom: 1.16, marker: { x: 0, y: 1.04, z: 0 } },
  },
  suv: {
    engine_bay: { lookAt: { x: 1.02, y: 0.68, z: 0 }, zoom: 1.2, marker: { x: 1.12, y: 0.7, z: 0 } },
    radiator_front: { lookAt: { x: 1.2, y: 0.42, z: 0 }, zoom: 1.26, marker: { x: 1.34, y: 0.38, z: 0 } },
    battery_area: { lookAt: { x: 0.72, y: 0.74, z: -0.24 }, zoom: 1.26, marker: { x: 0.8, y: 0.78, z: -0.24 } },
    front_left_brake: { lookAt: { x: 0.82, y: 0.26, z: 0.82 }, zoom: 1.56, marker: { x: 0.9, y: 0.22, z: 0.98 } },
    front_right_brake: { lookAt: { x: 0.82, y: 0.26, z: -0.82 }, zoom: 1.56, marker: { x: 0.9, y: 0.22, z: -0.98 } },
    rear_left_suspension: { lookAt: { x: -0.88, y: 0.24, z: 0.8 }, zoom: 1.5, marker: { x: -0.96, y: 0.2, z: 0.96 } },
    rear_right_suspension: { lookAt: { x: -0.88, y: 0.24, z: -0.8 }, zoom: 1.5, marker: { x: -0.96, y: 0.2, z: -0.96 } },
    underbody_mid: { lookAt: { x: 0.02, y: -0.04, z: 0 }, zoom: 1.28, marker: { x: 0.02, y: -0.06, z: 0 } },
    exhaust_rear: { lookAt: { x: -1.08, y: 0.14, z: -0.32 }, zoom: 1.4, marker: { x: -1.2, y: 0.1, z: -0.36 } },
    roof_center: { lookAt: { x: 0, y: 1.08, z: 0 }, zoom: 1.12, marker: { x: 0, y: 1.16, z: 0 } },
  },
};

function inferHotspotId(guidance, type) {
  if (!guidance || typeof guidance !== 'object') return null;
  if (typeof guidance.hotspotId === 'string' && MODEL_HOTSPOTS[type]?.[guidance.hotspotId]) {
    return guidance.hotspotId;
  }

  const text = [
    guidance.focusArea,
    guidance.headline,
    guidance.captureHint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/(battery|terminal|positive lead|negative lead)/.test(text)) return 'battery_area';
  if (/(engine|hood|bonnet|spark|coil)/.test(text)) return 'engine_bay';
  if (/(radiator|coolant|grille|front bumper)/.test(text)) return 'radiator_front';
  if (/(exhaust|muffler|tailpipe)/.test(text)) return 'exhaust_rear';
  if (/(underbody|underside|chassis|subframe)/.test(text)) return 'underbody_mid';
  if (/(roof|sunroof)/.test(text)) return 'roof_center';
  if (/(rear.*(left|driver)|left.*rear).*(suspension|shock|strut|wheel|brake)/.test(text)) return 'rear_left_suspension';
  if (/(rear.*(right|passenger)|right.*rear).*(suspension|shock|strut|wheel|brake)/.test(text)) return 'rear_right_suspension';
  if (/(front.*(right|passenger)|right.*front).*(wheel|brake|tire|tyre|rim|hub)/.test(text)) return 'front_right_brake';
  if (/(front.*(left|driver)|left.*front).*(wheel|brake|tire|tyre|rim|hub)/.test(text)) return 'front_left_brake';
  if (/(brake|wheel|tire|tyre|rim|hub)/.test(text)) {
    if (guidance.targetView === 'front_right' || guidance.targetView === 'rear_right' || /\b(right|passenger)\b/.test(text)) {
      return guidance.targetView === 'rear_right' ? 'rear_right_suspension' : 'front_right_brake';
    }
    if (guidance.targetView === 'rear_left' || /\brear\b/.test(text)) return 'rear_left_suspension';
    return 'front_left_brake';
  }

  return null;
}

function resolveFocus(guidance, type, config) {
  const hotspotId = inferHotspotId(guidance, type);
  if (hotspotId && MODEL_HOTSPOTS[type]?.[hotspotId]) {
    return MODEL_HOTSPOTS[type][hotspotId];
  }

  const targetView = guidance?.targetView;
  return VIEW_FOCUS[targetView] || { lookAt: config.lookAt, zoom: 1, marker: null };
}

function inferModelUrl(type, modelAsset) {
  if (typeof modelAsset === 'string' && modelAsset.trim()) return modelAsset.trim();
  return MODEL_ASSETS[type] || null;
}

function createLoader(url) {
  if (!url) return null;
  if (url.toLowerCase().endsWith('.glb') || url.toLowerCase().endsWith('.gltf')) return new GLTFLoader();
  return null;
}

function fitObjectToScene(object, config) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  const scale = (2.8 / maxDimension) * (config.scaleMultiplier || 1);

  object.position.sub(center);
  object.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(object);
  const minY = scaledBox.min.y;
  object.position.y -= minY + 0.72;
}

export default function ThreeCarAssetModel({
  type = 'sedan',
  modelAsset = null,
  width,
  height,
  rotateY = 0,
  rotateX = 0,
  guidance = null,
  isAlert = false,
  onError,
}) {
  const canvasRef = useRef(null);
  const rotationRef = useRef({ rotateX, rotateY });
  const modelLoadedRef = useRef(false);
  const guidanceRef = useRef(guidance);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    rotationRef.current = { rotateX, rotateY };
  }, [rotateX, rotateY]);

  useEffect(() => {
    guidanceRef.current = guidance;
  }, [guidance]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const modelUrl = inferModelUrl(type, modelAsset);
    if (!canvas || !modelUrl) return undefined;

    const loader = createLoader(modelUrl);
    if (!loader) {
      onErrorRef.current?.(new Error(`Unsupported model asset: ${modelUrl}`));
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const config = MODEL_CONFIG[type] || MODEL_CONFIG.sedan;
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(config.camera.x, config.camera.y, config.camera.z);
    camera.lookAt(config.lookAt.x, config.lookAt.y, config.lookAt.z);

    scene.add(new THREE.AmbientLight(0xffffff, 2));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(7, 8, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.1);
    fillLight.position.set(-6, 3, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(isAlert ? 0xef4444 : 0xffffff, isAlert ? 1.5 : 0.7);
    rimLight.position.set(-5, 5, -6);
    scene.add(rimLight);

    const floorShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.9, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }),
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.scale.set(1.08, 0.52, 1);
    floorShadow.position.y = -0.72;
    scene.add(floorShadow);

    const root = new THREE.Group();
    scene.add(root);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0 }),
    );
    root.add(marker);

    let disposed = false;
    let animationFrameId = 0;
    let pulse = 0;

    const renderFrame = () => {
      if (modelLoadedRef.current) {
        const focus = resolveFocus(guidanceRef.current, type, config);
        const zoom = focus?.zoom || 1;
        const lookAt = focus?.lookAt || config.lookAt;

        root.rotation.y = Math.PI / 4 + (rotationRef.current.rotateY * Math.PI / 180);
        root.rotation.x = rotationRef.current.rotateX * Math.PI / 180;

        camera.position.set(
          config.camera.x / zoom,
          config.camera.y / zoom,
          config.camera.z / zoom,
        );
        camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

        if (focus?.marker) {
          pulse += 0.08;
          marker.visible = true;
          marker.position.set(focus.marker.x, focus.marker.y, focus.marker.z);
          marker.material.opacity = 0.45 + ((Math.sin(pulse) + 1) * 0.18);
          const scale = 1 + ((Math.sin(pulse) + 1) * 0.12);
          marker.scale.setScalar(scale);
        } else {
          marker.visible = false;
          marker.material.opacity = 0;
        }
      }
      try {
        renderer.render(scene, camera);
      } catch (error) {
        if (!disposed) onErrorRef.current?.(error);
      }
      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    loader.load(
      modelUrl,
      (loaded) => {
        if (disposed) return;

        try {
          const object = loaded?.scene || loaded;
          object.rotation.x += config.rotationX || 0;
          object.rotation.y += config.rotationY || 0;
          object.rotation.z += config.rotationZ || 0;

          object.traverse((node) => {
            if (!node.isMesh) return;
            node.castShadow = false;
            node.receiveShadow = false;

            if (!node.geometry.attributes.normal) {
              node.geometry.computeVertexNormals();
            }

            const materials = node.material
              ? (Array.isArray(node.material) ? node.material : [node.material])
              : [new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.2, roughness: 0.7 })];

            materials.forEach((material) => {
              if ('side' in material) material.side = THREE.DoubleSide;
              if ('transparent' in material) material.transparent = material.opacity < 1;
            });

            node.material = Array.isArray(node.material) ? materials : materials[0];
          });

          fitObjectToScene(object, config);
          root.add(object);
          modelLoadedRef.current = true;
        } catch (error) {
          if (!disposed) onErrorRef.current?.(error);
        }
      },
      undefined,
      (error) => {
        if (!disposed) onErrorRef.current?.(error);
      },
    );

    renderFrame();

    return () => {
      disposed = true;
      modelLoadedRef.current = false;
      window.cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      scene.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, [height, isAlert, modelAsset, type, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
