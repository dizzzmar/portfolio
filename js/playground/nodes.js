// PLAYGROUND · los tipos de nodo del sandbox. Cada uno declara sus puertos (entradas y salidas con un tipo: solo se conectan puertos del mismo tipo),
// su interfaz y evaluate(entradas) → salidas. Lo que no está conectado usa un valor por defecto, así que una hoja suelta ya dibuja algo.
// Todo el código de dibujo es el de Plant Lab y Brush Lab (engine.js, plant-engine.js, render.js); aquí solo cambia cómo se manejan sus ajustes.
import { PRESETS, INKS, PAPER_PARAMS } from './engine.js';
import { TRAITS, GROUPS, rollTraits, speciesName } from './plant-engine.js';
import { renderSheet } from './render.js';
import { slider, toggle, tabs, mediaPicker, inkPicker, savePng } from './lab-kit.js';

const el = (tag, attrs = {}, kids = []) => { const n = Object.assign(document.createElement(tag), attrs); n.append(...kids); return n; };
const ARROW_L = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M13 8H3M7 4 3 8l4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const ARROW_R = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const pill = (text, className = 'pg-btn') => el('button', { type: 'button', className, textContent: text });

export const DEFAULT_POSE = { yaw: -0.22, pitch: 0.06, roll: 0, depth: 0.30, zoom: 1 };
export const DEFAULT_PAPER = { tone: 70, warmth: 80, grain: 13, mottle: 4, mottleScale: 6, fibers: 260, vignette: 5 };
const FALLBACK = { seed: '4929', locks: {}, pose: DEFAULT_POSE, brush: PRESETS['ink nib'], ink: 0, paper: DEFAULT_PAPER };
const SHAPES = [['sprig', 'Sprig'], ['curve', 'S-curve'], ['line', 'Line'], ['circle', 'Circle'], ['leaf', 'Leaf'], ['hatch', 'Hatching'], ['scribble', 'Scribble'], ['rays', 'Rays']];

// Ajustes de un nodo: cada deslizador guarda en node.params y avisa al editor (mientras se arrastra, dibujo ligero)
const sl = (host, node, api, key, label, min, max, step, unit = '') => slider(host, {
  label, get: () => node.params[key], set: (v) => { node.params[key] = v; }, min, max, step, unit, onInput: () => api.changed(true), onCommit: () => api.changed(false),
});

// ---------- Entradas ----------
const seed = {
  title: 'Seed', group: 'Inputs', outputs: [{ id: 'seed', type: 'seed' }],
  params: () => ({ seed: String(Math.floor(Math.random() * 10000)) }),
  create(node, body, api) {
    const input = el('input', { type: 'text', inputMode: 'numeric', autocomplete: 'off', value: node.params.seed });
    input.setAttribute('aria-label', 'Seed');
    const set = (v) => { node.params.seed = String(v); input.value = node.params.seed; api.changed(false); };
    const prev = el('button', { type: 'button', className: 'pg-btn is-icon', innerHTML: ARROW_L }), next = el('button', { type: 'button', className: 'pg-btn is-icon', innerHTML: ARROW_R });
    prev.setAttribute('aria-label', 'Previous seed'); next.setAttribute('aria-label', 'Next seed');
    prev.addEventListener('click', () => set(Math.max(0, (+node.params.seed || 0) - 1)));
    next.addEventListener('click', () => set((+node.params.seed || 0) + 1));
    input.addEventListener('input', () => { node.params.seed = input.value || '0'; api.changed(true); });
    input.addEventListener('change', () => api.changed(false));
    const random = pill('Random', 'pg-btn is-primary');
    random.addEventListener('click', () => set(Math.floor(Math.random() * 10000)));
    body.append(el('div', { className: 'pg-seed' }, [prev, input, next]), el('div', { className: 'pg-actions' }, [random]));
    return { evaluate: () => ({ seed: node.params.seed }) };
  },
};

const pose = {
  title: 'Pose', group: 'Inputs', outputs: [{ id: 'pose', type: 'pose' }],
  params: () => ({ ...DEFAULT_POSE }),
  create(node, body, api) {
    const rows = [['yaw', -1.6, 1.6, 0.01, ''], ['pitch', -0.9, 0.9, 0.01, ''], ['roll', -0.7, 0.7, 0.01, ''], ['depth', 0, 1, 0.02, ''], ['zoom', 0.5, 1.5, 0.02, '×']];
    const refs = rows.map(([key, min, max, step, unit]) => sl(body, node, api, key, key, min, max, step, unit));
    const reset = pill('Reset pose', 'pg-link');
    reset.addEventListener('click', () => { Object.assign(node.params, DEFAULT_POSE); refs.forEach((r) => r.sync()); api.changed(false); });
    body.append(reset);
    return { evaluate: () => ({ pose: { ...node.params } }) };
  },
};

