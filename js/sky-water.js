/* SKY-WATER — el cielo se deforma como el agua donde pasa el cursor (portada y /stamps/).
   Una capa de WebGL (sin librerías) encima de la foto del cielo, dentro de su mismo contenedor: así se mueve y se amplía con él.
   Solo dibuja mientras quedan ondas vivas (en reposo no gasta nada) y solo con ratón: no se activa en móvil ni con "reducir movimiento". */
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = document.querySelector('.sky-sharp') || document.querySelector('.sky');
  if (!host) return;

  const MAX = 16, LIFE = 2.4, SCALE = 0.5, IMG_RATIO = 2000 / 1333;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;

  const vs = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const fs = `precision mediump float;
varying vec2 v; uniform sampler2D tex; uniform vec2 res; uniform float ratio, now; uniform vec3 drops[${MAX}];
void main(){
  vec2 uv = vec2(v.x, 1. - v.y);
  float a = res.x / res.y;                      /* la foto cubre el lienzo (como background-size: cover) */
  vec2 t = uv - .5;
  if (a > ratio) t.y *= ratio / a; else t.x *= a / ratio;
  t += .5;
  vec2 q = uv * vec2(a, 1.), disp = vec2(0.); float hi = 0.;
  for (int i = 0; i < ${MAX}; i++) {
    vec3 d = drops[i]; float age = now - d.z;
    if (d.z < 0. || age > ${LIFE.toFixed(1)}) continue;
    vec2 dv = q - d.xy * vec2(a, 1.); float r = length(dv);
    float front = age * .22, w = r - front;   /* el anillo avanza y se ensancha */
    float env = exp(-age * 1.7) * exp(-w * w * 22.) * smoothstep(0., .08, age);
    float s = sin(w * 30.) * env * .5;
    disp += normalize(dv + 1e-4) * s * .02; hi += s;
  }
  vec4 c = texture2D(tex, t + disp);
  float m = clamp(length(disp) * 50. + abs(hi) * 5., 0., 1.);
  hi = clamp(hi, -.6, .6);
  c.rgb += hi * .22;                              /* luz y sombra de la onda: se nota también sobre el azul liso */
  gl_FragColor = vec4(c.rgb * m, m);            /* transparente donde no hay onda: se ve la foto de debajo */
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uRes = U('res'), uNow = U('now'), uDrops = U('drops');
  gl.uniform1f(U('ratio'), IMG_RATIO);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const drops = new Float32Array(MAX * 3).fill(-1);
  let n = 0, ready = false, running = false, lastX = -1e3, lastY = -1e3, lastT = 0;
  const t0 = performance.now(), clock = () => (performance.now() - t0) / 1000;

  const img = new Image();
  img.onload = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    ready = true;
  };
  img.src = '/assets/images/sky.webp';
  host.appendChild(canvas);

  function size() {
    const w = Math.max(2, Math.round(host.offsetWidth * SCALE)), h = Math.max(2, Math.round(host.offsetHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(uRes, w, h); }
  }

  function frame() {
    const now = clock();
    let alive = false;
    for (let i = 0; i < MAX; i++) if (drops[i * 3 + 2] >= 0 && now - drops[i * 3 + 2] < LIFE) { alive = true; break; }
    if (!alive || !ready) { gl.clear(gl.COLOR_BUFFER_BIT); running = false; return; }
    size();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uNow, now); gl.uniform3fv(uDrops, drops);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const now = clock();
    if (now - lastT < 0.07 || Math.hypot(e.clientX - lastX, e.clientY - lastY) < 26) return;
    const r = canvas.getBoundingClientRect();          // incluye el zoom y el movimiento del cielo
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    drops.set([x, y, now], n * 3); n = (n + 1) % MAX;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    if (!running) { running = true; requestAnimationFrame(frame); }
  }, { passive: true });
})();
