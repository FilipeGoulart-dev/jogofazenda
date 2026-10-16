// Lógica do jogo: estado, plantio, animais, peixes, abelhas, processamento,
// economia, missões, construção e salvamento. Não depende do Three.js.
import {
  ITEMS, SHOP_SEEDS, CROPS, FIELD, ANIMALS, FISH, BEES, BUILDINGS, TOOLS, UPGRADES,
  VEHICLES, MISSIONS, BASE_CAPACITY, SILO_CAPACITY, STARTER_BUILDINGS, LAKE, WORLD_HALF,
  START_POS, SAVE_KEY,
} from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Espécie de um animal (agrupa macho e fêmea)
export function speciesOf(type) {
  if (type === 'galinha' || type === 'galo') return 'galinha';
  if (type === 'vaca' || type === 'touro') return 'vaca';
  return 'ovelha';
}
const MAX_STOCK = 3;

export function newState() {
  const trees = [];
  const rocks = [];
  const lakeR = LAKE.r;
  let id = 1;
  const field = {
    x0: FIELD.x0 - 3, x1: FIELD.x0 + FIELD.cols * FIELD.tile + 3,
    z0: FIELD.z0 - 3, z1: FIELD.z0 + FIELD.rows * FIELD.tile + 3,
  };
  const occupiedBy = (x, z) => {
    if (x > field.x0 && x < field.x1 && z > field.z0 && z < field.z1) return true;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < lakeR + 4) return true;
    if (Math.hypot(x - START_POS.x, z - START_POS.z) < 5) return true;
    if (x > -8 && x < 20 && z > -14 && z < -2) return true; // área das construções iniciais
    return false;
  };
  for (let n = 0, tries = 0; n < 90 && tries < 4000; tries++) {
    const x = rand(-WORLD_HALF + 4, WORLD_HALF - 4), z = rand(-WORLD_HALF + 4, WORLD_HALF - 4);
    if (occupiedBy(x, z)) continue;
    trees.push({ id: id++, x, z, r: 0.9, hp: 3, kind: 'tree' });
    n++;
  }
  for (let n = 0, tries = 0; n < 30 && tries < 4000; tries++) {
    const x = rand(-WORLD_HALF + 4, WORLD_HALF - 4), z = rand(-WORLD_HALF + 4, WORLD_HALF - 4);
    if (occupiedBy(x, z)) continue;
    rocks.push({ id: id++, x, z, r: 0.8, hp: 3, kind: 'rock' });
    n++;
  }
  const state = {
    version: 1,
    started: Date.now(),
    time: 0,
    money: 600,
    xp: 0,
    inv: { semente_trigo: 6, semente_milho: 3, semente_cenoura: 3, racao: 10, madeira: 0, pedra: 0 },
    tools: {},
    selectedSlot: 1,
    selectedSeed: 'semente_trigo',
    upgrades: { irrigacao: 0, adubo: 0, nutricao: 0, ferramentas: 0 },
    vehicles: {}, // id -> {x, z, rot}
    riding: null,
    player: { x: START_POS.x, z: START_POS.z, rot: 0 },
    buildings: [],
    animals: [],
    plots: {}, // "i,j" -> {crop, growth, water}
    hives: [],
    lake: { fish: [], breedT: 0 },
    fishing: null,
    market: {},
    stats: { sold: {}, harvested: {}, births: {}, built: {}, produced: {}, fished: 0, earned: 0 },
    missionsDone: {},
    trees,
    rocks,
    nextId: id + 1000,
  };
  for (const [k, t] of Object.entries(TOOLS)) if (t.owned) state.tools[k] = true;
  for (const s of STARTER_BUILDINGS) {
    state.buildings.push({ id: state.nextId++, type: s.type, x: s.x, z: s.z, rot: s.rot, data: {} });
  }
  for (let i = 0; i < 6; i++) {
    state.lake.fish.push({ id: state.nextId++, sex: i % 2 ? 'M' : 'F', age: FISH.adultAge });
  }
  return state;
}

