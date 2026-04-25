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
  front: { lookAt: { x: 1.18, y: 0.44, z: 0 }, zoom: 1.14, marker: { x: 1.32, y: 0.4, z: 0 }, rotationY: 45 },
  rear: { lookAt: { x: -1.18, y: 0.42, z: 0 }, zoom: 1.14, marker: { x: -1.32, y: 0.38, z: 0 }, rotationY: -135 },
  left: { lookAt: { x: 0, y: 0.45, z: 0.82 }, zoom: 1.06, marker: { x: 0, y: 0.42, z: 0.96 }, rotationY: 0 },
  right: { lookAt: { x: 0, y: 0.45, z: -0.82 }, zoom: 1.06, marker: { x: 0, y: 0.42, z: -0.96 }, rotationY: 180 },
  top: { lookAt: { x: 0, y: 0.96, z: 0 }, zoom: 1.2, marker: { x: 0, y: 1.04, z: 0 }, rotationY: 45 },
  underbody: { lookAt: { x: 0, y: -0.16, z: 0 }, zoom: 1.22, marker: { x: 0, y: -0.18, z: 0 }, rotationY: 45 },
  wheel_closeup: { lookAt: { x: 0.72, y: 0.16, z: 0.84 }, zoom: 1.5, marker: { x: 0.8, y: 0.13, z: 0.98 }, rotationY: 18 },
  front_left: { lookAt: { x: 0.92, y: 0.3, z: 0.74 }, zoom: 1.32, marker: { x: 1.04, y: 0.26, z: 0.9 }, rotationY: 18 },
  front_right: { lookAt: { x: 0.92, y: 0.3, z: -0.74 }, zoom: 1.32, marker: { x: 1.04, y: 0.26, z: -0.9 }, rotationY: 112 },
  rear_left: { lookAt: { x: -0.92, y: 0.3, z: 0.74 }, zoom: 1.32, marker: { x: -1.04, y: 0.26, z: 0.9 }, rotationY: -28 },
  rear_right: { lookAt: { x: -0.92, y: 0.3, z: -0.74 }, zoom: 1.32, marker: { x: -1.04, y: 0.26, z: -0.9 }, rotationY: 208 },
};

