// Configurações e tabelas de dados do jogo (valores de balanceamento ficam aqui).

export const MAX_LEVEL_UPGRADE = 3;
export const BASE_CAPACITY = 100; // unidades de armazém sem silos
export const SILO_CAPACITY = 40;
export const PLAYER_SPEED = 5.2;
export const PLAYER_RUN_MULT = 1.6;
export const INTERACT_REACH = 1.9; // distância do ponto à frente do jogador para agir

// ---------------------------------------------------------------- Itens
// category: semente | colheita | animal | producao | processado | material
export const ITEMS = {
  semente_trigo:   { name: 'Semente de Trigo',    icon: '🌾', price: 6,  category: 'semente' },
  semente_milho:   { name: 'Semente de Milho',    icon: '🌽', price: 8,  category: 'semente' },
  semente_cenoura: { name: 'Semente de Cenoura',  icon: '🥕', price: 10, category: 'semente' },
  semente_morango: { name: 'Muda de Morango',     icon: '🍓', price: 14, category: 'semente' },
  trigo:   { name: 'Trigo',    icon: '🌾', sell: 9,   category: 'colheita' },
  milho:   { name: 'Milho',    icon: '🌽', sell: 11,  category: 'colheita' },
  cenoura: { name: 'Cenoura',  icon: '🥕', sell: 14,  category: 'colheita' },
  morango: { name: 'Morango',  icon: '🍓', sell: 22,  category: 'colheita' },
  ovo:     { name: 'Ovo',      icon: '🥚', sell: 7,   category: 'producao' },
  leite:   { name: 'Leite',    icon: '🥛', sell: 11,  category: 'producao' },
  la:      { name: 'Lã',       icon: '🧶', sell: 15,  category: 'producao' },
  mel:     { name: 'Mel',      icon: '🍯', sell: 19,  category: 'producao' },
  cera:    { name: 'Cera',     icon: '🕯️', sell: 9,   category: 'producao' },
  peixe:   { name: 'Peixe',    icon: '🐟', sell: 16,  category: 'producao' },
  farinha: { name: 'Farinha',  icon: '🥡', sell: 17,  category: 'processado' },
  racao:   { name: 'Ração',    icon: '🥣', sell: 12,  category: 'processado' },
  queijo:  { name: 'Queijo',   icon: '🧀', sell: 42,  category: 'processado' },
  tecido:  { name: 'Tecido',   icon: '🧵', sell: 46,  category: 'processado' },
  pao:     { name: 'Pão',      icon: '🍞', sell: 36,  category: 'processado' },
  madeira: { name: 'Madeira',  icon: '🪵', sell: 4,   category: 'material' },
  pedra:   { name: 'Pedra',    icon: '🪨', sell: 3,   category: 'material' },
};

// Itens que podem ser comprados na loja (não vendem na loja para evitar exploração)
export const SHOP_SEEDS = ['semente_trigo', 'semente_milho', 'semente_cenoura', 'semente_morango'];

// ---------------------------------------------------------------- Plantações
export const CROPS = {
  trigo:   { name: 'Trigo',    seed: 'semente_trigo',   time: 35, color: 0xd9b441, yield: 3, item: 'trigo' },
  milho:   { name: 'Milho',    seed: 'semente_milho',   time: 55, color: 0x3a9d3a, yield: 2, item: 'milho' },
  cenoura: { name: 'Cenoura',  seed: 'semente_cenoura', time: 28, color: 0xe8772e, yield: 3, item: 'cenoura' },
  morango: { name: 'Morango',  seed: 'semente_morango', time: 45, color: 0xd9304a, yield: 4, item: 'morango' },
};

// Campo de plantio (grade de canteiros). Coordenadas do centro de cada canteiro: x0 + i*tile
export const FIELD = { x0: -34, z0: -10, cols: 12, rows: 10, tile: 2 };

// ---------------------------------------------------------------- Animais
// sex: 'F' fêmea / 'M' macho. Machos e fêmeas adultos na mesma cerca geram filhotes.
export const ANIMALS = {
  galinha: {
    name: 'Galinha', sex: 'F', pen: 'galinheiro', price: 45, adultAge: 40, size: 0.45,
    // Galinhas põem ovos a cada `layTime`s. Com um galo na cerca, o ovo é fértil e choca um pintinho.
    layTime: 30, product: 'ovo', hatchTime: 35, color: 0xffffff, comb: 0xd6322b,
  },
  galo: {
    name: 'Galo', sex: 'M', pen: 'galinheiro', price: 45, adultAge: 40, size: 0.5,
    color: 0xb8432a, comb: 0xd6322b,
  },
  vaca: {
    name: 'Vaca', sex: 'F', pen: 'curral', price: 300, adultAge: 110, size: 1.1,
    gestation: 90, postBirth: 45, prodTime: 50, product: 'leite', tool: 'balde',
    color: 0xf3f0e8, spot: 0x2b2b2b,
  },
  touro: {
    name: 'Touro', sex: 'M', pen: 'curral', price: 300, adultAge: 110, size: 1.25,
    color: 0x8a5a3a, spot: 0x3a2a1a,
  },
  ovelha: {
    name: 'Ovelha', sex: 'F', pen: 'redil', price: 140, adultAge: 70, size: 0.8,
    gestation: 60, postBirth: 30, prodTime: 70, product: 'la', tool: 'tesoura',
    color: 0xf5f5f0, face: 0x3a3028,
  },
  carneiro: {
    name: 'Carneiro', sex: 'M', pen: 'redil', price: 140, adultAge: 70, size: 0.95,
    color: 0xe9e4d6, face: 0x3a3028,
  },
};

