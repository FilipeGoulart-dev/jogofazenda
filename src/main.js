// Ponto de entrada: cria o mundo, a lógica, a interface e o laço principal.
import { Game, newState } from './game.js';
import { World } from './world.js';
import { UI } from './ui.js';
import { Controller } from './controller.js';
import { SAVE_KEY } from './config.js';

const container = document.getElementById('game');
const world = new World(container);

let game = null;
let ui = null;
let controller = null;
let running = false;
let saveT = 0;
let last = performance.now();

function resize() {
  world.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

function startGame(state) {
  game = new Game(state);
  ui = new UI(game, {
    startBuild: (type) => controller.startBuild(type),
    selectSlot: (n) => controller.selectSlot(n),
  });
  controller = new Controller(game, world, ui);
  controller.bindInput(world.renderer.domElement);
  game.onMessage = (t) => ui.message(t);
  // ao carregar, o jogador sempre começa a pé
  state.riding = null;
  ui.message('Bem-vindo à fazenda! Use a Enxada (2) para arar e o E para interagir.');
  ui.updateHud();
  ui.renderHotbar(state.selectedSlot, state.selectedSeed);
  running = true;
  document.getElementById('start').classList.add('hidden');
  last = performance.now();
}

document.getElementById('btn-continue').onclick = () => {
  const saved = Game.load();
  startGame(saved || newState());
  if (!saved) game.log('Nenhum jogo salvo. Começando um novo jogo.');
};
document.getElementById('btn-new').onclick = () => {
  if (Game.load() && !confirm('Começar um novo jogo apagará o jogo salvo. Continuar?')) return;
  Game.clear();
  startGame(newState());
};

function saveNow() {
  if (game) game.save();
}
window.addEventListener('beforeunload', saveNow);

let hotbarKey = '';
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!running) { world.renderer.render(world.scene, world.camera); return; }

  controller.frame(dt);
  game.update(dt);
  world.update(dt);
  world.sync(game, dt);
  ui.tick(dt);

  // a barra de atalhos só é redesenhada quando muda (evita travar cliques)
  const key = `${game.s.selectedSlot}|${game.s.selectedSeed}|${Object.keys(game.s.tools).join(',')}|${game.count(game.s.selectedSeed)}`;
  if (key !== hotbarKey) { hotbarKey = key; ui.renderHotbar(game.s.selectedSlot, game.s.selectedSeed); }

  saveT += dt;
  if (saveT > 15) { saveT = 0; saveNow(); }

  world.renderer.render(world.scene, world.camera);
}
requestAnimationFrame(frame);

// Atalho de depuração/teste: window.__fazenda
window.__fazenda = { get game() { return game; }, world, SAVE_KEY };