const ink = {
  title: 'Ink', group: 'Inputs', outputs: [{ id: 'ink', type: 'ink' }],
  params: () => ({ ink: 0 }),
  create(node, body, api) {
    const host = el('div', { className: 'pg-inks', role: 'group' }); host.setAttribute('aria-label', 'Ink');
    body.append(host);
    inkPicker(host, { ink: node.params.ink }, (i) => { node.params.ink = i; api.changed(false); });
    return { evaluate: () => ({ ink: node.params.ink }) };
  },
};

const paper = {
  title: 'Paper', group: 'Inputs', outputs: [{ id: 'paper', type: 'paper' }],
  params: () => ({ ...DEFAULT_PAPER }),
  create(node, body, api) {
    PAPER_PARAMS.forEach(([key, label, min, max, step, unit]) => sl(body, node, api, key, label, min, max, step, unit));
    return { evaluate: () => ({ paper: { ...node.params } }) };
  },
};

const medium = {
  title: 'Medium', group: 'Brush', outputs: [{ id: 'brush', type: 'brush' }],
  params: () => ({ preset: 'ink nib' }),
  create(node, body, api) {
    const host = el('div', { className: 'pg-media', role: 'group' }); host.setAttribute('aria-label', 'Medium');
    body.append(host);
    mediaPicker(host, { preset: node.params.preset, ink: 0 }, (name) => { node.params.preset = name; api.changed(false); });
    return { evaluate: () => ({ brush: { ...PRESETS[node.params.preset] } }) };
  },
};

// Modificadores del pincel: multiplican los ajustes del pincel que les llega, así valen para cualquier medio
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const modifier = (title, rows, apply) => ({
  title, group: 'Brush', inputs: [{ id: 'brush', type: 'brush' }], outputs: [{ id: 'brush', type: 'brush' }],
  params: () => Object.fromEntries(rows.map((r) => [r[0], r[5]])),
  create(node, body, api) {
    rows.forEach(([key, label, min, max, step, , unit]) => sl(body, node, api, key, label, min, max, step, unit));
    return { evaluate: (inp) => ({ brush: apply({ ...(inp.brush || FALLBACK.brush) }, node.params) }) };
  },
});
const stroke = modifier('Stroke', [['thickness', 'thickness', 0.25, 3, 0.05, 1, '×'], ['spacing', 'spacing', 0.5, 2.5, 0.05, 1, '×'], ['density', 'density', 0.25, 3, 0.05, 1, '×'], ['noise', 'noise', 0, 3, 0.05, 1, '×']],
  (b, p) => { b.minThickness *= p.thickness; b.maxThickness *= p.thickness; b.spacing *= p.spacing; b.density = clamp(Math.round(b.density * p.density), 1, 40); b.noiseFreq *= p.noise; return b; });
const grain = modifier('Grain', [['dot', 'dot size', 0.4, 3, 0.05, 1, '×'], ['alpha', 'alpha', 0.2, 3, 0.05, 1, '×'], ['jitter', 'tone jitter', 0, 3, 0.05, 1, '×'], ['snap', 'snap', 0, 2, 0.05, 1, '×']],
  (b, p) => { b.minRadius *= p.dot; b.maxRadius *= p.dot; b.alpha = Math.min(1, b.alpha * p.alpha); b.toneJitter *= p.jitter; b.snapAmount = Math.min(1, b.snapAmount * p.snap); return b; });
const hand = modifier('Hand', [['wobble', 'wobble', 0, 3, 0.05, 1, '×'], ['freq', 'wobble speed', 0.25, 3, 0.05, 1, '×'], ['passes', 'extra passes', 0, 2, 1, 0, ''], ['taper', 'taper', 0, 2, 0.05, 1, '×'], ['overshoot', 'overshoot', 0, 3, 0.05, 1, '×']],
  (b, p) => { b.wobble *= p.wobble; b.wobbleFreq *= p.freq; b.passes = clamp(b.passes + Math.round(p.passes), 1, 4); b.taper = Math.min(1, b.taper * p.taper); b.overshoot *= p.overshoot; return b; });

