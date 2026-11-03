// PLAYGROUND · piezas de interfaz que comparten Plant Lab y Brush Lab: deslizadores, selector de medio (cada uno dibuja su propio trazo),
// tintas, pestañas, interruptores, guardar PNG y copiar los ajustes. Sin dependencias; los estilos están en css/playground.css.
import { PRESETS, INKS, mulberry32, hashSeed, makeNoise2D, strokePath, makePaper } from './engine.js';
import { cubic } from './brush-shapes.js';

export const $ = (s, root = document) => root.querySelector(s);
const el = (tag, attrs = {}, kids = []) => { const n = Object.assign(document.createElement(tag), attrs); n.append(...kids); return n; };
const decimals = (step) => (step >= 1 ? 0 : String(step).split('.')[1].length);
let uid = 0;

// Pinta como mucho una vez por fotograma. «preview» = true mientras se arrastra (más ligero); al soltar se pide el dibujo completo.
export function scheduler(render) {
  let pending = 0, preview = false;
  return (p) => {
    preview = p;
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = 0; render(preview); });
  };
}

// El papel se genera una vez por combinación de ajustes y semilla.
export function paperCache() {
  let key = '', canvas = null;
  return (w, paper, seed) => {
    const k = JSON.stringify(paper) + '|' + seed + '|' + w;
    if (k !== key) { key = k; canvas = makePaper(w, w, paper, seed); }
    return canvas;
  };
}

export function slider(host, { label, get, set, min, max, step, unit = '', onInput, onCommit }) {
  const id = 'pg-s' + (++uid);
  const out = el('output', { htmlFor: id });
  const input = el('input', { type: 'range', id, min, max, step, value: get() });
  const sync = () => { out.textContent = (+input.value).toFixed(decimals(step)) + (unit ? ' ' + unit : ''); };
  input.addEventListener('input', () => { set(+input.value); sync(); onInput && onInput(); });
  input.addEventListener('change', () => onCommit && onCommit());
  sync();
  host.append(el('div', { className: 'pg-row' }, [el('label', { htmlFor: id, textContent: label }), out, input]));
  return { sync: () => { input.value = get(); sync(); } };
}

// Interruptor de dos estados con su estado escrito («On» / «Off»).
export function toggle(host, { label, get, set, onChange }) {
  const b = el('button', { type: 'button', className: 'pg-switch' });
  const paint = () => { b.setAttribute('aria-pressed', String(!!get())); b.textContent = get() ? 'On' : 'Off'; };
  b.addEventListener('click', () => { set(!get()); paint(); onChange && onChange(); });
  paint();
  host.append(el('div', { className: 'pg-row pg-row-inline' }, [el('span', { textContent: label }), b]));
  b.setAttribute('aria-label', label);
  return { sync: paint };
}

// Texto con subrayado en el activo (aria-pressed), como los enlaces de la barra.
export function tabs(host, items, current, onChange) {
  const buttons = items.map(([value, text]) => {
    const b = el('button', { type: 'button', className: 'pg-tab', textContent: text });
    b.dataset.value = value;
    b.setAttribute('aria-pressed', String(value === current));
    b.addEventListener('click', () => select(value, true));
    return b;
  });
  host.append(...buttons);
  function select(value, notify) {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
    if (notify) onChange(value);
  }
  return { select: (v) => select(v, false) };
}

// Los seis medios, cada uno con un trazo de muestra hecho con sus propios ajustes
export function mediaPicker(host, state, onPick) {
  const chips = Object.keys(PRESETS).map((name) => {
    const canvas = el('canvas', { width: 208, height: 56 });
    const b = el('button', { type: 'button', className: 'pg-medium' }, [canvas, el('span', { textContent: name })]);
    b.setAttribute('aria-pressed', String(name === state.preset));
    b.addEventListener('click', () => { chips.forEach((c) => c.b.setAttribute('aria-pressed', String(c.name === name))); onPick(name); });
    host.append(b);
    return { name, b, canvas };
  });
  const paint = () => chips.forEach(({ name, canvas }) => {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.fillStyle = '#efece4'; ctx.fillRect(0, 0, 104, 28);
    const path = cubic({ x: 9, y: 20 }, { x: 32, y: 2 }, { x: 66, y: 27 }, { x: 95, y: 8 }, 40);
    strokePath(ctx, path, { ...PRESETS[name], overshoot: 0 }, mulberry32(hashSeed('chip|' + name)), makeNoise2D(mulberry32(hashSeed('chip-n|' + name))), INKS[state.ink][1]);
  });
  paint();
  return { paint, select: (name) => chips.forEach((c) => c.b.setAttribute('aria-pressed', String(c.name === name))) };
}

// Las siete tintas, como puntos de color
export function inkPicker(host, state, onPick) {
  const dots = INKS.map(([name, rgb], i) => {
    const b = el('button', { type: 'button', className: 'pg-ink' });
    b.style.background = `rgb(${rgb.join(',')})`;
    b.setAttribute('aria-label', 'Ink: ' + name);
    b.setAttribute('aria-pressed', String(i === state.ink));
    b.addEventListener('click', () => { dots.forEach((d, j) => d.setAttribute('aria-pressed', String(j === i))); onPick(i); });
    host.append(b);
    return b;
  });
}

export function savePng(canvas, filename) {
  canvas.toBlob((blob) => {
    const a = el('a', { href: URL.createObjectURL(blob), download: filename });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// Copia los ajustes como JSON; el aviso («Copied» o por qué no) lo ve quien lo usa y lo lee el lector de pantalla.
export async function copySettings(payload, note) {
  const text = JSON.stringify(payload, null, 2);
  let msg = 'Copied';
  try { await navigator.clipboard.writeText(text); } catch (e) { msg = 'Copy blocked by the browser'; console.log(text); }
  note.textContent = msg;
  setTimeout(() => { note.textContent = ''; }, 3000);
}