export class Game {
  constructor(state) {
    this.s = state;
    this.onMessage = () => {};
  }

  log(text) { this.onMessage(text); }

  // ------------------------------------------------------------ Util
  nextId() { return this.s.nextId++; }
  nutrition() { return UPGRADES.nutricao.levels[this.s.upgrades.nutricao - 1] || { mult: 1, feed: 90 }; }
  irrigation() { return UPGRADES.irrigacao.levels[this.s.upgrades.irrigacao - 1] || { water: 0 }; }
  capacity() {
    const silos = this.s.buildings.filter((b) => b.type === 'silo').length;
    return BASE_CAPACITY + silos * SILO_CAPACITY;
  }
  used() { return Object.values(this.s.inv).reduce((a, b) => a + b, 0); }
  count(item) { return this.s.inv[item] || 0; }
  has(obj) { return Object.entries(obj).every(([k, v]) => this.count(k) >= v); }

  // Adiciona itens ao inventário (respeitando o armazém). Retorna a quantidade aceita.
  addItem(item, n = 1, opts = {}) {
    const room = Math.max(0, this.capacity() - this.used());
    const add = Math.min(n, room);
    if (add <= 0) { this.log('Armazém cheio! Construa um silo ou venda itens.'); return 0; }
    if (add < n) this.log('Armazém quase cheio.');
    this.s.inv[item] = (this.s.inv[item] || 0) + add;
    if (opts.produce) this.s.stats.produced[item] = (this.s.stats.produced[item] || 0) + add;
    return add;
  }
  removeItem(item, n = 1) {
    if (this.count(item) < n) return false;
    this.s.inv[item] -= n;
    if (this.s.inv[item] <= 0) delete this.s.inv[item];
    return true;
  }
  addMoney(n, earned = false) {
    this.s.money += n;
    if (earned && n > 0) this.s.stats.earned += n;
  }
  spend(cost) {
    if (cost.money && this.s.money < cost.money) { this.log('Dinheiro insuficiente.'); return false; }
    for (const [k, v] of Object.entries(cost)) if (k !== 'money' && this.count(k) < v) {
      this.log(`Faltam ${v - this.count(k)} de ${ITEMS[k].name}.`); return false;
    }
    if (cost.money) this.s.money -= cost.money;
    for (const [k, v] of Object.entries(cost)) if (k !== 'money') this.removeItem(k, v);
    return true;
  }
  plotKey(i, j) { return `${i},${j}`; }
  plotCenter(i, j) {
    return { x: FIELD.x0 + i * FIELD.tile + FIELD.tile / 2, z: FIELD.z0 + j * FIELD.tile + FIELD.tile / 2 };
  }
  plotAt(x, z) {
    const i = Math.floor((x - FIELD.x0) / FIELD.tile);
    const j = Math.floor((z - FIELD.z0) / FIELD.tile);
    if (i < 0 || j < 0 || i >= FIELD.cols || j >= FIELD.rows) return null;
    return { i, j, key: this.plotKey(i, j) };
  }
  inField(x, z) { return !!this.plotAt(x, z); }