// ---------- Rasgos de la planta: cuatro nodos que se encadenan; cada uno fija los suyos y deja pasar los de antes ----------
const traitNode = (group, title) => ({
  title, group: 'Plant', inputs: [{ id: 'locks', type: 'locks', label: 'traits' }], outputs: [{ id: 'locks', type: 'locks', label: 'traits' }],
  params: () => ({ locks: {} }),
  create(node, body, api) {
    GROUPS[group].forEach((key, i) => {
      const id = `pgn-${node.id}-${key}`;
      const shown = el('span', { className: 'pg-shown', textContent: 'Random' }); shown.setAttribute('aria-hidden', 'true');
      const sel = el('select', { id, innerHTML: '<option value="auto">Random</option>' + Object.keys(TRAITS[key].opts).map((v) => `<option value="${v}">${v}</option>`).join('') });
      const wrap = el('div', { className: 'pg-pick' }, [shown, sel]);
      sel.setAttribute('aria-label', TRAITS[key].label + ': random');
      sel.addEventListener('change', () => {
        if (sel.value === 'auto') delete node.params.locks[key]; else node.params.locks[key] = sel.value;
        shown.textContent = sel.value === 'auto' ? 'Random' : sel.value;
        wrap.classList.toggle('is-locked', sel.value !== 'auto');
        sel.setAttribute('aria-label', `${TRAITS[key].label}: ${shown.textContent}`);
        api.changed(false);
      });
      body.append(el('div', { className: 'pg-row pg-row-inline' }, [el('label', { htmlFor: id, textContent: TRAITS[key].label }), wrap]));
    });
    return { evaluate: (inp) => ({ locks: { ...(inp.locks || {}), ...node.params.locks } }) };
  },
});

// ---------- Qué se dibuja ----------
const drawingInputs = [{ id: 'seed', type: 'seed' }, { id: 'locks', type: 'locks', label: 'traits' }, { id: 'pose', type: 'pose' }];
const base = (inp) => ({ seed: String(inp.seed ?? FALLBACK.seed), locks: inp.locks || FALLBACK.locks, pose: inp.pose || FALLBACK.pose });

const plant = {
  title: 'Plant', group: 'Drawing', inputs: drawingInputs, outputs: [{ id: 'drawing', type: 'drawing' }],
  create(node, body) {
    const name = el('p', { className: 'pgn-species' }), list = el('dl', { className: 'pgn-traits' });
    body.append(name, list);
    return {
      evaluate: (inp) => ({ drawing: { kind: 'plant', ...base(inp) } }),
      update(inp) { // enseña la planta que sale: su nombre y los rasgos que tiene ahora
        const b = base(inp), traits = rollTraits(b.seed, b.locks);
        name.textContent = speciesName(traits, b.seed).full;
        list.replaceChildren(...Object.keys(TRAITS).flatMap((key) => [el('dt', { textContent: TRAITS[key].label }), el('dd', { textContent: traits[key], className: b.locks[key] ? 'is-locked' : '' })]));
      },
    };
  },
};

const study = {
  title: 'Study', group: 'Drawing', inputs: drawingInputs, outputs: [{ id: 'drawing', type: 'drawing' }],
  params: () => ({ count: 12, cols: 4, vary: 0.55, turn: 0, names: true }),
  create(node, body, api) {
    sl(body, node, api, 'count', 'specimens', 4, 30, 1); sl(body, node, api, 'cols', 'columns', 2, 6, 1);
    sl(body, node, api, 'vary', 'size variation', 0, 1, 0.05); sl(body, node, api, 'turn', 'turn spread', 0, 1, 0.05);
    toggle(body, { label: 'Names', get: () => node.params.names, set: (v) => { node.params.names = v; }, onChange: () => api.changed(false) });
    return { evaluate: (inp) => ({ drawing: { kind: 'study', ...base(inp), count: Math.round(node.params.count), cols: Math.round(node.params.cols), vary: node.params.vary, turn: node.params.turn, names: node.params.names } }) };
  },
};

const traits = {
  title: 'Traits', group: 'Drawing', inputs: drawingInputs, outputs: [{ id: 'drawing', type: 'drawing' }],
  params: () => ({ key: 'leaf' }),
  create(node, body, api) {
    const id = `pgn-${node.id}-key`;
    const shown = el('span', { className: 'pg-shown', textContent: TRAITS[node.params.key].label }); shown.setAttribute('aria-hidden', 'true');
    const sel = el('select', { id, innerHTML: Object.keys(TRAITS).map((k) => `<option value="${k}">${TRAITS[k].label}</option>`).join('') });
    sel.value = node.params.key; sel.setAttribute('aria-label', 'Trait to compare');
    sel.addEventListener('change', () => { node.params.key = sel.value; shown.textContent = TRAITS[sel.value].label; api.changed(false); });
    body.append(el('div', { className: 'pg-pick is-wide' }, [shown, sel]));
    return { evaluate: (inp) => ({ drawing: { kind: 'traits', ...base(inp), key: node.params.key } }) };
  },
};

