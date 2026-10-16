// Controlador do jogador: movimento, veículos, interação (tecla E) e modo de construção.
import {
  ANIMALS, BEES, BUILDINGS, CROPS, ITEMS, LAKE, PLAYER_SPEED, PLAYER_RUN_MULT, INTERACT_REACH,
  TOOLS, VEHICLES,
} from './config.js';

const hyp = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export class Controller {
  constructor(game, world, ui) {
    this.g = game;
    this.w = world;
    this.ui = ui;
    this.keys = new Set();
    this.yaw = Math.PI; // câmera atrás do jogador
    this.pitch = 0.45;
    this.dist = 9;
    this.build = null; // { type, rot, valid, x, z }
  }

  // ------------------------------------------------------------ Entrada
  bindInput(canvas) {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('pointerup', () => { drag = null; });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.yaw -= (e.clientX - drag.x) * 0.006;
      this.pitch = Math.max(0.1, Math.min(1.25, this.pitch + (e.clientY - drag.y) * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('wheel', (e) => {
      this.dist = Math.max(4, Math.min(20, this.dist + Math.sign(e.deltaY) * 0.8));
    }, { passive: true });
  }

  onKeyDown(e) {
    if (e.repeat && e.code !== 'Escape') return;
    const code = e.code;
    const ui = this.ui;
    if (code === 'Escape') {
      if (ui.isOpen()) ui.closeModal();
      else if (this.build) this.cancelBuild();
      return;
    }
    if (ui.isOpen()) return; // painéis abertos capturam as teclas
    if (this.build) {
      if (code === 'KeyR') { this.build.rot = (this.build.rot + 1) % 2; }
      else if (code === 'KeyE') { this.placeBuild(); }
      else if (code === 'KeyB') { this.cancelBuild(); }
    }
    this.keys.add(code);
    if (code.startsWith('Digit')) {
      const n = Number(code.slice(5));
      if (n >= 1 && n <= 9) this.selectSlot(n);
    }
    switch (code) {
      case 'KeyE': if (!this.build) this.interact(); break;
      case 'KeyQ': this.cycleSeed(); break;
      case 'KeyB': if (!this.build) this.ui.openModal('construir'); break;
      case 'KeyL': this.ui.openModal('loja'); break;
      case 'KeyO': this.ui.openModal('oficina'); break;
      case 'KeyM': case 'Tab': e.preventDefault(); this.ui.openModal('missoes'); break;
      case 'KeyI': this.ui.openModal('inventario'); break;
      case 'KeyH': this.ui.openModal('ajuda'); break;
      default: break;
    }
  }

  selectSlot(n) {
    const tool = this.toolForSlot(n);
    if (!tool) return;
    if (!this.g.s.tools[tool]) { this.ui.message(`${TOOLS[tool].name} ainda não foi comprada (Oficina, tecla O).`); return; }
    this.g.s.selectedSlot = n;
  }
  toolForSlot(n) {
    return Object.keys(TOOLS).find((k) => TOOLS[k].slot === n) || null;
  }
  currentTool() { return this.toolForSlot(this.g.s.selectedSlot); }
  cycleSeed() {
    const seeds = Object.keys(ITEMS).filter((k) => k.startsWith('semente_'));
    const i = seeds.indexOf(this.g.s.selectedSeed);
    this.g.s.selectedSeed = seeds[(i + 1) % seeds.length];
    this.ui.message(`Semente: ${ITEMS[this.g.s.selectedSeed].name}`);
  }

  // ------------------------------------------------------------ Movimento
  update(dt) {
    const g = this.g;
    const s = g.s;
    const k = this.keys;
    const modal = this.ui.isOpen();
    const ix = modal ? 0 : ((k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0));
    const iz = modal ? 0 : ((k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0));
    if (s.riding) {
      const id = s.riding;
      const veh = s.vehicles[id];
      const def = VEHICLES[id];
      veh.rot += (modal ? 0 : ix) * dt * 1.8 * (iz < 0 ? -1 : 1);
      const sp = iz * def.speed * (iz < 0 ? 0.5 : 1);
      const nx = veh.x + Math.sin(veh.rot) * sp * dt;
      const nz = veh.z + Math.cos(veh.rot) * sp * dt;
      const [mx, mz] = g.moveWithCollision(veh.x, veh.z, nx, nz, 1.0);
      veh.x = mx; veh.z = mz;
      s.player.x = veh.x; s.player.z = veh.z; s.player.rot = veh.rot;
      // a câmera fica atrás do veículo
      const target = veh.rot + Math.PI;
      this.yaw += Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw)) * Math.min(1, dt * 3);
      if (id === 'trator' && Math.abs(sp) > 0) this.autoHarvest(veh.x, veh.z);
    } else {
      // movimento relativo à câmera
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      let dx = rx * ix + fx * iz, dz = rz * ix + fz * iz;
      const len = Math.hypot(dx, dz);
      if (len > 0) {
        dx /= len; dz /= len;
        const run = k.has('ShiftLeft') || k.has('ShiftRight') ? PLAYER_RUN_MULT : 1;
        const step = PLAYER_SPEED * run * dt;
        const p = s.player;
        const [mx, mz] = g.moveWithCollision(p.x, p.z, p.x + dx * step, p.z + dz * step, 0.4);
        p.x = mx; p.z = mz;
        p.rot = Math.atan2(dx, dz);
      }
    }
    // a câmera gira com as setas quando não estiver dirigindo
    if (!s.riding && !modal) {
      if (k.has('ArrowLeft')) this.yaw += dt * 1.5;
      if (k.has('ArrowRight')) this.yaw -= dt * 1.5;
    }
  }

  // Trator colhe automaticamente os canteiros maduros por onde passa
  autoHarvest(x, z) {
    const pl = this.g.plotAt(x, z);
    if (pl && this.g.isRipe(pl.key)) {
      const crop = this.g.s.plots[pl.key].crop;
      const got = this.g.harvest(pl.key, true);
      if (got) this.ui.message(`🚜 Trator colheu ${got}x ${ITEMS[CROPS[crop].item].name}`);
    }
  }

  // ------------------------------------------------------------ Interação
  // Descobre a ação que a tecla E faria agora (usado também para o texto de ajuda)
  resolve() {
    const g = this.g;
    const s = g.s;
    const p = s.player;
    if (s.riding) return { label: `Descer da ${VEHICLES[s.riding].name}`, run: () => this.exitVehicle() };
    if (this.build) return { label: 'Colocar construção', run: () => this.placeBuild() };

    for (const [id, v] of Object.entries(s.vehicles)) {
      if (hyp(p.x, p.z, v.x, v.z) < 3) {
        return { label: `Subir na ${VEHICLES[id].name}`, run: () => this.enterVehicle(id) };
      }
    }

    const fx = Math.sin(p.rot), fz = Math.cos(p.rot);
    const P = { x: p.x + fx * INTERACT_REACH, z: p.z + fz * INTERACT_REACH };
    const tool = this.currentTool();

    // 1) animais à frente
    let best = null, bestD = 1.6;
    for (const a of s.animals) {
      const rec = this.w.maps.animals.get(a.id);
      if (!rec) continue;
      const d = hyp(rec.group.position.x, rec.group.position.z, P.x, P.z);
      if (d < bestD) { bestD = d; best = a; }
    }
    if (best) {
      const def = ANIMALS[best.type];
      const name = def.name;
      if (def.tool === 'tesoura' && tool === 'tesoura') {
        return { label: `Tosquiar ${name.toLowerCase()} (lã: ${best.stock})`, run: () => this.g.shear(best) };
      }
      if (def.tool === 'balde' && tool === 'balde') {
        return { label: `Ordenhar ${name.toLowerCase()} (leite: ${best.stock})`, run: () => this.g.milk(best) };
      }
      if (def.tool && (tool !== def.tool)) {
        return { label: `${name}: use ${TOOLS[def.tool].name}`, run: () => this.info(this.describeAnimal(best)) };
      }
      return { label: `${name}: ${this.describeAnimal(best)}`, run: () => this.info(this.describeAnimal(best)) };
    }

    // 2) árvores e pedras
    for (const t of s.trees) {
      if (hyp(t.x, t.z, P.x, P.z) < t.r + 0.9) {
        if (tool === 'machado') return { label: 'Cortar árvore', run: () => g.chop(t) };
        return { label: 'Árvore: use o Machado (4)', run: () => this.info('Use o Machado (tecla 4).') };
      }
    }
    for (const r of s.rocks) {
      if (hyp(r.x, r.z, P.x, P.z) < r.r + 0.9) {
        if (tool === 'picareta') return { label: 'Quebrar pedra', run: () => g.mine(r) };
        return { label: 'Pedra: use a Picareta (5)', run: () => this.info('Use a Picareta (tecla 5).') };
      }
    }

    // 3) canteiros do campo
    const pl = g.plotAt(P.x, P.z);
    if (pl) {
      const plot = s.plots[pl.key];
      if (tool === 'mao' && g.isRipe(pl.key)) {
        return { label: `Colher ${CROPS[plot.crop].name}`, run: () => g.harvest(pl.key) };
      }
      if (tool === 'enxada' && !plot) return { label: 'Arar a terra', run: () => g.till(pl.key) };
      if (tool === 'regador' && plot) return { label: plot.crop ? `Regar ${CROPS[plot.crop].name}` : 'Regar a terra', run: () => { g.water(pl.key); } };
      if (tool === 'sementes') {
        if (!plot) return { label: 'Arar antes de plantar (Enxada, 2)', run: () => this.info('Use a Enxada (2) para arar a terra primeiro.') };
        if (!plot.crop) {
          const seed = s.selectedSeed;
          if (g.count(seed) <= 0) return { label: `Sem ${ITEMS[seed].name} (Q troca a semente)`, run: () => this.info(`Você não tem ${ITEMS[seed].name}. Compre na Loja (L).`) };
          return { label: `Plantar ${ITEMS[seed].name}`, run: () => g.plant(pl.key, seed) };
        }
      }
      if (plot && plot.crop && tool !== 'mao') {
        const c = CROPS[plot.crop];
        return { label: `${c.name}: ${Math.round(plot.growth * 100)}%`, run: () => this.info(`${c.name} em crescimento: ${Math.round(plot.growth * 100)}%`) };
      }
      if (plot && !plot.crop && tool === 'mao') return { label: 'Terra arada', run: () => this.info('Terra arada. Plante com Sementes (9).') };
      if (!plot && tool !== 'enxada') return { label: 'Terra não arada', run: () => this.info('Use a Enxada (2) para arar.') };
    }

    // 4) lago (na beira)
    const dl = hyp(P.x, P.z, LAKE.x, LAKE.z);
    if (dl > LAKE.r - 1 && dl < LAKE.r + 3) {
      if (tool === 'vara') {
        if (s.fishing) return { label: 'Pescando...', run: () => {} };
        return { label: 'Pescar', run: () => this.startFishing() };
      }
      return { label: `Lago (${s.lake.fish.length} peixes)`, run: () => this.info('Use a Vara de Pescar (8) na beira do lago.') };
    }

    // 5) construções próximas
    const b = g.buildingAt(p.x, p.z, 2.2);
    if (b) {
      const def = BUILDINGS[b.type];
      if (def.kind === 'store') return { label: 'Abrir a Loja', run: () => this.ui.openModal('loja') };
      if (def.kind === 'workshop') return { label: 'Abrir a Oficina', run: () => this.ui.openModal('oficina') };
      if (def.kind === 'processor') {
        const buf = Object.entries(b.data.buffer).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(', ') || 'vazio';
        const prog = b.data.active >= 0 ? ` · produzindo ${Math.round((b.data.progress / def.recipes[b.data.active].time) * 100)}%` : '';
        return { label: `${def.name}: colocar insumos (${buf}${prog})`, run: () => g.depositProcessor(b) };
      }
      if (def.kind === 'pen') {
        const animals = g.animalsIn(b.id);
        const hungry = animals.filter((a) => a.fed < 30).length;
        if (hungry && g.count('racao') > 0) {
          return { label: `Alimentar ${animals.length} animal(is) (${hungry} com fome)`, run: () => g.feedPen(b.id) };
        }
        return { label: `${def.name}: ${animals.length}/${def.capacity} animais${hungry ? ` (${hungry} com fome)` : ''}`, run: () => this.info(`${def.name}: ${animals.length} animais${hungry ? `, ${hungry} com fome — precisa de ração` : ', todos alimentados'}`) };
      }
      if (def.kind === 'apiary') {
        const n = s.hives.filter((h) => h.bid === b.id).length;
        return { label: `Apiário: ${n}/${BEES.maxHives} colmeias`, run: () => this.info(`Apiário com ${n} colmeia(s). Compre colmeias na Loja.`) };
      }
      return { label: def.name, run: () => this.info(`${def.name}`) };
    }
    return null;
  }

  describeAnimal(a) {
    const def = ANIMALS[a.type];
    const adult = a.age >= def.adultAge;
    const parts = [adult ? 'adulto' : `filhote (${Math.max(0, Math.ceil(def.adultAge - a.age))}s p/ crescer)`];
    parts.push(a.sex === 'F' ? 'fêmea' : 'macho');
    if (a.fed <= 0) parts.push('com fome');
    if (a.pregnant) parts.push('gestante');
    return parts.join(', ');
  }

  info(text) { this.ui.message(text); }

  interact() {
    const r = this.resolve();
    if (r && r.run) r.run();
  }

  enterVehicle(id) {
    this.g.s.riding = id;
    this.ui.message(`Você subiu na ${VEHICLES[id].name}. E para descer.`);
  }
  exitVehicle() {
    const s = this.g.s;
    const v = s.vehicles[s.riding];
    // desce ao lado do veículo
    s.player.x = v.x + Math.cos(v.rot) * 1.6;
    s.player.z = v.z - Math.sin(v.rot) * 1.6;
    s.player.rot = v.rot;
    if (this.g.blocked(s.player.x, s.player.z, 0.4)) { s.player.x = v.x; s.player.z = v.z - 2; }
    s.riding = null;
  }

  startFishing() {
    this.g.startFishing();
  }

  // ------------------------------------------------------------ Construção
  startBuild(type) {
    this.build = { type, rot: 0, valid: false, x: 0, z: 0 };
    this.ui.message(`Construindo ${BUILDINGS[type].name}. E coloca, R gira, Esc cancela.`);
  }
  cancelBuild() {
    this.build = null;
    this.w.setGhost(null);
  }
  placeBuild() {
    const b = this.build;
    if (!b) return;
    if (this.g.build(b.type, b.x, b.z, b.rot)) this.cancelBuild();
  }
  updateBuild() {
    const b = this.build;
    if (!b) { this.ui.setBuildBanner(null); return; }
    const p = this.g.s.player;
    const d = 5;
    // coloca a construção à frente do jogador, alinhada à grade de 1 metro
    const x = Math.round((p.x + Math.sin(p.rot) * d) * 2) / 2;
    const z = Math.round((p.z + Math.cos(p.rot) * d) * 2) / 2;
    b.x = x; b.z = z;
    b.valid = this.g.canPlace(b.type, x, z, b.rot);
    this.w.setGhost(b.type, x, z, b.rot, b.valid);
    this.ui.setBuildBanner(`🏗️ ${BUILDINGS[b.type].name} — ${b.valid ? 'E: colocar' : 'local inválido'} · R: girar · Esc: cancelar`);
  }

  // ------------------------------------------------------------ Quadro
  frame(dt) {
    this.update(dt);
    this.updateBuild();
    const s = this.g.s;
    if (s.fishing) this.ui.setFishing(1 - s.fishing.t / Math.max(0.1, s.fishing.total || 1));
    else this.ui.setFishing(null);
    if (!this.build && !this.ui.isOpen()) {
      const r = this.resolve();
      this.ui.setPrompt(r ? r.label : null);
    } else this.ui.setPrompt(null);
    if (s.riding) {
      this.ui.setVehicleHud(`${VEHICLES[s.riding].icon} ${VEHICLES[s.riding].name} · W/S acelerar · A/D virar · E descer`);
    } else this.ui.setVehicleHud(null);
    // câmera segue o jogador ou o veículo
    const p = s.riding ? s.vehicles[s.riding] : s.player;
    this.w.updateCamera({ x: p.x, y: 0, z: p.z }, this.yaw, this.pitch, this.dist);
    this.w.player.visible = !s.riding;
    this.w.player.position.set(s.player.x, 0, s.player.z);
    this.w.player.rotation.y = s.player.rot;
  }
}