  // ------------------------------------------------------------ Colisão
  buildingRect(b) {
    const def = BUILDINGS[b.type];
    let [w, d] = def.size;
    if (b.rot % 2 === 1) [w, d] = [d, w];
    return { x0: b.x - w / 2, x1: b.x + w / 2, z0: b.z - d / 2, z1: b.z + d / 2 };
  }
  // true se um círculo de raio r em (x,z) colide com algo sólido
  blocked(x, z, r = 0.4) {
    if (Math.abs(x) > WORLD_HALF || Math.abs(z) > WORLD_HALF) return true;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + r) return true;
    for (const b of this.s.buildings) {
      const q = this.buildingRect(b);
      if (x > q.x0 - r && x < q.x1 + r && z > q.z0 - r && z < q.z1 + r) return true;
    }
    for (const o of this.s.trees.concat(this.s.rocks)) {
      if (Math.hypot(x - o.x, z - o.z) < o.r + r) return true;
    }
    return false;
  }
  // move (x,z) em direção a (nx,nz) deslizando pelas paredes
  moveWithCollision(x, z, nx, nz, r = 0.4) {
    if (!this.blocked(nx, nz, r)) return [nx, nz];
    if (!this.blocked(nx, z, r)) return [nx, z];
    if (!this.blocked(x, nz, r)) return [x, nz];
    return [x, z];
  }
  canPlace(type, x, z, rot) {
    const def = BUILDINGS[type];
    let [w, d] = def.size;
    if (rot % 2 === 1) [w, d] = [d, w];
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    if (x0 < -WORLD_HALF + 2 || x1 > WORLD_HALF - 2 || z0 < -WORLD_HALF + 2 || z1 > WORLD_HALF - 2) return false;
    // não pode sobrepor o campo, o lago ou outras construções
    if (x1 > FIELD.x0 - 1 && x0 < FIELD.x0 + FIELD.cols * FIELD.tile + 1 && z1 > FIELD.z0 - 1 && z0 < FIELD.z0 + FIELD.rows * FIELD.tile + 1) return false;
    const cx = Math.max(x0, Math.min(LAKE.x, x1)), cz = Math.max(z0, Math.min(LAKE.z, z1));
    if (Math.hypot(cx - LAKE.x, cz - LAKE.z) < LAKE.r + 1) return false;
    for (const b of this.s.buildings) {
      const q = this.buildingRect(b);
      if (x0 < q.x1 + 0.6 && x1 > q.x0 - 0.6 && z0 < q.z1 + 0.6 && z1 > q.z0 - 0.6) return false;
    }
    for (const o of this.s.trees.concat(this.s.rocks)) {
      const ox = Math.max(x0, Math.min(o.x, x1)), oz = Math.max(z0, Math.min(o.z, z1));
      if (Math.hypot(ox - o.x, oz - o.z) < o.r + 0.3) return false;
    }
    const p = this.s.player;
    if (p.x > x0 - 0.6 && p.x < x1 + 0.6 && p.z > z0 - 0.6 && p.z < z1 + 0.6) return false;
    return true;
  }

  // ------------------------------------------------------------ Construção
  build(type, x, z, rot) {
    const def = BUILDINGS[type];
    if (!def || def.buildable === false) return false;
    if (!this.canPlace(type, x, z, rot)) { this.log('Não é possível construir aqui.'); return false; }
    if (!this.spend(def.cost)) return false;
    const b = { id: this.nextId(), type, x, z, rot, data: {} };
    if (def.kind === 'processor') b.data = { buffer: {}, active: -1, progress: 0 };
    this.s.buildings.push(b);
    this.s.stats.built[type] = (this.s.stats.built[type] || 0) + 1;
    this.log(`${def.name} construído!`);
    return true;
  }
  buildingAt(x, z, pad = 2.2) {
    for (const b of this.s.buildings) {
      const q = this.buildingRect(b);
      if (x > q.x0 - pad && x < q.x1 + pad && z > q.z0 - pad && z < q.z1 + pad) return b;
    }
    return null;
  }
  penBuildings(penType) { return this.s.buildings.filter((b) => BUILDINGS[b.type].pen === penType); }
  animalsIn(bid) { return this.s.animals.filter((a) => a.bid === bid); }

  // ------------------------------------------------------------ Compras
  buySeed(seedId, n = 1) {
    const price = ITEMS[seedId].price;
    if (this.s.money < price * n) { this.log('Dinheiro insuficiente.'); return false; }
    this.s.money -= price * n;
    this.addItem(seedId, n);
    this.log(`Comprou ${n}x ${ITEMS[seedId].name}.`);
    return true;
  }
  buyAnimal(type) {
    const def = ANIMALS[type];
    const pens = this.penBuildings(def.pen);
    if (pens.length === 0) { this.log(`Construa um ${def.pen === 'redil' ? 'redil' : def.pen} primeiro.`); return false; }
    const pen = pens.find((b) => this.animalsIn(b.id).length < BUILDINGS[b.type].capacity);
    if (!pen) { this.log('Todas as cercas estão cheias.'); return false; }
    if (this.s.money < def.price) { this.log('Dinheiro insuficiente.'); return false; }
    this.s.money -= def.price;
    this.spawnAnimal(type, def.sex, pen.id, true);
    this.log(`Comprou ${def.name}.`);
    return true;
  }
  spawnAnimal(type, sex, bid, adult, age = 0) {
    const a = {
      id: this.nextId(), type, sex, bid,
      age: adult ? ANIMALS[type].adultAge : age,
      fed: adult ? this.nutrition().feed : 0, // segundos restantes de alimentação
      prodT: 0, stock: 0, layT: 0, pregnant: false, gestT: 0, cooldown: 0,
      hatch: [],
    };
    this.s.animals.push(a);
    return a;
  }
  buyFish() {
    if (this.s.lake.fish.length >= FISH.maxPopulation) { this.log('O lago está cheio de peixes.'); return false; }
    if (this.s.money < FISH.price) { this.log('Dinheiro insuficiente.'); return false; }
    this.s.money -= FISH.price;
    this.s.lake.fish.push({ id: this.nextId(), sex: Math.random() < 0.5 ? 'M' : 'F', age: FISH.adultAge });
    this.log('Peixe adulto solto no lago.');
    return true;
  }
  buyHive() {
    const apiaries = this.s.buildings.filter((b) => b.type === 'apiario');
    if (!apiaries.length) { this.log('Construa um Apiário primeiro.'); return false; }
    const ap = apiaries.find((b) => this.s.hives.filter((h) => h.bid === b.id).length < BEES.maxHives);
    if (!ap) { this.log('Todos os apiários estão cheios.'); return false; }
    if (this.s.money < BEES.price) { this.log('Dinheiro insuficiente.'); return false; }
    this.s.money -= BEES.price;
    this.s.hives.push({ id: this.nextId(), bid: ap.id, prodT: 0, swarmT: 0, honey: 0 });
    this.log('Colmeia instalada no apiário.');
    return true;
  }
  buyTool(id) {
    const t = TOOLS[id];
    if (this.s.tools[id]) return false;
    if (this.s.money < t.cost) { this.log('Dinheiro insuficiente.'); return false; }
    this.s.money -= t.cost;
    this.s.tools[id] = true;
    this.log(`${t.name} comprada!`);
    return true;
  }
  buyVehicle(id) {
    const v = VEHICLES[id];
    if (this.s.vehicles[id]) return false;
    if (this.s.money < v.cost) { this.log('Dinheiro insuficiente.'); return false; }
    this.s.money -= v.cost;
    // o veículo nasce perto da oficina
    this.s.vehicles[id] = { x: -3, z: -3.5 - Object.keys(this.s.vehicles).length * 2, rot: 0 };
    this.log(`${v.name} comprado! Ele está estacionado na oficina.`);
    return true;
  }
  upgradeLevelCost(id) {
    const lv = this.s.upgrades[id];
    const next = UPGRADES[id].levels[lv];
    return next ? next : null;
  }
  buyUpgrade(id) {
    const next = this.upgradeLevelCost(id);
    if (!next) { this.log('Já está no nível máximo.'); return false; }
    if (this.s.money < next.cost) { this.log('Dinheiro insuficiente.'); return false; }
    this.s.money -= next.cost;
    this.s.upgrades[id] += 1;
    this.log(`${UPGRADES[id].name} melhorada para o nível ${this.s.upgrades[id]}!`);
    return true;
  }

  // ------------------------------------------------------------ Venda
  priceOf(item) {
    const base = ITEMS[item].sell || 0;
    const m = this.s.market[item] ?? 1;
    const truck = this.s.vehicles.caminhao ? 1.2 : 1;
    return Math.max(1, Math.round(base * m * truck));
  }
  sell(item, n = 1) {
    const have = this.count(item);
    const amount = Math.min(n, have);
    if (amount <= 0) { this.log('Você não tem esse item.'); return 0; }
    let total = 0;
    for (let k = 0; k < amount; k++) {
      total += this.priceOf(item);
      const m = this.s.market[item] ?? 1;
      this.s.market[item] = Math.max(0.4, m * 0.97); // o preço cai um pouco a cada venda
    }
    this.removeItem(item, amount);
    this.addMoney(total, true);
    this.s.stats.sold[item] = (this.s.stats.sold[item] || 0) + amount;
    this.log(`Vendeu ${amount}x ${ITEMS[item].name} por R$ ${total}.`);
    return total;
  }
  sellable() {
    return Object.keys(this.s.inv).filter((k) => ITEMS[k] && ITEMS[k].sell && !['semente'].some((p) => k.startsWith(p)));
  }

  // ------------------------------------------------------------ Ferramentas
  chop(tree) {
    const bonus = this.s.upgrades.ferramentas;
    const got = 1 + bonus;
    this.addItem('madeira', got, { produce: true });
    tree.hp -= 1;
    if (tree.hp <= 0) {
      this.s.trees = this.s.trees.filter((t) => t !== tree);
      this.log('Árvore derrubada!');
    }
  }
  mine(rock) {
    this.addItem('pedra', 1 + this.s.upgrades.ferramentas, { produce: true });
    rock.hp -= 1;
    if (rock.hp <= 0) {
      this.s.rocks = this.s.rocks.filter((r) => r !== rock);
      this.log('Pedra quebrada!');
    }
  }
  till(key) {
    const p = this.s.plots;
    if (p[key]) return false;
    p[key] = { crop: null, growth: 0, water: 0 };
    return true;
  }
  plant(key, seedId) {
    const plot = this.s.plots[key];
    if (!plot || plot.crop) return false;
    const crop = Object.keys(CROPS).find((c) => CROPS[c].seed === seedId);
    if (!crop) return false;
    if (!this.removeItem(seedId, 1)) { this.log(`Sem ${ITEMS[seedId].name}.`); return false; }
    plot.crop = crop; plot.growth = 0; plot.water = 0;
    return true;
  }
  water(key) {
    const plot = this.s.plots[key];
    if (!plot) return false;
    plot.water = this.irrigation().water || 30;
    return true;
  }
  isRipe(key) { const p = this.s.plots[key]; return !!(p && p.crop && p.growth >= 1); }
  harvest(key, auto = false) {
    const plot = this.s.plots[key];
    if (!this.isRipe(key)) return 0;
    const crop = CROPS[plot.crop];
    const n = crop.yield + this.s.upgrades.adubo;
    plot.crop = null; plot.growth = 0; plot.water = 0;
    const got = this.addItem(crop.item, n, { produce: true });
    this.s.stats.harvested[crop.item] = (this.s.stats.harvested[crop.item] || 0) + got;
    if (!auto) this.log(`Colheu ${got}x ${ITEMS[crop.item].name}.`);
    return got;
  }

  // Animais: tosquia e ordenha
  shear(a) {
    if (a.stock <= 0) { this.log('A lã ainda não cresceu.'); return 0; }
    const n = a.stock + this.s.upgrades.ferramentas;
    a.stock = 0;
    this.addItem('la', n, { produce: true });
    this.log(`Tosquiou ${n}x lã.`);
    return n;
  }
  milk(a) {
    if (a.stock <= 0) { this.log('O leite ainda não desceu.'); return 0; }
    const n = a.stock + this.s.upgrades.ferramentas;
    a.stock = 0;
    this.addItem('leite', n, { produce: true });
    this.log(`Ordenhou ${n}x leite.`);
    return n;
  }
  feedPen(bid) {
    const hungry = this.animalsIn(bid).filter((a) => a.fed < 30);
    if (!hungry.length) { this.log('Os animais já estão alimentados.'); return 0; }
    if (this.count('racao') <= 0) { this.log('Você precisa de ração (moinho: milho → ração).'); return 0; }
    let fed = 0;
    for (const a of hungry) {
      if (!this.removeItem('racao', 1)) break;
      a.fed = this.nutrition().feed;
      fed++;
    }
    this.log(`Alimentou ${fed} animal(is).`);
    return fed;
  }
  // Processadores: colocar insumos e retirar produtos
  depositProcessor(b) {
    const def = BUILDINGS[b.type];
    const buf = b.data.buffer;
    let moved = 0;
    for (const r of def.recipes) {
      for (const [item, qty] of Object.entries(r.in)) {
        const cap = qty * 3;
        const need = cap - (buf[item] || 0);
        const take = Math.min(need, this.count(item));
        if (take > 0) {
          this.removeItem(item, take);
          buf[item] = (buf[item] || 0) + take;
          moved += take;
        }
      }
    }
    this.log(moved ? `Inseriu ${moved} insumo(s) na ${def.name}.` : `${def.name}: sem insumos para colocar.`);
    return moved;
  }
  // Fornecer a lista de receitas disponíveis (para a interface)
  recipeStatus(b) {
    const def = BUILDINGS[b.type];
    return def.recipes.map((r) => {
      const ok = Object.entries(r.in).every(([k, v]) => (b.data.buffer[k] || 0) >= v);
      return { r, ok };
    });
  }

  // ------------------------------------------------------------ Atualização (tick)
  update(dt) {
    const s = this.s;
    s.time += dt;
    this.updateCrops(dt);
    this.updateAnimals(dt);
    this.updateProcessors(dt);
    this.updateHives(dt);
    this.updateLake(dt);
    this.updateFishing(dt);
    this.updateMarket(dt);
    this.updateMissions();
  }

  updateCrops(dt) {
    for (const [key, p] of Object.entries(this.s.plots)) {
      if (p.water > 0) p.water = Math.max(0, p.water - dt);
      if (!p.crop) continue;
      const crop = CROPS[p.crop];
      // canteiros com água crescem em dobro; flores das abelhas (apiário) ajudam a polinizar
      const speed = (p.water > 0 ? 2 : 1);
      if (p.growth < 1) p.growth = Math.min(1, p.growth + (dt * speed) / crop.time);
    }
  }

  // Animais: fome, produção, gestação e nascimentos
  updateAnimals(dt) {
    const nut = this.nutrition();
    const s = this.s;
    for (const a of s.animals) {
      const def = ANIMALS[a.type];
      a.age += dt;
      if (a.fed > 0) a.fed = Math.max(0, a.fed - dt);
      if (a.cooldown > 0) a.cooldown = Math.max(0, a.cooldown - dt);
      if (a.age < def.adultAge || a.fed <= 0) continue; // filhotes e animais com fome não produzem
      const mult = nut.mult;

      if (a.type === 'galinha') {
        a.layT += dt * mult;
        if (a.layT >= def.layTime) {
          a.layT = 0;
          const fertile = this.animalsIn(a.bid).some((x) => x.type === 'galo' && x.age >= ANIMALS.galo.adultAge);
          if (fertile) {
            a.hatch.push({ t: 0 }); // ovo fértil: choca um pintinho
          } else {
            this.addItem('ovo', 1, { produce: true });
          }
        }
        for (const h of a.hatch) h.t += dt;
        const ready = a.hatch.filter((h) => h.t >= def.hatchTime);
        for (const h of ready) {
          const pen = BUILDINGS[this.s.buildings.find((b) => b.id === a.bid)?.type]?.capacity || 0;
          if (this.animalsIn(a.bid).length >= pen) break; // cercado cheio: o pintinho espera
          a.hatch.splice(a.hatch.indexOf(h), 1);
          const sex = Math.random() < 0.5 ? 'F' : 'M';
          this.spawnAnimal(sex === 'F' ? 'galinha' : 'galo', sex, a.bid, false, 0);
          this.s.stats.births.galinha = (this.s.stats.births.galinha || 0) + 1;
          this.log('Nasceu um pintinho!');
        }
        continue;
      }

      if (def.product && a.sex === 'F') {
        // Vacas e ovelhas acumulam leite/lã (até um limite) para serem coletados com ferramenta
        a.prodT += dt * mult;
        if (a.prodT >= def.prodTime) {
          a.prodT = 0;
          a.stock = Math.min(MAX_STOCK, a.stock + 1);
        }
      }

      // Reprodução: fêmea + macho adulto da mesma espécie na mesma cerca
      if (a.sex === 'F' && def.gestation) {
        if (a.pregnant) {
          a.gestT += dt * mult;
          if (a.gestT >= def.gestation) {
            const bid = a.bid;
            const pen = this.s.buildings.find((b) => b.id === bid);
            if (pen && this.animalsIn(bid).length < BUILDINGS[pen.type].capacity) {
              const sex = Math.random() < 0.5 ? 'F' : 'M';
              const kind = a.type === 'vaca' ? (sex === 'F' ? 'vaca' : 'touro') : (sex === 'F' ? 'ovelha' : 'carneiro');
              this.spawnAnimal(kind, sex, bid, false, 0);
              a.pregnant = false;
              a.gestT = 0;
              a.cooldown = def.postBirth;
              const sp = speciesOf(kind);
              this.s.stats.births[sp] = (this.s.stats.births[sp] || 0) + 1;
              this.log(`Nasceu ${ANIMALS[kind].name.toLowerCase()}!`);
            }
          }
        } else if (a.cooldown <= 0) {
          const male = this.animalsIn(a.bid).some((x) => x.type === (a.type === 'vaca' ? 'touro' : 'carneiro') && x.age >= ANIMALS[x.type].adultAge);
          if (male) {
            a.pregnant = true;
            a.gestT = 0;
          }
        }
      }
    }
    // remove qualquer animal que não tenha mais cerca válida (não deve acontecer, mas por segurança)
    s.animals = s.animals.filter((a) => s.buildings.some((b) => b.id === a.bid));
  }

  updateProcessors(dt) {
    for (const b of this.s.buildings) {
      const def = BUILDINGS[b.type];
      if (def.kind !== 'processor') continue;
      const d = b.data;
      if (d.active < 0) {
        // escolhe a primeira receita com insumos completos
        const i = def.recipes.findIndex((r) => Object.entries(r.in).every(([k, v]) => (d.buffer[k] || 0) >= v));
        if (i >= 0) { d.active = i; d.progress = 0; }
        continue;
      }
      const r = def.recipes[d.active];
      d.progress += dt;
      if (d.progress >= r.time) {
        // Só finaliza se o armazém tiver espaço para as saídas
        const outN = Object.values(r.out).reduce((a, b) => a + b, 0);
        if (this.capacity() - this.used() < outN) continue;
        for (const [k, v] of Object.entries(r.in)) d.buffer[k] -= v;
        for (const [k, v] of Object.entries(d.buffer)) if (v <= 0) delete d.buffer[k];
        for (const [k, v] of Object.entries(r.out)) this.addItem(k, v, { produce: true });
        d.active = -1; d.progress = 0;
      }
    }
  }

  updateHives(dt) {
    const s = this.s;
    const planted = Object.values(s.plots).filter((p) => p.crop).length;
    for (const h of s.hives) {
      h.prodT += dt;
      // polinização: mais canteiros plantados = mais mel
      if (h.prodT >= BEES.prodTime) {
        h.prodT = 0;
        const amount = planted >= 6 ? 2 : 1;
        this.addItem(BEES.product, amount, { produce: true });
        h.honey++;
        if (h.honey % 3 === 0) this.addItem(BEES.sideProduct, 1, { produce: true });
      }
      // enxame: colmeia forte gera nova colmeia no mesmo apiário (se houver espaço)
      h.swarmT += dt;
      if (h.swarmT >= BEES.swarmTime) {
        h.swarmT = 0;
        const count = s.hives.filter((x) => x.bid === h.bid).length;
        if (count < BEES.maxHives && Math.random() < 0.6) {
          s.hives.push({ id: this.nextId(), bid: h.bid, prodT: 0, swarmT: 0, honey: 0 });
          this.log('Um enxame formou uma nova colmeia!');
        }
      }
    }
  }

  // Lago: peixes adultos machos e fêmeas geram alevinos
  updateLake(dt) {
    const L = this.s.lake;
    for (const f of L.fish) f.age += dt;
    const adults = L.fish.filter((f) => f.age >= FISH.adultAge);
    const hasM = adults.some((f) => f.sex === 'M');
    const hasF = adults.some((f) => f.sex === 'F');
    if (hasM && hasF && L.fish.length < FISH.maxPopulation) {
      L.breedT += dt;
      if (L.breedT >= FISH.breedTime) {
        L.breedT = 0;
        L.fish.push({ id: this.nextId(), sex: Math.random() < 0.5 ? 'M' : 'F', age: 0 });
        this.s.stats.births.peixe = (this.s.stats.births.peixe || 0) + 1;
      }
    } else {
      L.breedT = 0;
    }
  }

  // Pesca: E na beira do lago inicia; ao terminar, pode pegar um peixe adulto
  startFishing() {
    if (this.s.fishing) return;
    this.s.fishing = { t: rand(2.5, 4.5) };
    this.s.fishing.total = this.s.fishing.t;
    this.log('Pescando...');
  }
  updateFishing(dt) {
    const f = this.s.fishing;
    if (!f) return;
    f.t -= dt;
    if (f.t > 0) return;
    this.s.fishing = null;
    const adults = this.s.lake.fish.filter((x) => x.age >= FISH.adultAge);
    if (!adults.length) { this.log('Não há peixes adultos no lago.'); return; }
    if (Math.random() < 0.25) { this.log('O peixe escapou!'); return; }
    const fish = pick(adults);
    this.s.lake.fish = this.s.lake.fish.filter((x) => x !== fish);
    this.addItem('peixe', 1, { produce: true });
    this.s.stats.fished++;
    this.log('Você pescou um peixe!');
  }

  updateMarket(dt) {
    for (const k of Object.keys(this.s.market)) {
      const m = this.s.market[k];
      // o preço volta lentamente ao normal, com pequenas variações do mercado
      const next = m + (1 - m) * dt * 0.01 + (Math.random() - 0.5) * 0.002;
      this.s.market[k] = Math.max(0.4, Math.min(1.4, next));
    }
  }

  // ------------------------------------------------------------ Missões
  missionProgress(m) {
    const s = this.s;
    switch (m.type) {
      case 'harvest': return s.stats.harvested[m.key] || 0;
      case 'build': return s.stats.built[m.key] || 0;
      case 'sell': return s.stats.sold[m.key] || 0;
      case 'produce': return s.stats.produced[m.key] || 0;
      case 'birth': return s.stats.births[speciesOf(m.key)] || 0;
      case 'owned': return s.vehicles[m.key] || s.tools[m.key] ? 1 : 0;
      case 'fish': return s.stats.fished;
      case 'money': return s.stats.earned;
      case 'upgrade': return s.upgrades[m.key] || 0;
      default: return 0;
    }
  }
  activeMissions(n = 3) {
    return MISSIONS.filter((m) => !this.s.missionsDone[m.id]).slice(0, n);
  }
  updateMissions() {
    for (const m of MISSIONS) {
      if (this.s.missionsDone[m.id]) continue;
      if (this.missionProgress(m) >= m.target) {
        this.s.missionsDone[m.id] = true;
        this.addMoney(m.reward);
        this.s.xp += Math.round(m.reward / 10);
        this.log(`Missão concluída: ${m.text}! +R$ ${m.reward}`);
      }
    }
  }
  level() { return Math.floor(this.s.xp / 100) + 1; }

  // ------------------------------------------------------------ Salvamento
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.s));
      return true;
    } catch (e) { return false; }
  }
  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.version !== 1) return null;
      return s;
    } catch (e) { return null; }
  }
  static clear() { localStorage.removeItem(SAVE_KEY); }
}
