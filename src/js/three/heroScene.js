import * as THREE from 'three';
import { createAmbientBlobs } from './particleField.js';

export function createHeroScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 12;

  const field = createAmbientBlobs();
  scene.add(field);

  const pointer = { x: 0, y: 0 };
  const clock = new THREE.Clock();
  let rafId = null;
  let running = false;

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function handlePointerMove(event) {
    pointer.x = event.clientX / window.innerWidth - 0.5;
    pointer.y = event.clientY / window.innerHeight - 0.5;
  }

  function tick() {
    const t = clock.getElapsedTime();
    field.rotation.y += 0.0003;
    field.children.forEach((blob) => {
      const { driftSeed, driftSpeed } = blob.userData;
      blob.position.x += Math.sin(t * driftSpeed + driftSeed) * 0.002;
      blob.position.y += Math.cos(t * driftSpeed * 0.8 + driftSeed) * 0.0015;
    });
    camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.02;
    camera.position.y += (-pointer.y * 1.4 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    tick();
  }

  function stop() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function dispose() {
    stop();
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('resize', resize);
    field.children.forEach((blob) => blob.material.dispose());
    field.children[0]?.geometry.dispose();
    renderer.dispose();
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('resize', resize);
  resize();

  return { start, stop, dispose, resize };
}
