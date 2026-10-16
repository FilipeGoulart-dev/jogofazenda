// Cena 3D: terreno, lago, campo, construções, animais, peixes, colmeias e veículos.
// Lê o estado do jogo (game.s) e mantém as malhas sincronizadas.
import * as THREE from 'three';
import {
  FIELD, CROPS, ANIMALS, FISH, BUILDINGS, LAKE, VEHICLES, WORLD_HALF,
} from './config.js';
import {
  mat, makeAnimalMesh, makeFishMesh, makePlantMesh, makeTree, makeRock, makeHive,
  makeBuildingMesh, makeVehicleMesh, makePlayerMesh,
} from './models.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class World {
  constructor(container) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe6ff);
    this.scene.fog = new THREE.Fog(0xbfe6ff, 90, 230);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    this.fieldTiles = new Map();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xdff3ff, 0x557733, 0.9));
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.1);
    sun.position.set(40, 70, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.far = 220;
    sun.shadow.bias = -0.0008;
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);

    this.buildGround();
    this.buildLake();
    this.buildField();

    this.maps = {
      buildings: new Map(), trees: new Map(), rocks: new Map(), plots: new Map(),
      animals: new Map(), fish: new Map(), hives: new Map(), vehicles: new Map(),
    };
    this.player = makePlayerMesh();
    this.scene.add(this.player);
    this.ghost = null;
    this.time = 0;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildGround() {
    const size = 260;
    const g = new THREE.PlaneGeometry(size, size, 1, 1);
    const m = new THREE.Mesh(g, mat(0x6fb24a));
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    this.scene.add(m);
    // faixas de grama mais escura para dar textura
    for (let i = 0; i < 40; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(rand(4, 14), rand(4, 14)), mat(0x62a343));
      p.rotation.x = -Math.PI / 2;
      p.position.set(rand(-WORLD_HALF, WORLD_HALF), 0.01, rand(-WORLD_HALF, WORLD_HALF));
      this.scene.add(p);
    }
    // cerca do limite do mapa
    const fenceMat = mat(0x7a5a34);
    for (const [x, z, w, d] of [[0, -WORLD_HALF, WORLD_HALF * 2, 0.3], [0, WORLD_HALF, WORLD_HALF * 2, 0.3],
      [-WORLD_HALF, 0, 0.3, WORLD_HALF * 2], [WORLD_HALF, 0, 0.3, WORLD_HALF * 2]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), fenceMat);
      b.position.set(x, 0.4, z);
      this.scene.add(b);
    }
  }

  buildLake() {
    const sand = new THREE.Mesh(new THREE.CylinderGeometry(LAKE.r + 1, LAKE.r + 1.2, 0.2, 40), mat(0xe8d49a));
    sand.position.set(LAKE.x, 0.02, LAKE.z);
    sand.receiveShadow = true;
    this.scene.add(sand);
    this.water = new THREE.Mesh(new THREE.CylinderGeometry(LAKE.r, LAKE.r, 0.1, 40), mat(0x3aa7d8, { transparent: true, opacity: 0.85 }));
    this.water.position.set(LAKE.x, 0.1, LAKE.z);
    this.scene.add(this.water);
  }

  buildField() {
    const soilMat = mat(0x5e9440); // terra não arada = grama
    const tilledMat = mat(0x7d5a36); // arado
    const { x0, z0, cols, rows, tile } = FIELD;
    this.tileGeo = new THREE.BoxGeometry(tile - 0.15, 0.12, tile - 0.15);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const m = new THREE.Mesh(this.tileGeo, soilMat);
      m.position.set(x0 + i * tile + tile / 2, 0.06, z0 + j * tile + tile / 2);
      m.receiveShadow = true;
      this.scene.add(m);
      this.fieldTiles.set(`${i},${j}`, { mesh: m, soil: soilMat, tilled: tilledMat, plant: null, sig: '' });
    }
    this.soilMat = soilMat;
    this.tilledMat = tilledMat;
    this.wetMat = mat(0x5a3d22);
  }

  // ------------------------------------------------------------ Sincronização com o estado
  sync(game, dt) {
    const s = game.s;
    this.syncBuildings(s);
    this.syncScenery(s);
    this.syncPlots(s, game);
    this.syncAnimals(s, game, dt);
    this.syncFish(s, dt);
    this.syncHives(s);
    this.syncVehicles(s);
  }

  syncBuildings(s) {
    const seen = new Set();
    for (const b of s.buildings) {
      seen.add(b.id);
      if (this.maps.buildings.has(b.id)) continue;
      const def = BUILDINGS[b.type];
      const m = makeBuildingMesh(def, b.type);
      m.position.set(b.x, 0, b.z);
      m.rotation.y = -(b.rot % 2) * Math.PI / 2;
      m.userData.bid = b.id;
      this.scene.add(m);
      this.maps.buildings.set(b.id, m);
    }
    for (const [id, m] of this.maps.buildings) {
      if (!seen.has(id)) { this.scene.remove(m); this.maps.buildings.delete(id); }
    }
  }

  syncScenery(s) {
    const sync = (list, map, make) => {
      const seen = new Set();
      for (const o of list) {
        seen.add(o.id);
        if (map.has(o.id)) {
          const m = map.get(o.id);
          // encolhe um pouco a cada golpe (feedback visual)
          const f = Math.max(0.5, o.hp / 3);
          m.userData.baseScale = m.userData.baseScale || m.scale.x;
          m.scale.setScalar(m.userData.baseScale * (0.7 + 0.3 * f));
          continue;
        }
        const m = make(o);
        m.position.set(o.x, 0, o.z);
        m.rotation.y = (o.id * 1.7) % 6.28;
        m.userData.baseScale = m.scale.x;
        this.scene.add(m);
        map.set(o.id, m);
      }
      for (const [id, m] of map) {
        if (!seen.has(id)) { this.scene.remove(m); map.delete(id); }
      }
    };
    sync(s.trees, this.maps.trees, (o) => makeTree(0.9 + (o.id % 5) * 0.08));
    sync(s.rocks, this.maps.rocks, (o) => makeRock(0.9 + (o.id % 4) * 0.1, o.id));
  }

  syncPlots(s, game) {
    const { x0, z0, tile } = FIELD;
    for (const [key, t] of this.fieldTiles) {
      const plot = s.plots[key];
      const soil = plot ? (plot.water > 0 ? this.wetMat : this.tilledMat) : this.soilMat;
      if (t.mesh.material !== soil) t.mesh.material = soil;
      // Planta: recria a malha apenas quando o estágio muda
      const sig = plot && plot.crop ? `${plot.crop}:${stageOf(plot)}` : '';
      if (sig !== t.sig) {
        if (t.plant) { this.scene.remove(t.plant); t.plant = null; }
        if (sig) {
          const [i, j] = key.split(',').map(Number);
          const p = makePlantMesh(plot.crop, CROPS[plot.crop].color, stageOf(plot));
          p.position.set(x0 + i * tile + tile / 2, 0.12, z0 + j * tile + tile / 2);
          this.scene.add(p);
          t.plant = p;
        }
        t.sig = sig;
      }
      if (t.plant) {
        // plantas maduras balançam levemente
        if (plot && plot.growth >= 1) t.plant.rotation.y = Math.sin(this.time * 2 + t.plant.position.x) * 0.08;
      }
    }
    function stageOf(p) {
      if (p.growth >= 1) return 3;
      if (p.growth >= 0.66) return 2;
      if (p.growth >= 0.33) return 1;
      return 0;
    }
  }

  // Animais: cada animal tem um alvo dentro da cerca; se move e se balança
  syncAnimals(s, game, dt) {
    const seen = new Set();
    for (const a of s.animals) {
      seen.add(a.id);
      const def = ANIMALS[a.type];
      const adult = a.age >= def.adultAge;
      let rec = this.maps.animals.get(a.id);
      if (!rec || rec.adult !== adult) {
        if (rec) this.scene.remove(rec.group);
        const bld = s.buildings.find((b) => b.id === a.bid);
        const group = makeAnimalMesh(a.type, def, a.sex, adult);
        const p = this.randomInPen(bld);
        group.position.copy(p);
        group.userData.targetX = p.x;
        group.userData.targetZ = p.z;
        group.userData.wait = rand(0, 2);
        group.userData.phase = rand(0, 6);
        this.scene.add(group);
        rec = { group, adult, bid: a.bid };
        this.maps.animals.set(a.id, rec);
      }
      rec.bid = a.bid;
      this.moveAnimal(rec, dt, a, s);
    }
    for (const [id, rec] of this.maps.animals) {
      if (!seen.has(id)) { this.scene.remove(rec.group); this.maps.animals.delete(id); }
    }
  }

  randomInPen(bld) {
    if (!bld) return new THREE.Vector3();
    const def = BUILDINGS[bld.type];
    let [w, d] = def.size;
    if (bld.rot % 2 === 1) [w, d] = [d, w];
    return new THREE.Vector3(bld.x + rand(-w / 2 + 0.9, w / 2 - 0.9), 0, bld.z + rand(-d / 2 + 0.9, d / 2 - 0.9));
  }

  moveAnimal(rec, dt, a, s) {
    const g = rec.group;
    const ud = g.userData;
    const bld = s.buildings.find((b) => b.id === a.bid);
    if (!bld) return;
    ud.wait -= dt;
    const dx = ud.targetX - g.position.x;
    const dz = ud.targetZ - g.position.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;
    if (ud.wait <= 0 && dist > 0.1) {
      // animais alimentados andam mais animados
      const speed = a.fed > 0 ? 0.7 : 0.45;
      const step = Math.min(dist, speed * dt);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.rotation.y = Math.atan2(dx, dz);
      moving = true;
    } else if (ud.wait <= 0) {
      const p = this.randomInPen(bld);
      ud.targetX = p.x; ud.targetZ = p.z;
      ud.wait = rand(1.5, 5);
    }
    // animação: quicar e balançar as patas
    ud.phase += dt * (moving ? 9 : 2);
    if (ud.body) ud.body.position.y = moving ? Math.abs(Math.sin(ud.phase)) * 0.05 : 0;
    (ud.legs || []).forEach((l, i) => {
      l.rotation.x = moving ? Math.sin(ud.phase + (i % 2) * Math.PI) * 0.5 : 0;
    });
  }

  // Peixes: nadam aleatoriamente dentro do lago
  syncFish(s, dt) {
    const seen = new Set();
    for (const f of s.lake.fish) {
      seen.add(f.id);
      let rec = this.maps.fish.get(f.id);
      if (!rec) {
        const group = makeFishMesh(f.sex);
        const p = this.randomInLake();
        group.position.set(p.x, 0.22, p.z);
        this.scene.add(group);
        rec = { group, tx: p.x, tz: p.z, wait: rand(0, 2) };
        this.maps.fish.set(f.id, rec);
      }
      const adult = f.age >= FISH.adultAge;
      const sc = adult ? 1 : 0.5;
      rec.group.scale.setScalar(sc);
      rec.wait -= dt;
      const dx = rec.tx - rec.group.position.x, dz = rec.tz - rec.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.1 && rec.wait > 0) {
        rec.group.position.x += (dx / d) * 0.6 * dt;
        rec.group.position.z += (dz / d) * 0.6 * dt;
        rec.group.rotation.y = Math.atan2(dx, dz);
      } else if (rec.wait <= 0 || d <= 0.1) {
        const p = this.randomInLake();
        rec.tx = p.x; rec.tz = p.z;
        rec.wait = rand(2, 5);
      }
    }
    for (const [id, rec] of this.maps.fish) {
      if (!seen.has(id)) { this.scene.remove(rec.group); this.maps.fish.delete(id); }
    }
  }
  randomInLake() {
    const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * (LAKE.r - 2);
    return new THREE.Vector3(LAKE.x + Math.cos(a) * r, 0, LAKE.z + Math.sin(a) * r);
  }

  syncHives(s) {
    const seen = new Set();
    for (const h of s.hives) {
      seen.add(h.id);
      if (this.maps.hives.has(h.id)) continue;
      const ap = s.buildings.find((b) => b.id === h.bid);
      if (!ap) continue;
      const idx = s.hives.filter((x) => x.bid === h.bid).indexOf(h);
      const m = makeHive();
      const cols = 2;
      const gx = (idx % cols) - 0.5, gz = Math.floor(idx / cols) - 0.5;
      m.position.set(ap.x + gx * 1.4, 1.3, ap.z + gz * 1.4 + 0.4);
      this.scene.add(m);
      this.maps.hives.set(h.id, m);
    }
    for (const [id, m] of this.maps.hives) {
      if (!seen.has(id)) { this.scene.remove(m); this.maps.hives.delete(id); }
    }
  }

  syncVehicles(s) {
    for (const [id, v] of Object.entries(s.vehicles)) {
      let m = this.maps.vehicles.get(id);
      if (!m) {
        m = makeVehicleMesh(id, VEHICLES[id]);
        this.scene.add(m);
        this.maps.vehicles.set(id, m);
      }
      m.position.set(v.x, 0, v.z);
      m.rotation.y = v.rot;
    }
    for (const [id, m] of this.maps.vehicles) {
      if (!s.vehicles[id]) { this.scene.remove(m); this.maps.vehicles.delete(id); }
    }
  }

  // Fantasma de construção (visualização ao colocar prédios)
  setGhost(type, x, z, rot, valid) {
    if (!type) {
      if (this.ghost) { this.scene.remove(this.ghost); this.ghost = null; this.ghostType = null; }
      return;
    }
    if (this.ghostType !== type) {
      if (this.ghost) this.scene.remove(this.ghost);
      this.ghost = makeBuildingMesh(BUILDINGS[type], type);
      this.ghostType = type;
      this.ghost.traverse((o) => {
        if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; o.castShadow = false; }
        if (o.isSprite) o.visible = false;
      });
      this.scene.add(this.ghost);
    }
    this.ghost.position.set(x, 0, z);
    this.ghost.rotation.y = -(rot % 2) * Math.PI / 2;
    this.ghost.traverse((o) => {
      if (o.isMesh && o.material) o.material.color.setHex(valid ? 0x7dff7d : 0xff6a6a);
    });
  }

  update(dt) {
    this.time += dt;
    this.water.position.y = 0.1 + Math.sin(this.time * 1.5) * 0.01;
    this.maps.fish.forEach((r) => { r.group.position.y = 0.2 + Math.sin(this.time * 3 + r.tx) * 0.03; });
  }

  // Câmera em terceira pessoa com órbita
  updateCamera(target, yaw, pitch, dist) {
    const cx = target.x + Math.sin(yaw) * Math.cos(pitch) * dist;
    const cz = target.z + Math.cos(yaw) * Math.cos(pitch) * dist;
    const cy = target.y + 1.2 + Math.sin(pitch) * dist;
    this.camera.position.set(cx, Math.max(1, cy), cz);
    this.camera.lookAt(target.x, target.y + 1.1, target.z);
    this.sun.position.set(target.x + 40, 70, target.z + 25);
    this.sun.target.position.set(target.x, 0, target.z);
  }
}