const MODEL_HOTSPOTS = {
  sedan: {
    engine_bay: { lookAt: { x: 1.02, y: 0.62, z: 0 }, zoom: 1.28, marker: { x: 1.12, y: 0.65, z: 0 }, rotationY: 42 },
    battery_area: { lookAt: { x: 0.82, y: 0.62, z: -0.28 }, zoom: 1.42, marker: { x: 0.9, y: 0.64, z: -0.3 }, rotationY: 70 },
    coolant_reservoir: { lookAt: { x: 0.92, y: 0.58, z: 0.28 }, zoom: 1.42, marker: { x: 1.0, y: 0.6, z: 0.3 }, rotationY: 20 },
    oil_dipstick: { lookAt: { x: 0.78, y: 0.6, z: 0.04 }, zoom: 1.48, marker: { x: 0.82, y: 0.64, z: 0.04 }, rotationY: 42 },
    engine_oil_cap: { lookAt: { x: 0.72, y: 0.68, z: 0.02 }, zoom: 1.46, marker: { x: 0.75, y: 0.72, z: 0.02 }, rotationY: 42 },
    air_filter_box: { lookAt: { x: 0.7, y: 0.58, z: -0.42 }, zoom: 1.4, marker: { x: 0.76, y: 0.6, z: -0.44 }, rotationY: 74 },
    radiator_front: { lookAt: { x: 1.3, y: 0.32, z: 0 }, zoom: 1.34, marker: { x: 1.4, y: 0.3, z: 0 }, rotationY: 45 },
    front_bumper: { lookAt: { x: 1.34, y: 0.28, z: 0 }, zoom: 1.22, marker: { x: 1.44, y: 0.26, z: 0 }, rotationY: 45 },
    rear_bumper: { lookAt: { x: -1.28, y: 0.26, z: 0 }, zoom: 1.22, marker: { x: -1.4, y: 0.24, z: 0 }, rotationY: -135 },
    left_body_panel: { lookAt: { x: 0, y: 0.42, z: 0.86 }, zoom: 1.16, marker: { x: 0, y: 0.42, z: 1.02 }, rotationY: 0 },
    right_body_panel: { lookAt: { x: 0, y: 0.42, z: -0.86 }, zoom: 1.16, marker: { x: 0, y: 0.42, z: -1.02 }, rotationY: 180 },
    driver_door: { lookAt: { x: 0.04, y: 0.52, z: 0.9 }, zoom: 1.28, marker: { x: 0.04, y: 0.5, z: 1.04 }, rotationY: 0 },
    passenger_door: { lookAt: { x: 0.04, y: 0.52, z: -0.9 }, zoom: 1.28, marker: { x: 0.04, y: 0.5, z: -1.04 }, rotationY: 180 },
    windshield: { lookAt: { x: 0.48, y: 0.78, z: 0 }, zoom: 1.3, marker: { x: 0.55, y: 0.84, z: 0 }, rotationY: 45 },
    roof_center: { lookAt: { x: 0, y: 0.98, z: 0 }, zoom: 1.18, marker: { x: 0, y: 1.06, z: 0 }, rotationY: 45 },
    trunk_area: { lookAt: { x: -0.86, y: 0.52, z: 0 }, zoom: 1.26, marker: { x: -1.0, y: 0.52, z: 0 }, rotationY: -135 },
    exhaust_rear: { lookAt: { x: -1.18, y: 0.08, z: -0.32 }, zoom: 1.48, marker: { x: -1.3, y: 0.06, z: -0.36 }, rotationY: -150 },
    underbody_front: { lookAt: { x: 0.78, y: -0.16, z: 0 }, zoom: 1.42, marker: { x: 0.78, y: -0.2, z: 0 }, rotationY: 45 },
    underbody_mid: { lookAt: { x: 0.02, y: -0.14, z: 0 }, zoom: 1.34, marker: { x: 0.02, y: -0.18, z: 0 }, rotationY: 45 },
    underbody_rear: { lookAt: { x: -0.78, y: -0.14, z: 0 }, zoom: 1.42, marker: { x: -0.78, y: -0.18, z: 0 }, rotationY: -135 },
    front_left_tire: { lookAt: { x: 0.92, y: 0.14, z: 0.78 }, zoom: 1.58, marker: { x: 1.02, y: 0.12, z: 0.94 }, rotationY: 18 },
    front_right_tire: { lookAt: { x: 0.92, y: 0.14, z: -0.78 }, zoom: 1.58, marker: { x: 1.02, y: 0.12, z: -0.94 }, rotationY: 112 },
    rear_left_tire: { lookAt: { x: -0.92, y: 0.14, z: 0.76 }, zoom: 1.58, marker: { x: -1.02, y: 0.12, z: 0.92 }, rotationY: -28 },
    rear_right_tire: { lookAt: { x: -0.92, y: 0.14, z: -0.76 }, zoom: 1.58, marker: { x: -1.02, y: 0.12, z: -0.92 }, rotationY: 208 },
    front_left_brake: { lookAt: { x: 0.92, y: 0.18, z: 0.76 }, zoom: 1.7, marker: { x: 1.0, y: 0.14, z: 0.92 }, rotationY: 18 },
    front_right_brake: { lookAt: { x: 0.92, y: 0.18, z: -0.76 }, zoom: 1.7, marker: { x: 1.0, y: 0.14, z: -0.92 }, rotationY: 112 },
    rear_left_brake: { lookAt: { x: -0.92, y: 0.18, z: 0.74 }, zoom: 1.68, marker: { x: -1.0, y: 0.14, z: 0.9 }, rotationY: -28 },
    rear_right_brake: { lookAt: { x: -0.92, y: 0.18, z: -0.74 }, zoom: 1.68, marker: { x: -1.0, y: 0.14, z: -0.9 }, rotationY: 208 },
    front_left_suspension: { lookAt: { x: 0.82, y: 0.26, z: 0.72 }, zoom: 1.56, marker: { x: 0.9, y: 0.28, z: 0.88 }, rotationY: 18 },
    front_right_suspension: { lookAt: { x: 0.82, y: 0.26, z: -0.72 }, zoom: 1.56, marker: { x: 0.9, y: 0.28, z: -0.88 }, rotationY: 112 },
    rear_left_suspension: { lookAt: { x: -0.92, y: 0.2, z: 0.72 }, zoom: 1.56, marker: { x: -1.0, y: 0.18, z: 0.88 }, rotationY: -28 },
    rear_right_suspension: { lookAt: { x: -0.92, y: 0.2, z: -0.72 }, zoom: 1.56, marker: { x: -1.0, y: 0.18, z: -0.88 }, rotationY: 208 },
  },
  suv: {
    engine_bay: { lookAt: { x: 1.02, y: 0.74, z: 0 }, zoom: 1.26, marker: { x: 1.12, y: 0.76, z: 0 }, rotationY: 42 },
    battery_area: { lookAt: { x: 0.72, y: 0.76, z: -0.26 }, zoom: 1.4, marker: { x: 0.8, y: 0.8, z: -0.28 }, rotationY: 70 },
    coolant_reservoir: { lookAt: { x: 0.88, y: 0.72, z: 0.3 }, zoom: 1.4, marker: { x: 0.96, y: 0.74, z: 0.32 }, rotationY: 20 },
    oil_dipstick: { lookAt: { x: 0.72, y: 0.76, z: 0.04 }, zoom: 1.46, marker: { x: 0.76, y: 0.8, z: 0.04 }, rotationY: 42 },
    engine_oil_cap: { lookAt: { x: 0.66, y: 0.82, z: 0.02 }, zoom: 1.44, marker: { x: 0.7, y: 0.86, z: 0.02 }, rotationY: 42 },
    air_filter_box: { lookAt: { x: 0.64, y: 0.72, z: -0.44 }, zoom: 1.38, marker: { x: 0.7, y: 0.74, z: -0.46 }, rotationY: 74 },
    radiator_front: { lookAt: { x: 1.2, y: 0.42, z: 0 }, zoom: 1.3, marker: { x: 1.34, y: 0.38, z: 0 }, rotationY: 45 },
    front_bumper: { lookAt: { x: 1.28, y: 0.36, z: 0 }, zoom: 1.2, marker: { x: 1.42, y: 0.32, z: 0 }, rotationY: 45 },
    rear_bumper: { lookAt: { x: -1.18, y: 0.34, z: 0 }, zoom: 1.2, marker: { x: -1.34, y: 0.3, z: 0 }, rotationY: -135 },
    left_body_panel: { lookAt: { x: 0, y: 0.55, z: 0.9 }, zoom: 1.14, marker: { x: 0, y: 0.52, z: 1.06 }, rotationY: 0 },
    right_body_panel: { lookAt: { x: 0, y: 0.55, z: -0.9 }, zoom: 1.14, marker: { x: 0, y: 0.52, z: -1.06 }, rotationY: 180 },
    driver_door: { lookAt: { x: 0.02, y: 0.62, z: 0.92 }, zoom: 1.26, marker: { x: 0.02, y: 0.6, z: 1.08 }, rotationY: 0 },
    passenger_door: { lookAt: { x: 0.02, y: 0.62, z: -0.92 }, zoom: 1.26, marker: { x: 0.02, y: 0.6, z: -1.08 }, rotationY: 180 },
    windshield: { lookAt: { x: 0.44, y: 0.9, z: 0 }, zoom: 1.28, marker: { x: 0.5, y: 0.96, z: 0 }, rotationY: 45 },
    roof_center: { lookAt: { x: 0, y: 1.1, z: 0 }, zoom: 1.14, marker: { x: 0, y: 1.18, z: 0 }, rotationY: 45 },
    trunk_area: { lookAt: { x: -0.78, y: 0.68, z: 0 }, zoom: 1.24, marker: { x: -0.92, y: 0.68, z: 0 }, rotationY: -135 },
    exhaust_rear: { lookAt: { x: -1.08, y: 0.14, z: -0.34 }, zoom: 1.44, marker: { x: -1.22, y: 0.1, z: -0.38 }, rotationY: -150 },
    underbody_front: { lookAt: { x: 0.72, y: -0.04, z: 0 }, zoom: 1.4, marker: { x: 0.72, y: -0.08, z: 0 }, rotationY: 45 },
    underbody_mid: { lookAt: { x: 0.02, y: -0.04, z: 0 }, zoom: 1.3, marker: { x: 0.02, y: -0.08, z: 0 }, rotationY: 45 },
    underbody_rear: { lookAt: { x: -0.72, y: -0.04, z: 0 }, zoom: 1.4, marker: { x: -0.72, y: -0.08, z: 0 }, rotationY: -135 },
    front_left_tire: { lookAt: { x: 0.82, y: 0.22, z: 0.84 }, zoom: 1.58, marker: { x: 0.92, y: 0.2, z: 1.0 }, rotationY: 18 },
    front_right_tire: { lookAt: { x: 0.82, y: 0.22, z: -0.84 }, zoom: 1.58, marker: { x: 0.92, y: 0.2, z: -1.0 }, rotationY: 112 },
    rear_left_tire: { lookAt: { x: -0.88, y: 0.22, z: 0.82 }, zoom: 1.58, marker: { x: -0.98, y: 0.2, z: 0.98 }, rotationY: -28 },
    rear_right_tire: { lookAt: { x: -0.88, y: 0.22, z: -0.82 }, zoom: 1.58, marker: { x: -0.98, y: 0.2, z: -0.98 }, rotationY: 208 },
    front_left_brake: { lookAt: { x: 0.82, y: 0.26, z: 0.82 }, zoom: 1.7, marker: { x: 0.9, y: 0.22, z: 0.98 }, rotationY: 18 },
    front_right_brake: { lookAt: { x: 0.82, y: 0.26, z: -0.82 }, zoom: 1.7, marker: { x: 0.9, y: 0.22, z: -0.98 }, rotationY: 112 },
    rear_left_brake: { lookAt: { x: -0.88, y: 0.26, z: 0.8 }, zoom: 1.66, marker: { x: -0.96, y: 0.22, z: 0.96 }, rotationY: -28 },
    rear_right_brake: { lookAt: { x: -0.88, y: 0.26, z: -0.8 }, zoom: 1.66, marker: { x: -0.96, y: 0.22, z: -0.96 }, rotationY: 208 },
    front_left_suspension: { lookAt: { x: 0.74, y: 0.36, z: 0.78 }, zoom: 1.54, marker: { x: 0.82, y: 0.34, z: 0.94 }, rotationY: 18 },
    front_right_suspension: { lookAt: { x: 0.74, y: 0.36, z: -0.78 }, zoom: 1.54, marker: { x: 0.82, y: 0.34, z: -0.94 }, rotationY: 112 },
    rear_left_suspension: { lookAt: { x: -0.88, y: 0.28, z: 0.8 }, zoom: 1.54, marker: { x: -0.96, y: 0.24, z: 0.96 }, rotationY: -28 },
    rear_right_suspension: { lookAt: { x: -0.88, y: 0.28, z: -0.8 }, zoom: 1.54, marker: { x: -0.96, y: 0.24, z: -0.96 }, rotationY: 208 },
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
  if (/(coolant|reservoir|overflow tank)/.test(text)) return 'coolant_reservoir';
  if (/(dipstick|oil level)/.test(text)) return 'oil_dipstick';
  if (/(oil cap|filler cap|engine oil)/.test(text)) return 'engine_oil_cap';
  if (/(air filter|intake box|filter box)/.test(text)) return 'air_filter_box';
  if (/(engine|hood|bonnet|spark|coil)/.test(text)) return 'engine_bay';
  if (/(radiator|grille)/.test(text)) return 'radiator_front';
  if (/(exhaust|muffler|tailpipe)/.test(text)) return 'exhaust_rear';
  if (/(front).*(underbody|underside|chassis|subframe)/.test(text)) return 'underbody_front';
  if (/(rear|back).*(underbody|underside|chassis|subframe)/.test(text)) return 'underbody_rear';
  if (/(underbody|underside|chassis|subframe)/.test(text)) return 'underbody_mid';
  if (/(roof|sunroof)/.test(text)) return 'roof_center';
  if (/(windshield|windscreen|front glass)/.test(text)) return 'windshield';
  if (/(trunk|boot|tailgate)/.test(text)) return 'trunk_area';
  if (/(front bumper|front fascia)/.test(text)) return 'front_bumper';
  if (/(rear bumper|back bumper)/.test(text)) return 'rear_bumper';
  if (/(driver door|driver side door)/.test(text)) return 'driver_door';
  if (/(passenger door|passenger side door)/.test(text)) return 'passenger_door';
  if (/(left|driver).*(panel|body|fender|door)/.test(text)) return 'left_body_panel';
  if (/(right|passenger).*(panel|body|fender|door)/.test(text)) return 'right_body_panel';
  if (/(rear.*(left|driver)|left.*rear).*(brake|rotor|caliper|pad)/.test(text)) return 'rear_left_brake';
  if (/(rear.*(right|passenger)|right.*rear).*(brake|rotor|caliper|pad)/.test(text)) return 'rear_right_brake';
  if (/(front.*(right|passenger)|right.*front).*(brake|rotor|caliper|pad)/.test(text)) return 'front_right_brake';
  if (/(front.*(left|driver)|left.*front).*(brake|rotor|caliper|pad)/.test(text)) return 'front_left_brake';
  if (/(rear.*(left|driver)|left.*rear).*(suspension|shock|strut|spring|control arm)/.test(text)) return 'rear_left_suspension';
  if (/(rear.*(right|passenger)|right.*rear).*(suspension|shock|strut|spring|control arm)/.test(text)) return 'rear_right_suspension';
  if (/(front.*(right|passenger)|right.*front).*(suspension|shock|strut|spring|control arm)/.test(text)) return 'front_right_suspension';
  if (/(front.*(left|driver)|left.*front).*(suspension|shock|strut|spring|control arm)/.test(text)) return 'front_left_suspension';
  if (/(rear.*(left|driver)|left.*rear).*(wheel|tire|tyre|rim|hub)/.test(text)) return 'rear_left_tire';
  if (/(rear.*(right|passenger)|right.*rear).*(wheel|tire|tyre|rim|hub)/.test(text)) return 'rear_right_tire';
  if (/(front.*(right|passenger)|right.*front).*(wheel|tire|tyre|rim|hub)/.test(text)) return 'front_right_tire';
  if (/(front.*(left|driver)|left.*front).*(wheel|tire|tyre|rim|hub)/.test(text)) return 'front_left_tire';
  if (/(brake|rotor|caliper|pad)/.test(text)) {
    if (guidance.targetView === 'front_right' || guidance.targetView === 'rear_right' || /\b(right|passenger)\b/.test(text)) {
      return guidance.targetView === 'rear_right' ? 'rear_right_brake' : 'front_right_brake';
    }
    if (guidance.targetView === 'rear_left' || /\brear\b/.test(text)) return 'rear_left_brake';
    return 'front_left_brake';
  }
  if (/(wheel|tire|tyre|rim|hub)/.test(text)) {
    if (guidance.targetView === 'front_right' || guidance.targetView === 'rear_right' || /\b(right|passenger)\b/.test(text)) {
      return guidance.targetView === 'rear_right' ? 'rear_right_tire' : 'front_right_tire';
    }
    if (guidance.targetView === 'rear_left' || /\brear\b/.test(text)) return 'rear_left_tire';
    return 'front_left_tire';
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

        const focusRotationY = typeof focus?.rotationY === 'number' ? focus.rotationY : rotationRef.current.rotateY;
        root.rotation.y = Math.PI / 4 + (focusRotationY * Math.PI / 180);
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