const shape = {
  title: 'Shape', group: 'Drawing', inputs: [{ id: 'seed', type: 'seed' }], outputs: [{ id: 'drawing', type: 'drawing' }],
  params: () => ({ shape: 'sprig', size: 1, compare: false }),
  create(node, body, api) {
    const host = el('div', { className: 'pg-tabs', role: 'group' }); host.setAttribute('aria-label', 'Shape');
    body.append(host);
    tabs(host, SHAPES, node.params.shape, (v) => { node.params.shape = v; api.changed(false); });
    sl(body, node, api, 'size', 'size', 0.5, 1.3, 0.02, '×');
    toggle(body, { label: 'Compare media', get: () => node.params.compare, set: (v) => { node.params.compare = v; }, onChange: () => api.changed(false) });
    return { evaluate: (inp) => ({ drawing: { kind: 'shape', seed: String(inp.seed ?? FALLBACK.seed), shape: node.params.shape, size: node.params.size, compare: node.params.compare } }) };
  },
};

// ---------- La hoja: dibuja lo que le llega con el pincel, la tinta y el papel conectados ----------
const sheet = {
  title: 'Sheet', group: 'Output', wide: true,
  inputs: [{ id: 'drawing', type: 'drawing' }, { id: 'brush', type: 'brush' }, { id: 'ink', type: 'ink' }, { id: 'paper', type: 'paper' }],
  params: () => ({ label: false, scale: 2 }),
  create(node, body, api) {
    const canvas = el('canvas', { width: 1200, height: 1200, className: 'pgn-sheet', role: 'img' });
    const note = el('p', { className: 'pg-note', role: 'status' }), cap = el('p', { className: 'pgn-cap' }), num = el('span', { className: 'pgn-num' });
    const head = node.el.querySelector('.pgn-head');
    head.insertBefore(num, head.querySelector('.pgn-x')); // la semilla en grande, como la fecha del cartel
    const save = pill('Save PNG');
    save.addEventListener('click', () => { last = ''; paint(true); savePng(canvas, `plant-lab_${Date.now()}.png`); last = ''; });
    body.append(canvas, cap, note);
    toggle(body, { label: 'Name on the sheet', get: () => node.params.label, set: (v) => { node.params.label = v; }, onChange: () => api.changed(false) });
    slider(body, { label: 'resolution', get: () => node.params.scale, set: (v) => { node.params.scale = Math.round(v); }, min: 1, max: 3, step: 1, unit: '×', onCommit: () => api.changed(false) });
    body.append(el('div', { className: 'pg-actions' }, [save]));
    let last = '', current = null;
    function paint(full) {
      const { d, brush, ink: i, paper: p } = current;
      const r = renderSheet(canvas, d, { brush, ink: i, paper: p, scale: node.params.scale, preview: !full && api.preview(), label: node.params.label });
      note.textContent = r.heavy ? 'Heavy drawing: lower the density or raise the alpha.' : '';
    }
    return {
      update(inp) {
        current = { d: inp.drawing || null, brush: inp.brush || FALLBACK.brush, ink: inp.ink ?? FALLBACK.ink, paper: inp.paper || FALLBACK.paper };
        const sig = JSON.stringify([current, node.params.label, node.params.scale, api.preview()]);
        if (sig === last) return;
        last = sig; paint(false);
        const d = current.d;
        num.textContent = d ? d.seed : '';
        cap.textContent = !d ? '' : d.kind === 'plant' ? speciesName(rollTraits(d.seed, d.locks), d.seed).full : d.kind === 'study' ? `Study ${d.seed}–${(+d.seed || 0) + d.count - 1}` : d.kind === 'traits' ? `All variants of ${TRAITS[d.key].label}` : d.compare ? 'Six media, one shape' : d.shape;
        canvas.setAttribute('aria-label', !d ? 'Empty sheet: connect a drawing' : d.kind === 'plant' ? 'Plant drawing' : d.kind === 'study' ? 'Sheet of plant drawings' : d.kind === 'traits' ? 'Every variant of one trait' : d.compare ? 'The six media drawn on the same shape' : `A ${d.shape} drawn in ink`);
      },
    };
  },
};

export const TYPES = { seed, structure: traitNode('structure', 'Structure'), foliage: traitNode('foliage', 'Foliage'), flower: traitNode('flower', 'Flower'), treatment: traitNode('treatment', 'Treatment'), pose, medium, stroke, grain, hand, ink, paper, plant, study, traits, shape, sheet };
