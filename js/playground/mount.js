// PLAYGROUND · monta el sandbox en cada contenedor [data-sandbox] de la página (data-extra="1" añade el segundo grupo: una forma de prueba con su propia hoja).
import { mountSandbox } from './sandbox.js?v=20261106a';
document.querySelectorAll('[data-sandbox]').forEach((root) => mountSandbox(root, { extra: root.dataset.extra === '1', fullHref: root.dataset.full }));
