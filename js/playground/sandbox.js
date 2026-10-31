// PLAYGROUND · monta el sandbox en un contenedor: un editor de nodos con el grafo de partida (semilla → planta → hoja, más medio, tinta y papel)
// y unos cuantos nodos sueltos para invitar a conectarlos. Se usa en /playground/ (pantalla completa) y dentro de la ficha de Plant Lab.
import { createEditor } from './editor.js';
import { TYPES } from './nodes.js';

// Posiciones de partida (en píxeles del lienzo); los nodos sueltos van a la izquierda, sin cables
const NODES = {
  seed: ['seed', 0, 0], structure: ['structure', 0, 190], pose: ['pose', 0, 500],
  plant: ['plant', 320, 0], medium: ['medium', 320, 500], ink: ['ink', 320, 800],
  sheet: ['sheet', 660, 0], paper: ['paper', 320, 930],
};
const EXTRA = { seed2: ['seed', 660, 800], shape: ['shape', 960, 800], sheet2: ['sheet', 1260, 800] };
const EDGES = [['seed', 'seed', 'plant', 'seed'], ['plant', 'drawing', 'sheet', 'drawing'], ['medium', 'brush', 'sheet', 'brush'], ['ink', 'ink', 'sheet', 'ink'], ['paper', 'paper', 'sheet', 'paper']];
const EXTRA_EDGES = [['seed2', 'seed', 'shape', 'seed'], ['shape', 'drawing', 'sheet2', 'drawing']]; // la segunda hoja usa el pincel, la tinta y el papel por defecto: conectarlos es cosa de quien juega

export function mountSandbox(root, { wheel = 'page', extra = false, fullHref } = {}) {
  const editor = createEditor(root, { types: TYPES, wheel, onReset: build, fullHref });
  function build() {
    editor.clear();
    const ids = {}, spec = extra ? { ...NODES, ...EXTRA } : NODES;
    for (const key in spec) { const [type, x, y] = spec[key]; ids[key] = editor.addNode(type, { x, y }); }
    (extra ? [...EDGES, ...EXTRA_EDGES] : EDGES).forEach(([a, ap, b, bp]) => editor.connect(ids[a].id, ap, ids[b].id, bp));
    // Al empezar se ve el nodo de la hoja y lo que le llega; todo el grafo cabe con «Fit»
    requestAnimationFrame(() => requestAnimationFrame(() => {
      editor.fit();
      if (editor.scale < 0.6) { // el grafo entero no cabe con letra legible: se empieza en la cadena semilla → planta → hoja, con el borde de arriba bajo la barra de botones
        const narrow = root.clientWidth < 700, k = narrow ? 0.9 : Math.min(0.85, Math.max(0.6, root.clientWidth / (extra ? 1700 : 1180)));
        editor.focusAt(narrow ? 470 : extra ? 700 : 560, root.clientHeight / 2 / k - 80 / k, k);
      }
    }));
  }
  build();
  return editor;
}
