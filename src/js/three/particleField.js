import * as THREE from 'three';

/* Warm hero haze: one brand-violet blob (doc: violet = "background
   accents/depth") plus two new gold/amber environmental tones — replaces
   the former violet/cyan mix, which read as cool/technical against the
   Dune-inspired warm hero direction. */
const BLOB_COLORS = [0x7a20fe, 0xc9a464, 0xd98f3e];

/**
 * Three large soft spheres instead of a particle starfield — CSS `blur()`
 * on the canvas (see .hero-canvas) turns them into ambient gradient orbs.
 * NormalBlending (the default) keeps them a soft wash instead of a glow.
 */
export function createAmbientBlobs(count = 3) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(3.2, 24, 24);

  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: BLOB_COLORS[i % BLOB_COLORS.length],
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6 - 2);
    mesh.userData.driftSeed = Math.random() * Math.PI * 2;
    mesh.userData.driftSpeed = 0.15 + Math.random() * 0.1;
    group.add(mesh);
  }

  return group;
}
