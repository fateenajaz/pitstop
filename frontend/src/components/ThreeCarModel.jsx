import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const DEFAULT_MODEL = {
  bodyStyle: 'sedan',
  paintColor: '#3b82f6',
  accentColor: '#111827',
  wheelColor: '#111111',
  wheelRadius: 0.31,
  wheelWidth: 0.18,
  wheelBase: 0.62,
  trackWidth: 0.58,
  bodyLength: 1.9,
  bodyHeight: 0.46,
  bodyWidth: 0.88,
  cabinLength: 0.95,
  cabinHeight: 0.36,
  cabinWidth: 0.76,
  cabinOffset: 0.02,
  hoodLength: 0.42,
  trunkLength: 0.34,
  groundClearance: 0.07,
  roofCurve: 0.42,
  hasSpoiler: false,
  hasSunroof: false,
};

function buildNormalizedModel(model3d) {
  return { ...DEFAULT_MODEL, ...(model3d || {}) };
}

export default function ThreeCarModel({
  model3d,
  width,
  height,
  rotateY = 0,
  rotateX = 0,
  isAnimated = true,
  isAlert = false,
}) {
  const canvasRef = useRef(null);
  const normalizedModel = useMemo(() => buildNormalizedModel(model3d), [model3d]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(4.4, 2.3, 4.6);
    camera.lookAt(0, 0.65, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(6, 8, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
    fillLight.position.set(-5, 3, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(isAlert ? 0xef4444 : 0xffffff, isAlert ? 1.5 : 0.8);
    rimLight.position.set(-4, 5, -6);
    scene.add(rimLight);

    const carGroup = new THREE.Group();
    scene.add(carGroup);

    const floorShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.85, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 }),
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.scale.set(1.05, 0.52, 1);
    floorShadow.position.y = -0.58;
    scene.add(floorShadow);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: normalizedModel.paintColor,
      metalness: 0.42,
      roughness: 0.36,
      clearcoat: 0.65,
      clearcoatRoughness: 0.24,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: normalizedModel.accentColor,
      metalness: 0.45,
      roughness: 0.5,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9fb7d4,
      transmission: 0.35,
      transparent: true,
      opacity: 0.72,
      roughness: 0.18,
      metalness: 0.05,
    });

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: normalizedModel.wheelColor,
      metalness: 0.35,
      roughness: 0.72,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        normalizedModel.bodyLength,
        normalizedModel.bodyHeight,
        normalizedModel.bodyWidth,
        2,
        2,
        2,
      ),
      bodyMaterial,
    );
    body.position.y = normalizedModel.groundClearance + normalizedModel.wheelRadius + (normalizedModel.bodyHeight * 0.42) - 0.1;
    carGroup.add(body);

    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(0.24, normalizedModel.hoodLength),
        Math.max(0.18, normalizedModel.bodyHeight * 0.42),
        normalizedModel.bodyWidth * 0.94,
      ),
      bodyMaterial,
    );
    hood.position.set(
      (normalizedModel.bodyLength * 0.5) - (normalizedModel.hoodLength * 0.58),
      body.position.y + (normalizedModel.bodyHeight * 0.1),
      0,
    );
    hood.rotation.z = -0.06 - (normalizedModel.roofCurve * 0.08);
    carGroup.add(hood);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(
        normalizedModel.cabinLength,
        normalizedModel.cabinHeight,
        normalizedModel.cabinWidth,
      ),
      bodyMaterial,
    );
    cabin.position.set(
      normalizedModel.cabinOffset - (normalizedModel.hoodLength * 0.12) + (normalizedModel.trunkLength * 0.08),
      body.position.y + (normalizedModel.bodyHeight * 0.42),
      0,
    );
    cabin.rotation.z = (normalizedModel.bodyStyle === 'coupe' ? -0.08 : -0.02) - (normalizedModel.roofCurve * 0.06);
    carGroup.add(cabin);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(
        normalizedModel.cabinLength * (0.7 - (normalizedModel.roofCurve * 0.12)),
        Math.max(0.08, normalizedModel.cabinHeight * 0.36),
        normalizedModel.cabinWidth * 0.92,
      ),
      normalizedModel.hasSunroof ? accentMaterial : glassMaterial,
    );
    roof.position.set(
      cabin.position.x,
      cabin.position.y + (normalizedModel.cabinHeight * 0.28),
      0,
    );
    roof.rotation.z = cabin.rotation.z;
    carGroup.add(roof);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(
        normalizedModel.cabinLength * 0.28,
        normalizedModel.cabinHeight * 0.48,
        normalizedModel.cabinWidth * 0.9,
      ),
      glassMaterial,
    );
    windshield.position.set(
      cabin.position.x + (normalizedModel.cabinLength * 0.18),
      cabin.position.y + (normalizedModel.cabinHeight * 0.02),
      0,
    );
    windshield.rotation.z = -0.26;
    carGroup.add(windshield);

    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(
        normalizedModel.cabinLength * 0.24,
        normalizedModel.cabinHeight * 0.42,
        normalizedModel.cabinWidth * 0.88,
      ),
      glassMaterial,
    );
    rearGlass.position.set(
      cabin.position.x - (normalizedModel.cabinLength * 0.18),
      cabin.position.y + (normalizedModel.cabinHeight * 0.02),
      0,
    );
    rearGlass.rotation.z = 0.22 + (normalizedModel.bodyStyle === 'hatchback' ? 0.08 : 0);
    carGroup.add(rearGlass);

    if (normalizedModel.hasSpoiler) {
      const spoiler = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, normalizedModel.cabinWidth * 0.68),
        accentMaterial,
      );
      spoiler.position.set(
        -(normalizedModel.bodyLength * 0.52),
        body.position.y + (normalizedModel.bodyHeight * 0.3),
        0,
      );
      spoiler.rotation.z = 0.12;
      carGroup.add(spoiler);
    }

    const wheelPositions = [
      [normalizedModel.wheelBase, normalizedModel.trackWidth],
      [normalizedModel.wheelBase, -normalizedModel.trackWidth],
      [-normalizedModel.wheelBase, normalizedModel.trackWidth],
      [-normalizedModel.wheelBase, -normalizedModel.trackWidth],
    ];

    wheelPositions.forEach(([x, z]) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(
          normalizedModel.wheelRadius,
          normalizedModel.wheelRadius,
          normalizedModel.wheelWidth,
          28,
        ),
        wheelMaterial,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, normalizedModel.groundClearance + (normalizedModel.wheelRadius * 0.98) - 0.22, z);
      carGroup.add(wheel);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(
          normalizedModel.wheelRadius * 0.52,
          normalizedModel.wheelRadius * 0.52,
          normalizedModel.wheelWidth * 1.04,
          20,
        ),
        accentMaterial,
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      carGroup.add(hub);
    });

    carGroup.rotation.y = Math.PI / 4 + (rotateY * Math.PI / 180);
    carGroup.rotation.x = rotateX * Math.PI / 180;
    carGroup.position.y = -0.1;

    let animationId = 0;

    const renderFrame = () => {
      if (isAnimated) {
        carGroup.rotation.y += 0.004;
      }
      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      window.cancelAnimationFrame(animationId);
      renderer.dispose();
      scene.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, [height, isAlert, isAnimated, normalizedModel, rotateX, rotateY, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
