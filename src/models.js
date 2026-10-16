// Fábrica de modelos 3D feitos com primitivas (sem arquivos externos).
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = `${color}|${opts.transparent ? 't' : ''}|${opts.opacity ?? 1}|${opts.emissive ?? ''}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({
      color,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
      emissive: opts.emissive ?? 0x000000,
      depthWrite: !opts.transparent,
    }));
  }
  return matCache.get(key);
}

function box(w, h, d, color, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function sphere(r, color, x, y, z, parent, sy = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat(color));
  m.position.set(x, y, z);
  m.scale.y = sy;
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}
function cyl(rt, rb, h, color, x, y, z, parent, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}
function cone(r, h, color, x, y, z, parent, seg = 6) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  if (parent) parent.add(m);
  return m;
}

// ---------------------------------------------------------------- Animais
// Modelo em escala 1 de "frente" = +Z. Machos e fêmeas são diferenciados visualmente.
export function makeAnimalMesh(type, def, sex, adult) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const legs = [];
  const bodyColor = def.color;
  const scaleAdult = adult ? 1 : 0.6;

  if (type === 'galinha' || type === 'galo') {
    const isRooster = type === 'galo' || sex === 'M';
    const bc = isRooster ? def.color : def.color;
    sphere(0.28, bc, 0, 0.36, 0, body, 0.9);
    sphere(0.17, bc, 0, 0.6, 0.12, body);
    cone(0.06, 0.16, 0xf0b429, 0, 0.56, 0.3, body).rotation.x = Math.PI / 2;
    box(0.06, 0.08, 0.04, def.comb, 0, 0.74, 0.12, body);
    box(0.04, 0.08, 0.1, def.comb, 0, 0.64, 0.22, body);
    if (isRooster) {
      cone(0.07, 0.3, 0x6b3b1e, -0.1, 0.56, -0.25, body).rotation.x = -0.9;
      cone(0.07, 0.3, 0x6b3b1e, 0.1, 0.56, -0.25, body).rotation.x = -0.9;
    }
    for (const x of [-0.08, 0.08]) {
      const l = box(0.03, 0.22, 0.03, 0xe0a030, x, 0.11, 0, g);
      legs.push(l);
    }
  } else if (type === 'vaca' || type === 'touro') {
    const isBull = type === 'touro';
    box(1.0, 0.7, 1.6, bodyColor, 0, 0.95, 0, body);
    const head = new THREE.Group();
    head.position.set(0, 1.25, 0.85);
    body.add(head);
    box(0.5, 0.5, 0.55, bodyColor, 0, 0, 0, head);
    box(0.3, 0.2, 0.15, 0xe9b3a0, 0, -0.1, 0.3, head);
    for (const x of [-0.2, 0.2]) {
      cone(0.05, isBull ? 0.35 : 0.22, 0xf4ecd0, x, 0.3, -0.05, head).rotation.z = x > 0 ? -0.6 : 0.6;
    }
    head.userData.isHead = true;
    if (!isBull) {
      box(0.35, 0.3, 0.02, def.spot, 0.2, 0.05, 0.28, head);
    }
    for (const sx of [-0.3, 0.3]) for (const sz of [-0.55, 0.55]) {
      legs.push(box(0.16, 0.7, 0.16, isBull ? 0x4a3020 : 0xeeeeee, sx, 0.35, sz, g));
    }
    if (!isBull) {
      box(0.45, 0.4, 0.45, def.spot, 0.2, 1.05, -0.2, body);
      box(0.6, 0.5, 0.4, def.spot, -0.25, 1.0, 0.3, body);
    } else {
      box(1.0, 0.4, 0.4, 0x6b4a30, 0, 1.25, -0.15, body);
    }
    const udder = !isBull && adult ? box(0.3, 0.12, 0.3, 0xf2b8c0, 0, 0.55, -0.4, body) : null;
    if (udder) udder.userData.udder = true;
    box(0.04, 0.4, 0.04, def.spot, 0, 0.95, -0.9, body).rotation.x = 0.4;
  } else if (type === 'ovelha' || type === 'carneiro') {
    const isRam = type === 'carneiro';
    // corpo "fofo" de lã
    sphere(0.55, def.color, 0, 0.7, 0, body, 0.85);
    sphere(0.42, def.color, 0, 0.82, 0.15, body, 0.9);
    const head = new THREE.Group();
    head.position.set(0, 1.0, 0.6);
    body.add(head);
    sphere(0.22, def.face, 0, 0, 0, head, 0.9);
    box(0.08, 0.1, 0.08, def.face, 0.12, 0.02, 0.1, head);
    box(0.08, 0.1, 0.08, def.face, -0.12, 0.02, 0.1, head);
    head.userData.isHead = true;
    if (isRam) {
      cone(0.05, 0.22, 0xe5d8b0, -0.14, 0.2, 0.0, head).rotation.z = 0.8;
      cone(0.05, 0.22, 0xe5d8b0, 0.14, 0.2, 0.0, head).rotation.z = -0.8;
    }
    for (const sx of [-0.2, 0.2]) for (const sz of [-0.3, 0.3]) {
      legs.push(box(0.09, 0.45, 0.09, def.face, sx, 0.22, sz, g));
    }
  } else if (type === 'peixe') {
    // não usado diretamente (peixes usam makeFishMesh)
  }

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.scale.setScalar(def.size * scaleAdult);
  g.userData = { body, legs, adultScale: def.size, baseScale: def.size * scaleAdult };
  return g;
}

export function makeFishMesh(sex) {
  const g = new THREE.Group();
  const color = sex === 'M' ? 0x3f7fd0 : 0xe4875a;
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(color));
  b.scale.set(0.6, 0.6, 1.5);
  g.add(b);
  const tail = cone(0.14, 0.22, color, 0, 0, -0.3, g, 4);
  tail.rotation.x = Math.PI / 2;
  tail.rotation.z = 0;
  tail.rotation.y = Math.PI / 4;
  return g;
}

// ---------------------------------------------------------------- Plantações
export function makePlantMesh(cropId, color, stage) {
  const g = new THREE.Group();
  // estágio 0: broto, 1: crescendo, 2: quase, 3: maduro
  const s = [0.25, 0.5, 0.8, 1.0][stage];
  if (cropId === 'trigo') {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const h = 0.7 * s + 0.1;
      cyl(0.02, 0.02, h, 0x6aa84f, Math.cos(a) * 0.1, h / 2, Math.sin(a) * 0.1, g, 4);
      if (stage >= 2) cyl(0.03, 0.01, 0.2, color, Math.cos(a) * 0.1, h + 0.05, Math.sin(a) * 0.1, g, 4);
    }
  } else if (cropId === 'milho') {
    cyl(0.04, 0.05, 1.2 * s + 0.1, 0x5aa02c, 0, (1.2 * s + 0.1) / 2, 0, g, 6);
    if (stage >= 2) {
      box(0.1, 0.25, 0.1, color, 0.12, 0.7 * s, 0, g);
      box(0.1, 0.25, 0.1, color, -0.12, 0.6 * s, 0, g);
    }
    if (stage >= 3) cone(0.08, 0.3, 0xfff07a, 0, 1.25, 0, g, 6);
  } else if (cropId === 'cenoura') {
    box(0.4, 0.05, 0.4, 0x3f8f2f, 0, 0.05, 0, g);
    for (let i = -1; i <= 1; i++) {
      cone(0.06 * s + 0.03, 0.45 * s + 0.1, 0x3f8f2f, i * 0.1, 0.2 * s, 0, g, 4).rotation.x = 0;
    }
    if (stage >= 2) cone(0.1, 0.35, color, 0, -0.02, 0, g, 6).rotation.x = Math.PI;
  } else if (cropId === 'morango') {
    sphere(0.22 * s + 0.1, 0x3f8f2f, 0, 0.2 * s, 0, g, 0.5);
    if (stage >= 2) {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        sphere(0.07, color, Math.cos(a) * 0.22, 0.06, Math.sin(a) * 0.22, g, 1.1);
      }
    }
    if (stage >= 3) sphere(0.07, 0xff3b3b, 0.12, 0.2, 0.05, g);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- Cenário
export function makeTree(scale = 1) {
  const g = new THREE.Group();
  cyl(0.25, 0.35, 2.4, 0x7a5232, 0, 1.2, 0, g, 6);
  sphere(1.4, 0x2f7d32, 0, 3.3, 0, g, 1.1);
  sphere(1.0, 0x3c9140, 0.5, 2.6, 0.3, g);
  sphere(0.9, 0x3c9140, -0.5, 2.8, -0.3, g);
  g.scale.setScalar(scale);
  return g;
}

export function makeRock(scale = 1, seed = 0) {
  const g = new THREE.Group();
  const c = 0x8c8c8c + (seed % 3) * 0x0a0a0a;
  sphere(0.9, c, 0, 0.4, 0, g, 0.7);
  sphere(0.6, c - 0x101010, 0.6, 0.25, 0.3, g, 0.6);
  g.scale.setScalar(scale);
  return g;
}

export function makeHive() {
  const g = new THREE.Group();
  box(0.5, 0.2, 0.5, 0x8a6240, 0, 0.1, 0, g);
  box(0.55, 0.22, 0.55, 0xf2d38a, 0, 0.32, 0, g);
  box(0.55, 0.22, 0.55, 0xe3b96a, 0, 0.54, 0, g);
  box(0.6, 0.12, 0.6, 0x6b4a2a, 0, 0.7, 0, g);
  return g;
}

// ---------------------------------------------------------------- Construções
export function makeBuildingMesh(def, typeId) {
  const g = new THREE.Group();
  const [w, d] = def.size;
  const wallH = def.kind === 'pen' ? 0.01 : 2.2;

  if (def.kind === 'pen') {
    // piso de terra + cercas (postes e ripas)
    box(w, 0.05, d, 0xa0825a, 0, 0.03, 0, g).castShadow = false;
    const postMat = 0x6b4a2a;
    const rails = [0.55, 1.0];
    const addPost = (x, z) => cyl(0.07, 0.07, 1.2, postMat, x, 0.6, z, g, 5);
    for (let x = -w / 2; x <= w / 2 + 0.001; x += 1) {
      addPost(x, -d / 2); addPost(x, d / 2);
    }
    for (let z = -d / 2; z <= d / 2 + 0.001; z += 1) {
      addPost(-w / 2, z); addPost(w / 2, z);
    }
    for (const y of rails) {
      box(w, 0.07, 0.05, 0x9c7650, 0, y, -d / 2, g);
      box(w, 0.07, 0.05, 0x9c7650, 0, y, d / 2, g);
      box(0.05, 0.07, d, 0x9c7650, -w / 2, y, 0, g);
      box(0.05, 0.07, d, 0x9c7650, w / 2, y, 0, g);
    }
    // cabana/abrigo pequeno
    box(1.4, 1.1, 1.2, def.color, w / 2 - 1.1, 0.6, -d / 2 + 0.9, g);
    cone(1.1, 0.8, 0x7a3b20, w / 2 - 1.1, 1.5, -d / 2 + 0.9, g, 4).rotation.y = Math.PI / 4;
  } else if (def.kind === 'apiary') {
    box(w, 0.05, d, 0x9bb55a, 0, 0.03, 0, g);
    box(w - 0.3, 0.9, d - 0.3, def.color, 0, 0.5, 0, g);
    for (let i = 0; i < 3; i++) {
      box(0.6, 0.18, 0.8, 0x8a6240, -w / 2 + 0.8 + i * 0.9, 1.0, 0, g);
    }
    box(w + 0.2, 0.1, d + 0.2, 0xb5542a, 0, 1.1, 0, g);
  } else {
    // construção sólida
    box(w, 0.1, d, 0x8d8a80, 0, 0.05, 0, g);
    box(w * 0.9, wallH, d * 0.9, def.color, 0, wallH / 2 + 0.1, 0, g);
    const roof = cone(Math.max(w, d) * 0.75, 1.4, 0x8a3b2a, 0, wallH + 0.8, 0, g, 4);
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = d / w;
    box(0.5, 0.9, 0.05, 0x5a3a20, 0, 0.55, d * 0.45, g);
    if (def.kind === 'silo') {
      g.clear();
      cyl(w / 2, w / 2, 3.2, def.color, 0, 1.7, 0, g, 16);
      cone(w / 2 + 0.1, 1.0, 0x7a7a7a, 0, 3.7, 0, g, 16);
    }
  }

  // placa com o nome (ajuda o jogador a identificar)
  const sign = makeSign(def.name);
  sign.position.set(0, def.kind === 'pen' ? 1.9 : (def.kind === 'silo' ? 4.6 : 3.2), d / 2 + 0.3);
  if (def.kind === 'pen') sign.position.set(0, 1.9, d / 2 + 0.3);
  g.add(sign);
  g.userData.typeId = typeId;
  return g;
}

export function makeSign(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(40,30,20,0.85)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 22), 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(2.6, 0.65, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// ---------------------------------------------------------------- Veículos
export function makeVehicleMesh(id, def) {
  const g = new THREE.Group();
  if (id === 'bicicleta') {
    const wheelMat = 0x222222;
    for (const z of [-0.6, 0.6]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 14), mat(wheelMat));
      w.rotation.y = Math.PI / 2;
      w.position.set(0, 0.4, z);
      g.add(w);
    }
    box(0.08, 0.08, 1.2, def.color, 0, 0.6, 0, g);
    box(0.08, 0.5, 0.08, def.color, 0, 0.8, 0.5, g);
    box(0.4, 0.06, 0.1, 0x333333, 0, 1.05, 0.5, g);
    sphere(0.2, 0xffcc88, 0, 1.0, -0.1, g);
  } else if (id === 'trator') {
    box(1.4, 0.6, 2.0, def.color, 0, 0.8, 0, g);
    box(1.0, 0.7, 1.0, def.color, 0, 1.5, -0.3, g);
    box(0.9, 0.5, 0.1, 0xbfe3ff, 0, 1.6, 0.25, g);
    cyl(0.07, 0.07, 1.5, 0x333333, 0.6, 2.0, -0.6, g, 6);
    cyl(0.9, 0.9, 0.5, 0x1a1a1a, -0.8, 0.9, -0.6, g, 12).rotation.z = Math.PI / 2;
    cyl(0.9, 0.9, 0.5, 0x1a1a1a, 0.8, 0.9, -0.6, g, 12).rotation.z = Math.PI / 2;
    cyl(0.5, 0.5, 0.4, 0x1a1a1a, -0.8, 0.5, 0.8, g, 12).rotation.z = Math.PI / 2;
    cyl(0.5, 0.5, 0.4, 0x1a1a1a, 0.8, 0.5, 0.8, g, 12).rotation.z = Math.PI / 2;
  } else if (id === 'caminhao') {
    box(1.8, 1.2, 1.6, 0xe9e9e9, 0, 1.2, 0.9, g);
    box(1.6, 1.4, 2.4, def.color, 0, 1.2, -1.2, g);
    box(1.4, 0.6, 0.1, 0xbfe3ff, 0, 1.6, 1.72, g);
    for (const x of [-0.85, 0.85]) {
      for (const z of [1.0, -1.4, -2.0]) {
        cyl(0.4, 0.4, 0.3, 0x1a1a1a, x, 0.4, z, g, 10).rotation.z = Math.PI / 2;
      }
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function makePlayerMesh() {
  const g = new THREE.Group();
  box(0.4, 0.55, 0.3, 0x2c6fb0, 0, 1.0, 0, g);
  sphere(0.2, 0xf1c39a, 0, 1.5, 0, g);
  box(0.42, 0.12, 0.42, 0x6b4a2a, 0, 1.66, 0, g); // chapéu
  box(0.14, 0.45, 0.16, 0x3a3a50, -0.11, 0.3, 0, g);
  box(0.14, 0.45, 0.16, 0x3a3a50, 0.11, 0.3, 0, g);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
