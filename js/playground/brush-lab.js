// PLAYGROUND · Brush Lab. El pincel de puntitos de Plant Lab, solo, sobre ocho formas de prueba. «Single» dibuja una forma con el medio elegido
// y «Compare» las seis a la vez, para escoger por textura. El motor está en engine.js; los controles compartidos, en lab-kit.js.
import { PRESETS, INKS, BRUSH_PARAMS, PAPER_PARAMS, mulberry32, hashSeed, makeNoise2D, strokePath } from './engine.js';
import { buildShape } from './brush-shapes.js';
import { $, scheduler, paperCache, slider, tabs, mediaPicker, inkPicker, savePng, copySettings } from './lab-kit.js';

const LOGICAL = 760;
const SHAPES = [['sprig', 'Sprig'], ['curve', 'S-curve'], ['line', 'Line'], ['circle', 'Circle'], ['leaf', 'Leaf'], ['hatch', 'Hatching'], ['scribble', 'Scribble'], ['rays', 'Rays']];
const state = {
  view: 'single', seed: '', shape: 'sprig', preset: 'graphite HB', ink: 0, scale: 2, shapeScale: 1,
  brush: { ...PRESETS['graphite HB'] },
  paper: { tone: 70, warmth: 80, grain: 13, mottle: 4, mottleScale: 6, fibers: 260, vignette: 5 },
};

const view = $('#view'), vctx = view.getContext('2d');
const paper = paperCache();
const note = $('#note');

function render(preview) {
  describe();
  const scale = preview ? 1 : state.scale, W = LOGICAL * scale;
  view.width = W; view.height = W;
  vctx.setTransform(1, 0, 0, 1, 0, 0);
  vctx.drawImage(paper(W, state.paper, state.seed), 0, 0);
  vctx.setTransform(scale, 0, 0, scale, 0, 0);

  const rgb = INKS[state.ink][1];
  let dots = 0;
  const shapeFor = () => buildShape(state.shape, LOGICAL, mulberry32(hashSeed(state.seed + '|' + state.shape)));
  const noise = () => makeNoise2D(mulberry32(hashSeed(state.seed + '|n')));

  if (state.view === 'single') {
    const rnd = mulberry32(hashSeed(state.seed + '|' + state.shape)), n = noise(), sc = state.shapeScale;
    vctx.save();
    vctx.translate(LOGICAL / 2, LOGICAL / 2); vctx.scale(sc, sc); vctx.translate(-LOGICAL / 2, -LOGICAL / 2);
    shapeFor().forEach((p) => { dots += strokePath(vctx, p, state.brush, rnd, n, rgb); });
    vctx.restore();
  } else {
    const names = Object.keys(PRESETS), cols = 3, rows = Math.ceil(names.length / cols);
    const cw = LOGICAL / cols, ch = LOGICAL / rows;
    names.forEach((name, i) => {
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
      const rnd = mulberry32(hashSeed(state.seed + '|' + state.shape)), n = noise();
      const k = Math.min(cw, ch) / LOGICAL * 0.86;
      vctx.save();
      vctx.translate(cx + cw / 2 - LOGICAL * k / 2, cy + ch / 2 - LOGICAL * k / 2 + 8);
      vctx.scale(k, k);
      shapeFor().forEach((p) => { dots += strokePath(vctx, p, PRESETS[name], rnd, n, rgb); });
      vctx.restore();
      vctx.fillStyle = 'rgba(40,36,30,.78)';
      vctx.font = '14px "Funnel Sans", "Helvetica Neue", Arial, sans-serif';
      vctx.fillText(name, cx + 14, cy + ch - 14);
    });
  }
  // Solo se avisa cuando de verdad pesa: es lo único que el visitante puede corregir
  note.textContent = state.view === 'single' && dots > 420000 ? 'Heavy drawing: lower the density or raise the alpha.' : '';
}
const request = scheduler(render);
const describe = () => view.setAttribute('aria-label', state.view === 'single' ? `A ${state.shape} drawn with ${state.preset}` : 'The six media drawn on the same shape');
const refresh = () => request(false);
const preview = () => request(true);

const brushSliders = [];
const medium = mediaPicker($('#medium'), state, (name) => {
  state.preset = name; state.brush = { ...PRESETS[name] };
  brushSliders.forEach((s) => s.sync()); refresh();
});
inkPicker($('#inks'), state, (i) => { state.ink = i; medium.paint(); refresh(); });
BRUSH_PARAMS.forEach(([group, key, label, min, max, step, unit]) => {
  brushSliders.push(slider($('#g-' + group), { label, get: () => state.brush[key], set: (v) => { state.brush[key] = v; }, min, max, step, unit, onInput: preview, onCommit: refresh }));
});
PAPER_PARAMS.forEach(([key, label, min, max, step, unit]) => {
  slider($('#g-paper'), { label, get: () => state.paper[key], set: (v) => { state.paper[key] = v; }, min, max, step, unit, onInput: preview, onCommit: refresh });
});
slider($('#g-shape'), { label: 'size', get: () => state.shapeScale, set: (v) => { state.shapeScale = v; }, min: 0.5, max: 1.3, step: 0.02, unit: '×', onInput: preview, onCommit: refresh });
slider($('#g-output'), { label: 'resolution', get: () => state.scale, set: (v) => { state.scale = Math.round(v); }, min: 1, max: 3, step: 1, unit: '×', onCommit: refresh });

// Formas de prueba: texto con subrayado en la elegida, como las vistas
tabs($('#shapes'), SHAPES, state.shape, (v) => { state.shape = v; refresh(); });
tabs($('#views'), [['single', 'Single'], ['compare', 'Compare']], state.view, (v) => { state.view = v; refresh(); });

const seedInput = $('#seed');
function setSeed(s) { state.seed = String(s); seedInput.value = state.seed; refresh(); }
seedInput.addEventListener('input', () => { state.seed = seedInput.value || '0'; preview(); });
seedInput.addEventListener('change', refresh);
$('#prev').addEventListener('click', () => setSeed(Math.max(0, (+state.seed || 0) - 1)));
$('#next').addEventListener('click', () => setSeed((+state.seed || 0) + 1));
$('#reroll').addEventListener('click', () => setSeed(Math.floor(Math.random() * 9999)));

$('#save').addEventListener('click', () => {
  render(false);
  savePng(view, `brush-lab_${state.preset.replace(/\W/g, '-')}_${state.seed}.png`);
});
$('#copy').addEventListener('click', () => copySettings({ base: state.preset, brush: state.brush, paper: state.paper, ink: INKS[state.ink][0] }, $('#copy-note')));
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target !== document.body) return; // solo con nada enfocado: sobre un botón, una pestaña o un campo las flechas son suyas
  if (e.key === 'r' || e.key === 'R') $('#reroll').click();
  if (e.key === 's' || e.key === 'S') $('#save').click();
  if (e.key === 'ArrowRight') $('#next').click();
  if (e.key === 'ArrowLeft') $('#prev').click();
});

const urlSeed = new URLSearchParams(location.search).get('seed');
state.seed = urlSeed ? urlSeed : String(Math.floor(Math.random() * 9999));
seedInput.value = state.seed;
refresh();