// Peixes (lago). Macho e fêmea adultos no lago geram alevinos.
export const FISH = {
  name: 'Tilápia', price: 30, adultAge: 60, breedTime: 40, maxPopulation: 18,
  maleColor: 0x3f7fd0, femaleColor: 0xe4875a,
};

// Colmeias (apiário). Cada colmeia produz mel; quando prospera, pode gerar um enxame (nova colmeia).
export const BEES = {
  name: 'Colmeia', price: 180, prodTime: 45, swarmTime: 150, maxHives: 4, product: 'mel', sideProduct: 'cera',
};

// ---------------------------------------------------------------- Construções
// kind: pen (cercado de animais) | apiary | processor | store | workshop | silo | decor
export const BUILDINGS = {
  // Construções iniciais (não podem ser construídas de novo)
  casa:       { name: 'Casa',       kind: 'decor', size: [5, 4], color: 0xd9c9a3, buildable: false },
  loja:       { name: 'Loja',       kind: 'store', size: [4, 3], color: 0xe0764a, buildable: false },
  oficina:    { name: 'Oficina',    kind: 'workshop', size: [4, 3], color: 0x6f7d8c, buildable: false },
  galinheiro: { name: 'Galinheiro', kind: 'pen', pen: 'galinheiro', capacity: 8, size: [6, 4], color: 0xc9a46a,
    cost: { money: 250, madeira: 12 } },
  curral:     { name: 'Curral',     kind: 'pen', pen: 'curral', capacity: 6, size: [8, 6], color: 0x8a6240,
    cost: { money: 450, madeira: 20, pedra: 6 } },
  redil:      { name: 'Redil',      kind: 'pen', pen: 'redil', capacity: 8, size: [7, 5], color: 0xa98a5c,
    cost: { money: 350, madeira: 16 } },
  apiario:    { name: 'Apiário',    kind: 'apiary', size: [4, 4], color: 0xe2b33c,
    cost: { money: 300, madeira: 12 } },
  silo:       { name: 'Silo (+40 armazém)', kind: 'silo', size: [3, 3], color: 0xb9b9b9,
    cost: { money: 300, pedra: 15, madeira: 10 } },
  moinho:     { name: 'Moinho',     kind: 'processor', size: [3, 3], color: 0xcfc4a6,
    recipes: [
      { in: { trigo: 3 }, out: { farinha: 1 }, time: 12 },
      { in: { milho: 2 }, out: { racao: 3 }, time: 8 },
    ],
    cost: { money: 300, madeira: 15, pedra: 5 } },
  queijaria:  { name: 'Queijaria',  kind: 'processor', size: [3, 3], color: 0xf0e0a0,
    recipes: [{ in: { leite: 2 }, out: { queijo: 1 }, time: 15 }],
    cost: { money: 350, madeira: 10, pedra: 15 } },
  tecelagem:  { name: 'Tecelagem',  kind: 'processor', size: [3, 4], color: 0x7d5ba6,
    recipes: [{ in: { la: 2 }, out: { tecido: 1 }, time: 15 }],
    cost: { money: 320, madeira: 15, pedra: 5 } },
  padaria:    { name: 'Padaria',    kind: 'processor', size: [4, 3], color: 0xd98a4a,
    recipes: [{ in: { farinha: 2, ovo: 2 }, out: { pao: 2 }, time: 12 }],
    cost: { money: 500, madeira: 20, pedra: 20 } },
};

// Casa, Loja e Oficina já existem na fazenda no início do jogo.
export const STARTER_BUILDINGS = [
  { type: 'casa', x: 14, z: -8, rot: 0 },
  { type: 'loja', x: 5, z: -8, rot: 0 },
  { type: 'oficina', x: -3, z: -8, rot: 0 },
];

export const LAKE = { x: 34, z: 12, r: 9 };
export const WORLD_HALF = 58; // limite do mapa (em metros, de -58 a 58)
export const START_POS = { x: 0, z: 2 };
export const SAVE_KEY = 'jogofazenda-save-v1';

