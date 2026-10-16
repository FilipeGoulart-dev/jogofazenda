// Interface do usuário (DOM): HUD, barra de atalhos, mensagens e painéis.
import {
  ITEMS, SHOP_SEEDS, ANIMALS, FISH, BEES, BUILDINGS, TOOLS, UPGRADES, VEHICLES, MISSIONS,
  MAX_LEVEL_UPGRADE, BASE_CAPACITY,
} from './config.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `R$ ${Number(n).toLocaleString('pt-BR')}`;

const TABS = {
  loja: [['comprar', 'Comprar'], ['vender', 'Vender']],
  oficina: [['ferramentas', 'Ferramentas'], ['veiculos', 'Veículos'], ['melhorias', 'Melhorias']],
  construir: [['construir', 'Construções']],
  missoes: [['missoes', 'Missões']],
  inventario: [['inventario', 'Inventário']],
  ajuda: [['ajuda', 'Controles']],
};
const TITLES = {
  loja: '🏪 Loja', oficina: '🔧 Oficina', construir: '🏗️ Construção', missoes: '📜 Missões',
  inventario: '🎒 Inventário', ajuda: '❓ Ajuda',
};

export class UI {
  constructor(game, hooks) {
    this.g = game;
    this.hooks = hooks; // { startBuild(type), onNewGame(), onContinue() }
    this.modal = null;
    this.modalTab = null;
    this.modalT = 0;
    this.msgs = [];
    this.bindStatic();
  }

