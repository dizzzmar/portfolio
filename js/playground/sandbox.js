// PLAYGROUND · monta el sandbox en un contenedor: un editor de nodos con el grafo de partida (semilla → planta → hoja, más medio, tinta y papel)
// y unos cuantos nodos sueltos para invitar a conectarlos. Se usa en /playground/ (pantalla completa) y dentro de la ficha de Plant Lab.
import { createEditor } from './editor.js?v=20261106a'; // el ?v= cambia con cada cambio de editor.js: los módulos importados también se guardan en caché
import { TYPES } from './nodes.js';

// Posiciones de partida: columna (x) y orden dentro de la columna; las alturas se miden y los nodos se apilan con aire entre ellos.
// Los nodos sueltos (estructura, pose) están a la izquierda, sin cables, para invitar a conectarlos.
const GAP = 40;
const COLS = [
  [0, ['seed', 'structure', 'pose']],
  [420, ['plant', 'medium', 'ink', 'paper']],
  [840, ['sheet']],
];
const NODES = { seed: 'seed', structure: 'structure', pose: 'pose', plant: 'plant', medium: 'medium', ink: 'ink', paper: 'paper', sheet: 'sheet' };
// Segundo grupo (solo en /playground/): una forma de prueba con su propia hoja, debajo de la primera
const EXTRA = { seed2: 'seed', shape: 'shape', sheet2: 'sheet' };
const EXTRA_X = { seed2: 840, shape: 1180, sheet2: 1520 };
const EDGES = [['seed', 'seed', 'plant', 'seed'], ['plant', 'drawing', 'sheet', 'drawing'], ['medium', 'brush', 'sheet', 'brush'], ['ink', 'ink', 'sheet', 'ink'], ['paper', 'paper', 'sheet', 'paper']];
const EXTRA_EDGES = [['seed2', 'seed', 'shape', 'seed'], ['shape', 'drawing', 'sheet2', 'drawing']]; // la segunda hoja usa el pincel, la tinta y el papel por defecto: conectarlos es cosa de quien juega

export function mountSandbox(root, { wheel = 'page', extra = false, fullHref } = {}) {
  const editor = createEditor(root, { types: TYPES, wheel, onReset: build, fullHref });
  function build() {
    editor.clear();
    const ids = {}, spec = extra ? { ...NODES, ...EXTRA } : NODES;
    for (const key in spec) ids[key] = editor.addNode(spec[key]);
    (extra ? [...EDGES, ...EXTRA_EDGES] : EDGES).forEach(([a, ap, b, bp]) => editor.connect(ids[a].id, ap, ids[b].id, bp));
    // Cuando la planta ya ha escrito su ficha (tras la primera evaluación) y las tipografías han cargado, se miden las alturas y se colocan los nodos
    const settle = () => { layout(ids); if (!editor.touched) frame(); };
    const frame = () => {
      editor.fit();
      // El texto de los nodos se lee a tamaño real (zoom 1; con zoom menor, las mayúsculas pequeñas bajan de 8 px): se empieza en la cadena planta → hoja y «Fit» da el panorama
      const w = root.clientWidth, k = w < 700 ? 1 : Math.min(1, Math.max(0.8, w / 960));
      editor.focusAt(w < 700 ? 590 : w >= 1300 ? 654 : 864, root.clientHeight / 2 / k - 80 / k, k);
    };
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(settle)));
    document.fonts && document.fonts.ready.then(() => { if (!editor.touched) settle(); });
  }
  // Apila cada columna con el aire de GAP según la altura real de los nodos, y el segundo grupo bajo la hoja
  function layout(ids) {
    let below = 0;
    COLS.forEach(([x, keys]) => {
      let y = 0;
      keys.forEach((k) => { editor.move(ids[k], x, y); y += ids[k].el.offsetHeight + GAP; });
      if (x === 840) below = y;
    });
    if (extra) for (const k in EXTRA_X) editor.move(ids[k], EXTRA_X[k], below + 20);
  }
  build();
  return editor;
}