// ---------------------------------------------------------------- Ferramentas
// slot: posição na barra de atalhos (1–9). owned: já disponível no início.
export const TOOLS = {
  mao:       { name: 'Mãos',              icon: '✋', slot: 1, owned: true,  cost: 0 },
  enxada:    { name: 'Enxada',            icon: '⛏️', slot: 2, owned: true,  cost: 0 },
  regador:   { name: 'Regador',           icon: '💧', slot: 3, owned: true,  cost: 0 },
  machado:   { name: 'Machado',           icon: '🪓', slot: 4, owned: true,  cost: 0 },
  picareta:  { name: 'Picareta',          icon: '🔨', slot: 5, owned: true,  cost: 0 },
  tesoura:   { name: 'Tesoura de Tosa',   icon: '✂️', slot: 6, owned: false, cost: 150 },
  balde:     { name: 'Balde de Ordenha',  icon: '🪣', slot: 7, owned: false, cost: 120 },
  vara:      { name: 'Vara de Pescar',    icon: '🎣', slot: 8, owned: false, cost: 100 },
  sementes:  { name: 'Sementes',          icon: '🌱', slot: 9, owned: true,  cost: 0 },
};

// ---------------------------------------------------------------- Melhorias (Oficina)
// Cada nível tem custo e efeito. Efeitos são lidos pelo jogo.
export const UPGRADES = {
  irrigacao: {
    name: 'Irrigação', desc: 'Regar acelera o crescimento (x2) por mais tempo.',
    levels: [
      { cost: 300, water: 40 }, { cost: 800, water: 60 }, { cost: 1600, water: 90 },
    ],
  },
  adubo: {
    name: 'Adubação', desc: '+1 de colheita por canteiro a cada nível.',
    levels: [{ cost: 250 }, { cost: 600 }, { cost: 1200 }],
  },
  nutricao: {
    name: 'Nutrição Animal', desc: 'Animais produzem mais e a ração dura mais.',
    levels: [
      { cost: 300, mult: 1.2, feed: 120 }, { cost: 700, mult: 1.4, feed: 160 }, { cost: 1400, mult: 1.7, feed: 220 },
    ],
  },
  ferramentas: {
    name: 'Ferramentas Reforçadas', desc: '+1 de madeira/pedra por golpe e +1 de leite/lã por coleta.',
    levels: [{ cost: 200 }, { cost: 500 }, { cost: 1000 }],
  },
};

// ---------------------------------------------------------------- Veículos (Oficina)
export const VEHICLES = {
  bicicleta: { name: 'Bicicleta', icon: '🚲', cost: 400, speed: 9.5, color: 0xd33b3b,
    desc: 'Mais rápida que andar. Use E para subir e descer.' },
  trator:    { name: 'Trator', icon: '🚜', cost: 2500, speed: 6.5, color: 0x2e8b3b,
    desc: 'Colhe automaticamente os canteiros maduros que passa por cima.' },
  caminhao:  { name: 'Caminhão', icon: '🚚', cost: 4000, speed: 7.5, color: 0x3d6ad0,
    desc: 'Negociante: +20% no preço de venda na Loja.' },
};

// ---------------------------------------------------------------- Missões
// type: money | sell | harvest | produce | birth | build | owned | fish | upgrade
export const MISSIONS = [
  { id: 'm1', text: 'Colha 10 trigos', type: 'harvest', key: 'trigo', target: 10, reward: 150 },
  { id: 'm2', text: 'Construa um Galinheiro', type: 'build', key: 'galinheiro', target: 1, reward: 200 },
  { id: 'm3', text: 'Venda 15 ovos', type: 'sell', key: 'ovo', target: 15, reward: 200 },
  { id: 'm4', text: 'Nasçam 3 pintinhos (galo + galinha)', type: 'birth', key: 'galinha', target: 3, reward: 300 },
  { id: 'm5', text: 'Construa um Curral', type: 'build', key: 'curral', target: 1, reward: 350 },
  { id: 'm6', text: 'Nasçam 2 bezerros (touro + vaca)', type: 'birth', key: 'vaca', target: 2, reward: 500 },
  { id: 'm7', text: 'Produza 15 litros de leite', type: 'produce', key: 'leite', target: 15, reward: 350 },
  { id: 'm8', text: 'Construa um Moinho', type: 'build', key: 'moinho', target: 1, reward: 300 },
  { id: 'm9', text: 'Compre um trator', type: 'owned', key: 'trator', target: 1, reward: 500 },
  { id: 'm10', text: 'Pesque 5 peixes', type: 'fish', key: 'peixe', target: 5, reward: 400 },
  { id: 'm11', text: 'Venda 5 queijos (Queijaria)', type: 'sell', key: 'queijo', target: 5, reward: 600 },
  { id: 'm12', text: 'Produza 20 mel com um Apiário', type: 'produce', key: 'mel', target: 20, reward: 500 },
  { id: 'm13', text: 'Ganhe R$ 5.000 vendendo', type: 'money', key: 'earned', target: 5000, reward: 800 },
  { id: 'm14', text: 'Melhore a Irrigação ao nível 2', type: 'upgrade', key: 'irrigacao', target: 2, reward: 600 },
  { id: 'm15', text: 'Nasçam 4 ovelhas/cordeiros (carneiro + ovelha)', type: 'birth', key: 'ovelha', target: 4, reward: 800 },
  { id: 'm16', text: 'Venda 10 pães da Padaria', type: 'sell', key: 'pao', target: 10, reward: 900 },
];