  bindStatic() {
    $('#modal-close').onclick = () => this.closeModal();
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    $('#modal-body').addEventListener('click', (e) => this.onBodyClick(e));
    $('#modal-tabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (t) { this.modalTab = t.dataset.tab; this.renderModal(); }
    });
    $('#hotbar').addEventListener('click', (e) => {
      const s = e.target.closest('[data-slot]');
      if (s) this.hooks.selectSlot(Number(s.dataset.slot));
    });
  }

  // ---------------------------------------------------------- Mensagens
  message(text) {
    const el = document.createElement('div');
    el.className = 'msg';
    el.textContent = text;
    const box = $('#messages');
    box.appendChild(el);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), 4200);
  }

  // ---------------------------------------------------------- HUD
  updateHud() {
    const g = this.g;
    const s = g.s;
    $('#money').textContent = money(Math.floor(s.money));
    $('#level').textContent = `Nível ${g.level()}`;
    const used = g.used();
    $('#store').textContent = `Armazém ${used}/${g.capacity()}`;
    const tip = Object.entries(s.market)
      .filter(([k, v]) => ['trigo', 'leite', 'ovo', 'queijo', 'mel'].includes(k) && Math.abs(v - 1) > 0.05)
      .map(([k, v]) => `${ITEMS[k].icon} ${Math.round(v * 100)}%`).join('  ');
    $('#market-tip').textContent = tip ? `Preço de mercado: ${tip}` : '';
    this.updateMissions();
  }

  updateMissions() {
    const list = this.g.activeMissions(3);
    $('#missions-list').innerHTML = list.map((m) => {
      const p = Math.min(this.g.missionProgress(m), m.target);
      const pct = Math.round((p / m.target) * 100);
      return `<div class="mission"><div>${esc(m.text)}</div>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <div class="small">${p}/${m.target} · <span class="reward">R$ ${m.reward}</span></div></div>`;
    }).join('') || '<div>Todas as missões concluídas! 🎉</div>';
  }

  renderHotbar(selected, selectedSeed) {
    const html = Object.entries(TOOLS).sort((a, b) => a[1].slot - b[1].slot).map(([id, t]) => {
      const owned = this.g.s.tools[id];
      const isSeed = id === 'sementes';
      const icon = isSeed ? (ITEMS[selectedSeed]?.icon || '🌱') : t.icon;
      const label = isSeed ? (ITEMS[selectedSeed]?.name.replace('Semente de ', '').replace('Muda de ', '') || 'Sementes') : t.name;
      const cnt = isSeed ? this.g.count(selectedSeed) : '';
      return `<div class="slot ${selected === t.slot ? 'sel' : ''} ${owned ? '' : 'locked'}" data-slot="${t.slot}">
        <span class="n">${t.slot}</span><span class="ic">${icon}</span>
        <span class="lbl">${esc(label)}</span>${cnt !== '' ? `<span class="cnt">${cnt}</span>` : ''}
        ${owned ? '' : '<span class="cnt">🔒</span>'}</div>`;
    }).join('');
    $('#hotbar').innerHTML = html;
  }

  setPrompt(text) {
    const el = $('#prompt');
    if (!text) { el.classList.add('hidden'); return; }
    el.innerHTML = `<kbd>E</kbd>${esc(text)}`;
    el.classList.remove('hidden');
  }

  setBuildBanner(text) {
    const el = $('#build-banner');
    if (!text) { el.classList.add('hidden'); return; }
    el.textContent = text;
    el.classList.remove('hidden');
  }

  setFishing(p) {
    const el = $('#fishing');
    if (p == null) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    $('#fish-bar').style.width = `${Math.round(p * 100)}%`;
  }

  setVehicleHud(text) {
    const el = $('#vehicle-hud');
    if (!text) { el.classList.add('hidden'); return; }
    el.innerHTML = text;
    el.classList.remove('hidden');
  }

  // ---------------------------------------------------------- Modal
  openModal(kind) {
    this.modal = kind;
    this.modalTab = TABS[kind][0][0];
    $('#modal').classList.remove('hidden');
    this.renderModal();
  }
  closeModal() {
    this.modal = null;
    $('#modal').classList.add('hidden');
  }
  isOpen() { return !!this.modal; }
  tick(dt) {
    this.hudT = (this.hudT || 0) + dt;
    if (this.hudT > 0.25) { this.hudT = 0; this.updateHud(); }
    if (this.modal) {
      this.modalT += dt;
      if (this.modalT > 0.5) { this.modalT = 0; this.renderModal(true); }
    }
  }

  renderModal(keepScroll = false) {
    if (!this.modal) return;
    const body = $('#modal-body');
    const scroll = keepScroll ? body.scrollTop : 0;
    $('#modal-title').textContent = TITLES[this.modal];
    $('#modal-tabs').innerHTML = TABS[this.modal].map(([id, label]) =>
      `<button class="tab ${this.modalTab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`).join('');
    const render = {
      loja: () => (this.modalTab === 'comprar' ? this.shopBuy() : this.shopSell()),
      oficina: () => ({ ferramentas: () => this.workshopTools(), veiculos: () => this.workshopVehicles(), melhorias: () => this.workshopUpgrades() }[this.modalTab])(),
      construir: () => this.buildList(),
      missoes: () => this.missionList(),
      inventario: () => this.inventoryView(),
      ajuda: () => this.helpView(),
    }[this.modal];
    body.innerHTML = render();
    body.scrollTop = scroll;
  }

  onBodyClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const { act, id, n } = el.dataset;
    const g = this.g;
    switch (act) {
      case 'buy-seed': g.buySeed(id, 1); break;
      case 'buy-animal': g.buyAnimal(id); break;
      case 'buy-fish': g.buyFish(); break;
      case 'buy-hive': g.buyHive(); break;
      case 'sell': g.sell(id, Number(n)); break;
      case 'sell-all': g.sell(id, g.count(id)); break;
      case 'buy-tool': g.buyTool(id); break;
      case 'buy-vehicle': g.buyVehicle(id); break;
      case 'buy-upgrade': g.buyUpgrade(id); break;
      case 'start-build': this.hooks.startBuild(id); this.closeModal(); return;
      default: return;
    }
    this.renderModal(true);
    this.updateHud();
  }

  shopBuy() {
    const g = this.g;
    const seeds = SHOP_SEEDS.map((id) => `<div class="item">
        <div class="ic">${ITEMS[id].icon}</div>
        <div class="info"><div class="title">${ITEMS[id].name}</div>
        <div class="desc">Você tem: ${g.count(id)}</div></div>
        <div class="price">${money(ITEMS[id].price)}</div>
        <button class="btn small-btn" data-act="buy-seed" data-id="${id}">Comprar</button></div>`).join('');
    const animals = Object.entries(ANIMALS).filter(([, a]) => a.sex === 'F' || a.sex === 'M').map(([id, a]) => {
      const pensOk = g.penBuildings(a.pen).length > 0;
      return `<div class="item ${pensOk ? '' : 'disabled'}">
        <div class="ic">${ANIMALS[id].sex === 'F' ? '♀' : '♂'}</div>
        <div class="info"><div class="title">${a.name} (${a.sex === 'F' ? 'fêmea' : 'macho'})</div>
        <div class="desc">Cerca: ${BUILDINGS[a.pen] ? BUILDINGS[a.pen].name : a.pen}${pensOk ? '' : ' — construa primeiro'}</div></div>
        <div class="price">${money(a.price)}</div>
        <button class="btn small-btn" data-act="buy-animal" data-id="${id}">Comprar</button></div>`;
    }).join('');
    const fish = `<div class="item">
        <div class="ic">🐟</div>
        <div class="info"><div class="title">${FISH.name} adulta (♂ ou ♀)</div>
        <div class="desc">No lago: ${g.s.lake.fish.length}/${FISH.maxPopulation} · Precisa de macho e fêmea para reproduzir</div></div>
        <div class="price">${money(FISH.price)}</div>
        <button class="btn small-btn" data-act="buy-fish">Soltar</button></div>`;
    const hive = `<div class="item">
        <div class="ic">🐝</div>
        <div class="info"><div class="title">${BEES.name} de abelhas</div>
        <div class="desc">Produz mel e cera no Apiário · Colônias fortes criam enxames</div></div>
        <div class="price">${money(BEES.price)}</div>
        <button class="btn small-btn" data-act="buy-hive">Instalar</button></div>`;
    return `<div class="section">Sementes</div><div class="list">${seeds}</div>
      <div class="section">Animais (compra adulta)</div><div class="list">${animals}</div>
      <div class="section">Lago e apiário</div><div class="list">${fish}${hive}</div>
      <p class="small">Dinheiro: <b>${money(Math.floor(g.s.money))}</b></p>`;
  }

  shopSell() {
    const g = this.g;
    const items = g.sellable();
    if (!items.length) return '<p>Você não tem produtos para vender. Plante, crie animais e processe alimentos!</p>';
    const rows = items.map((id) => {
      const it = ITEMS[id];
      const p = g.priceOf(id);
      const mk = Math.round((g.s.market[id] ?? 1) * 100);
      return `<div class="item">
        <div class="ic">${it.icon}</div>
        <div class="info"><div class="title">${it.name} <span class="small">(${g.count(id)})</span></div>
        <div class="desc">Mercado: ${mk}%${g.s.vehicles.caminhao ? ' · +20% caminhão' : ''}</div></div>
        <div class="price">${money(p)}</div>
        <button class="btn small-btn" data-act="sell" data-id="${id}" data-n="1">Vender 1</button>
        <button class="btn small-btn" data-act="sell" data-id="${id}" data-n="10">Vender 10</button>
        <button class="btn small-btn" data-act="sell-all" data-id="${id}">Tudo</button></div>`;
    }).join('');
    return `<div class="list">${rows}</div>`;
  }

  workshopTools() {
    const g = this.g;
    const rows = Object.entries(TOOLS).filter(([, t]) => !t.owned).map(([id, t]) => {
      const owned = g.s.tools[id];
      return `<div class="item ${owned ? 'disabled' : ''}">
        <div class="ic">${t.icon}</div>
        <div class="info"><div class="title">${t.name}</div>
        <div class="desc">${toolDesc(id)}</div></div>
        <div class="price">${owned ? 'Comprada' : money(t.cost)}</div>
        <button class="btn small-btn" data-act="buy-tool" data-id="${id}" ${owned ? 'disabled' : ''}>${owned ? '✔' : 'Comprar'}</button></div>`;
    }).join('');
    return `<div class="list">${rows}</div><p class="small">Ferramentas do início: Mãos, Enxada, Regador, Machado, Picareta e Sementes.</p>`;
  }

  workshopVehicles() {
    const g = this.g;
    const rows = Object.entries(VEHICLES).map(([id, v]) => {
      const owned = g.s.vehicles[id];
      return `<div class="item ${owned ? 'disabled' : ''}">
        <div class="ic">${v.icon}</div>
        <div class="info"><div class="title">${v.name}</div><div class="desc">${v.desc}</div></div>
        <div class="price">${owned ? 'Comprado' : money(v.cost)}</div>
        <button class="btn small-btn" data-act="buy-vehicle" data-id="${id}" ${owned ? 'disabled' : ''}>${owned ? '✔' : 'Comprar'}</button></div>`;
    }).join('');
    return `<div class="list">${rows}</div><p class="small">Aproxime-se de um veículo e pressione <b>E</b> para subir. Use W/S para andar e A/D para virar.</p>`;
  }

  workshopUpgrades() {
    const g = this.g;
    const rows = Object.entries(UPGRADES).map(([id, u]) => {
      const lv = g.s.upgrades[id];
      const next = u.levels[lv];
      const bars = Array.from({ length: MAX_LEVEL_UPGRADE }, (_, i) => `<span class="${i < lv ? 'on' : ''}"></span>`).join('');
      return `<div class="item">
        <div class="info"><div class="title">${u.name}</div><div class="desc">${u.desc}</div>
        <div class="lvl" style="margin-top:4px">${bars}</div></div>
        <div class="price">${next ? money(next.cost) : 'Máx.'}</div>
        <button class="btn small-btn" data-act="buy-upgrade" data-id="${id}" ${next ? '' : 'disabled'}>Melhorar</button></div>`;
    }).join('');
    return `<div class="list">${rows}</div>`;
  }

  buildList() {
    const g = this.g;
    const cards = Object.entries(BUILDINGS).filter(([, b]) => b.buildable !== false).map(([id, b]) => {
      const cost = Object.entries(b.cost).map(([k, v]) => (k === 'money' ? money(v) : `${v} ${ITEMS[k].icon}`)).join(' · ');
      const extra = b.kind === 'pen' ? `Cabe ${b.capacity} animais (${ANIMALS[Object.keys(ANIMALS).find((a) => ANIMALS[a].pen === b.pen)].name}s)`
        : b.kind === 'processor' ? b.recipes.map((r) => `${Object.entries(r.in).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(' + ')} → ${Object.entries(r.out).map(([k, v]) => `${v} ${ITEMS[k].name}`).join(' + ')}`).join('<br>')
          : b.kind === 'apiary' ? `Até ${BEES.maxHives} colmeias`
          : b.kind === 'silo' ? '+40 de capacidade de armazém' : '';
      return `<div class="card">
        <div class="ic">${esc(b.kind === 'pen' ? '🐔' : b.kind === 'apiary' ? '🐝' : b.kind === 'silo' ? '🌾' : b.kind === 'processor' ? '⚙️' : '🏠')}</div>
        <div class="title">${esc(b.name)}</div>
        <div class="desc">${extra}</div>
        <div class="small">Custo: ${cost}</div>
        <button class="btn" data-act="start-build" data-id="${id}">Construir</button>
      </div>`;
    }).join('');
    return `<div class="grid">${cards}</div>
      <p class="small">Depois de escolher, o fantasma verde/vermelho aparece à sua frente. Use <b>E</b> para colocar, <b>R</b> para girar e <b>Esc</b> para cancelar.</p>`;
  }

  missionList() {
    const g = this.g;
    return `<div class="list">${MISSIONS.map((m) => {
      const done = g.s.missionsDone[m.id];
      const p = Math.min(g.missionProgress(m), m.target);
      return `<div class="item ${done ? 'disabled' : ''}">
        <div class="ic">${done ? '✅' : '🎯'}</div>
        <div class="info"><div class="title">${esc(m.text)}</div>
        <div class="desc">${p}/${m.target}</div></div>
        <div class="price">R$ ${m.reward}</div></div>`;
    }).join('')}</div>`;
  }

  inventoryView() {
    const g = this.g;
    const items = Object.entries(g.s.inv).filter(([, n]) => n > 0);
    const used = g.used(), cap = g.capacity();
    const rows = items.map(([k, n]) => `<div class="item"><div class="ic">${ITEMS[k].icon}</div>
      <div class="info"><div class="title">${ITEMS[k].name}</div></div><div class="price">× ${n}</div></div>`).join('');
    const tools = Object.keys(g.s.tools).map((k) => `${TOOLS[k].icon} ${TOOLS[k].name}`).join(' · ');
    const pen = g.s.animals.length;
    return `<p><b>Dinheiro:</b> ${money(Math.floor(g.s.money))} · <b>Nível:</b> ${g.level()} · <b>XP:</b> ${g.s.xp}</p>
      <div class="capbar"><div style="width:${Math.min(100, (used / cap) * 100)}%"></div></div>
      <p class="small">Armazém: ${used}/${cap} (base ${BASE_CAPACITY}; cada silo +40)</p>
      <p class="small">Animais: ${pen} · Peixes: ${g.s.lake.fish.length} · Colmeias: ${g.s.hives.length} · Veículos: ${Object.keys(g.s.vehicles).map((v) => VEHICLES[v].name).join(', ') || 'nenhum'}</p>
      <p class="small">Ferramentas: ${tools}</p>
      <div class="list">${rows || '<p>Vazio.</p>'}</div>`;
  }

  helpView() {
    return `<div class="help-list">
      <div><kbd>W A S D</kbd> andar · <kbd>Shift</kbd> correr · arraste o mouse para girar a câmera · roda do mouse: zoom</div>
      <div><kbd>E</kbd> interagir com o que está à frente (colher, arar, plantar, cortar árvore, ordenhar, tosquiar, pescar, alimentar, comprar…)</div>
      <div><kbd>1</kbd>–<kbd>9</kbd> escolher ferramenta na barra · <kbd>Q</kbd> trocar a semente</div>
      <div><kbd>B</kbd> construir · <kbd>R</kbd> girar construção · <kbd>Esc</kbd> cancelar</div>
      <div><kbd>L</kbd> loja (comprar/vender) · <kbd>O</kbd> oficina (ferramentas, veículos, melhorias) · <kbd>M</kbd> missões · <kbd>I</kbd> inventário</div>
      <hr>
      <p><b>Dicas:</b></p>
      <ul>
        <li><b>Plantação:</b> lavre com a <i>Enxada</i> (1 toque), plante com <i>Sementes</i>, regue com o <i>Regador</i> (cresce 2× mais rápido) e colha quando estiver maduro.</li>
        <li><b>Animais:</b> para filhotes você precisa de <b>macho e fêmea</b> adultos na mesma cerca. Galinhas com galo geram pintinhos; sem galo, põem ovos para vender. Vacas dão leite (use o <i>Balde</i>) e ovelhas dão lã (use a <i>Tesoura</i>).</li>
        <li><b>Alimentação:</b> aproxime-se da cerca com <i>ração</i> no inventário e pressione <b>E</b>. Ração vem do moinho (milho).</li>
        <li><b>Lago:</b> com a <i>Vara de Pescar</i> na beira do lago. Peixes precisam de macho e fêmea para se reproduzir.</li>
        <li><b>Apiário:</b> construa um apiário e instale colmeias na Loja. Mais canteiros plantados = mais mel.</li>
        <li><b>Processamento:</b> leve insumos ao moinho, queijaria, tecelagem ou padaria e pressione <b>E</b> para colocar; os produtos vão para o inventário.</li>
        <li><b>Venda:</b> os preços caem um pouco a cada venda e voltam com o tempo. Caminhão dá +20%.</li>
      </ul>
    </div>`;
  }
}

function toolDesc(id) {
  return {
    tesoura: 'Tosquia ovelhas e carneiros para pegar lã.',
    balde: 'Ordenha vacas para pegar leite.',
    vara: 'Pesca peixes no lago (beira da água).',
  }[id] || '';
}

export { TABS, TITLES };
