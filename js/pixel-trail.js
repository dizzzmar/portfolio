// PIXEL TRAIL · una estela de píxeles que sigue al cursor, dibujada con WebGL2 en un solo lienzo.
// Es el componente <PixelTrail /> de React Bits (reactbits.dev, de código abierto) pasado a JavaScript puro: el shader y el motor de la estela son los mismos,
// sin React ni dependencias. No pide nada a ningún servidor: todo ocurre en el navegador.
// Quitado respecto al original: la opción de revelar una imagen (imageSrc). Corregido: las partes viejas de la estela se borran sin saltarse ninguna.
// Uso: const trail = createPixelTrail(contenedor, { color: '#ffffff', ... }); trail.destroy() lo quita. Opciones y valores por defecto: ver DEFAULTS.
// El contenedor debe tener tamaño (el lienzo lo rellena) y no recibe eventos del ratón: la estela escucha el puntero de toda la ventana.

const TRAIL_SIZE = 512;
const AGE_SIZE = 256;
const SHAPES = { square: 0, circle: 1, diamond: 2 };
const DECAYS = { fade: 0, shrink: 1, dither: 2 };

const DEFAULTS = {
  gridSize: 40,        // píxeles a lo largo del lado más largo
  trailSize: 0.1,      // radio del pincel, como fracción del lado más largo
  maxAge: 250,         // cuánto dura cada parte de la estela (ms)
  interpolate: 5,      // puntos intermedios que rellenan los huecos en movimientos rápidos
  easingFunction: (x) => x,
  gooeyFilter: false,  // false = píxeles sueltos; { strength: 2 } = píxeles que se funden como líquido
  color: '#ffffff',
  trailColor: null,    // segundo color al que cambia la estela al envejecer
  shape: 'square',     // 'square' | 'circle' | 'diamond'
  gap: 0.08,           // espacio entre píxeles (fracción de un píxel)
  decay: 'fade',       // 'fade' | 'shrink' | 'dither'
  flow: 0,             // cuánto sigue la estela a la deriva en la dirección del cursor (0 a 1)
  gravity: 0,          // la estela cae al apagarse (-1 a 1)
  sparkle: 0,          // parpadeo de los píxeles que se apagan (0 a 1)
  clickBurst: false,   // al pulsar sale un anillo de estela
  shine: 0.6,          // brillo y bisel (0 a 1)
  glow: 0.4,           // resplandor suave alrededor (0 a 1)
  dpr: null,           // resolución máxima (se limita a 2)
};

const VERTEX = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_trail;
uniform sampler2D u_image;
uniform sampler2D u_age;
uniform vec2 u_resolution;
uniform float u_gridSize;
uniform float u_sigma;
uniform vec3 u_color;
uniform vec3 u_trailColor;
uniform float u_ramp;
uniform float u_shine;
uniform float u_glow;
uniform int u_shape;
uniform int u_decay;
uniform float u_gap;
uniform float u_sparkle;
uniform float u_time;
uniform float u_hasImage;
out vec4 outColor;

const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
const vec3 LIGHT = vec3(-0.42, 0.58, 0.7);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float erfApprox(float x) {
  float s = sign(x);
  x = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * exp(-x * x);
  return s * y;
}

float cellValue(ivec2 c) {
  vec2 center = (vec2(c) + 0.5) / u_gridSize;
  if (center.x < 0.0 || center.y < 0.0 || center.x > 1.0 || center.y > 1.0) return 0.0;
  float t = texelFetch(u_trail, clamp(ivec2(center * 512.0), ivec2(0), ivec2(511)), 0).r;
  if (t <= 0.0) return 0.0;
  if (u_sparkle > 0.0) {
    float n = hash(vec2(c) + floor(u_time * 14.0) * 7.31);
    float dim = 1.0 - t;
    if (n < u_sparkle * dim * 0.35) t = max(t, 0.85);
    else if (n > 1.0 - u_sparkle * dim * 0.5) t = 0.0;
  }
  if (u_decay == 2 && t * 2.2 <= (BAYER[(c.y & 3) * 4 + (c.x & 3)] + 0.5) / 16.0) return 0.0;
  return t;
}

vec3 baseColor(ivec2 owner, vec2 uv) {
  if (u_hasImage > 0.5) return texelFetch(u_image, clamp(owner, ivec2(0), ivec2(textureSize(u_image, 0)) - 1), 0).rgb;
  if (u_ramp > 0.5) return mix(u_trailColor, u_color, smoothstep(0.05, 0.95, texture(u_age, uv).r));
  return u_color;
}

vec3 tone(vec3 base, float strength) {
  vec3 body = mix(base * 0.55, base, smoothstep(0.3, 0.75, strength));
  return mix(body, mix(base, vec3(1.0), 0.22), smoothstep(0.85, 1.0, strength) * u_shine);
}

float seams(vec2 q, float cs) {
  if (u_gap <= 0.0) return 0.0;
  vec2 f = fract(q / cs);
  float border = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * cs;
  float width = max(1.0, u_gap * cs * 0.5);
  return 1.0 - smoothstep(width - 0.75, width + 0.75, border);
}

vec3 shade(vec3 base, vec3 n) {
  vec3 l = normalize(LIGHT);
  vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
  float lit = dot(n, l) - l.z;
  vec3 color = base * (1.0 + lit * 0.9 * u_shine);
  float spec = pow(max(dot(n, h), 0.0), 64.0) * 0.85 + pow(max(dot(n, h), 0.0), 10.0) * 0.08;
  color += spec * u_shine * mix(vec3(1.0), base, 0.15) * step(0.001, 1.0 - n.z);
  return clamp(color, 0.0, 1.0);
}

void main() {
  float maxRes = max(u_resolution.x, u_resolution.y);
  vec2 q = gl_FragCoord.xy - 0.5 * u_resolution + 0.5 * maxRes;
  vec2 uv = q / maxRes;
  float cs = maxRes / u_gridSize;
  ivec2 base = ivec2(floor(q / cs));

  float alpha = 0.0;
  vec3 color = vec3(0.0);

  if (u_sigma > 0.0) {
    float inv = 0.70710678 / u_sigma;
    float norm = 0.39894228 / u_sigma;
    float spread = 0.5 / (u_sigma * u_sigma);
    int reach = int(clamp(ceil(3.0 * u_sigma / cs), 1.0, 3.0));
    float field = 0.0;
    vec2 grad = vec2(0.0);
    float best = -1.0;
    ivec2 owner = base;
    float wx[7];
    float gx[7];
    float wy[7];
    float gy[7];
    for (int i = 0; i < 7; i++) {
      int offset = i - 3;
      if (abs(offset) > reach) continue;
      vec2 lo = vec2(base + ivec2(offset)) * cs - q;
      vec2 hi = lo + cs;
      wx[i] = 0.5 * (erfApprox(hi.x * inv) - erfApprox(lo.x * inv));
      wy[i] = 0.5 * (erfApprox(hi.y * inv) - erfApprox(lo.y * inv));
      gx[i] = norm * (exp(-lo.x * lo.x * spread) - exp(-hi.x * hi.x * spread));
      gy[i] = norm * (exp(-lo.y * lo.y * spread) - exp(-hi.y * hi.y * spread));
    }
    for (int j = 0; j < 7; j++) {
      if (abs(j - 3) > reach) continue;
      for (int i = 0; i < 7; i++) {
        if (abs(i - 3) > reach) continue;
        ivec2 c = base + ivec2(i - 3, j - 3);
        float t = cellValue(c);
        if (t <= 0.0) continue;
        float weight = t * wx[i] * wy[j];
        field += weight;
        grad += t * vec2(gx[i] * wy[j], wx[i] * gy[j]);
        if (weight > best) {
          best = weight;
          owner = c;
        }
      }
    }
    float edge = max(0.0263, length(grad) * 0.6);
    alpha = smoothstep(0.5 - edge, 0.5 + edge, field);
    if (alpha > 0.0) {
      vec3 n = normalize(vec3(-grad * cs * 0.55, 1.0));
      float strength = max(cellValue(base), field);
      vec3 body = tone(baseColor(owner, uv), strength);
      body *= 1.0 - seams(q, cs) * 0.32;
      color = shade(body, n);
    }
  } else {
    float t = cellValue(base);
    if (t > 0.0) {
      float halfSize = 0.5 * (1.0 - u_gap);
      float fade = t;
      if (u_decay == 1) {
        halfSize *= sqrt(clamp(t * 2.5, 0.0, 1.0));
        fade = 1.0;
      } else if (u_decay == 2) {
        fade = 1.0;
      }
      vec2 local = fract(q / cs) - 0.5;
      float d;
      vec2 dir;
      if (u_shape == 1) {
        d = length(local) - halfSize;
        dir = normalize(local + 1e-5);
      } else if (u_shape == 2) {
        d = (abs(local.x) + abs(local.y) - halfSize * 1.2) * 0.7071;
        dir = sign(local) * 0.7071;
      } else {
        vec2 a = abs(local) - halfSize;
        d = max(a.x, a.y);
        dir = a.x > a.y ? vec2(sign(local.x), 0.0) : vec2(0.0, sign(local.y));
      }
      float px = 1.0 / cs;
      float coverage = clamp(0.5 - d / px, 0.0, 1.0);
      alpha = coverage * fade;
      if (alpha > 0.0) {
        float bevel = smoothstep(-0.16 * (1.0 - u_gap), 0.0, d);
        vec3 n = normalize(vec3(dir * bevel * 0.9, 1.0));
        color = shade(tone(baseColor(base, uv), t), n);
      }
    }
  }

  vec4 pixel = vec4(color * alpha, alpha);
  if (u_glow > 0.0) {
    float glow = texture(u_trail, uv).r;
    float amount = smoothstep(0.0, 0.7, glow) * u_glow * 0.55 * (1.0 - alpha);
    vec3 tint = u_hasImage > 0.5 ? texture(u_image, uv).rgb : (u_ramp > 0.5 ? mix(u_trailColor, u_color, 0.5) : u_color);
    pixel += vec4(tint * amount, amount);
  }
  if (pixel.a <= 0.002) discard;
  outColor = pixel;
}
`;

// Un color CSS (#fff, rgb(), nombre…) a tres números de 0 a 1, usando un lienzo de 1 píxel
let colorContext = null;
function parseColor(value, fallback) {
  if (!colorContext) {
    const c = document.createElement('canvas'); c.width = 1; c.height = 1;
    colorContext = c.getContext('2d', { willReadFrequently: true });
  }
  if (!colorContext) return fallback;
  colorContext.clearRect(0, 0, 1, 1);
  colorContext.fillStyle = '#000';
  colorContext.fillStyle = value;
  colorContext.fillRect(0, 0, 1, 1);
  const [r, g, b] = colorContext.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader); return null;
}

// Devuelve { destroy() }, o null si el navegador no tiene WebGL2 (entonces simplemente no hay estela)
export function createPixelTrail(container, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const s = {
    gridSize: Math.max(1, o.gridSize), trailSize: Math.max(0, o.trailSize), maxAge: Math.max(1, o.maxAge), interpolate: o.interpolate,
    ease: o.easingFunction || DEFAULTS.easingFunction,
    goo: o.gooeyFilter ? Math.max(0, o.gooeyFilter.strength ?? 2) : 0,
    color: parseColor(o.color, [1, 1, 1]), trailColor: o.trailColor ? parseColor(o.trailColor, [1, 1, 1]) : null,
    shape: SHAPES[o.shape] ?? 0, gap: Math.min(Math.max(o.gap, 0), 0.9), decay: DECAYS[o.decay] ?? 0,
    flow: Math.min(Math.max(o.flow, 0), 1), gravity: Math.min(Math.max(o.gravity, -1), 1), sparkle: Math.min(Math.max(o.sparkle, 0), 1),
    clickBurst: o.clickBurst, shine: Math.min(Math.max(o.shine, 0), 1), glow: Math.min(Math.max(o.glow, 0), 1), dpr: o.dpr,
  };

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX), fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT), program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) { const info = gl.getActiveUniform(program, i); if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name); }

  const vao = gl.createVertexArray(), buffer = gl.createBuffer();
  gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const makeTexture = (unit) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return texture;
  };
  const trailTexture = makeTexture(0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const imageTexture = makeTexture(1);                       // sin imagen: el shader no la usa (u_hasImage = 0), pero la ranura debe existir
  const ageTexture = makeTexture(2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(uniforms.u_trail, 0); gl.uniform1i(uniforms.u_image, 1); gl.uniform1i(uniforms.u_age, 2);

  const trailCanvas = document.createElement('canvas'); trailCanvas.width = TRAIL_SIZE; trailCanvas.height = TRAIL_SIZE;
  const ctx = trailCanvas.getContext('2d');
  const ageCanvas = document.createElement('canvas'); ageCanvas.width = AGE_SIZE; ageCanvas.height = AGE_SIZE;
  const ageCtx = ageCanvas.getContext('2d');
  if (!ctx || !ageCtx) return null;
  ctx.fillStyle = 'black'; ctx.fillRect(0, 0, TRAIL_SIZE, TRAIL_SIZE);

  const state = { alive: true, raf: 0, last: 0, time: 0, visible: true, width: 1, height: 1, ratio: 1, points: [], force: 0, pointer: { x: 0, y: 0, at: 0, vx: 0, vy: 0, inside: false } };

  const addTouch = (x, y, vx, vy) => {
    const { points } = state, last = points[points.length - 1];
    if (last) {
      const dx = last.x - x, dy = last.y - y, dd = dx * dx + dy * dy;
      const force = Math.max(0.3, Math.min(dd * 10000, 1));
      state.force = force;
      if (s.interpolate) {
        const lines = Math.ceil(dd / Math.pow((s.trailSize * 0.5) / s.interpolate, 2));
        for (let i = 1; i < lines; i++) points.push({ x: last.x - (dx / lines) * i, y: last.y - (dy / lines) * i, age: 0, force, vx, vy });
      }
    }
    points.push({ x, y, age: 0, force: state.force, vx, vy });
  };

  const drawTouch = (point) => {
    const x = point.x * TRAIL_SIZE, y = (1 - point.y) * TRAIL_SIZE;
    let intensity = 1;
    if (point.age < s.maxAge * 0.3) intensity = s.ease(point.age / (s.maxAge * 0.3));
    else intensity = s.ease(1 - (point.age - s.maxAge * 0.3) / (s.maxAge * 0.7));
    intensity *= point.force;
    ctx.globalCompositeOperation = 'screen';
    const radius = TRAIL_SIZE * s.trailSize * intensity;
    const gradient = ctx.createRadialGradient(x, y, Math.max(0, radius * 0.25), x, y, Math.max(0, radius));
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)'); gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.beginPath(); ctx.fillStyle = gradient; ctx.arc(x, y, Math.max(0, radius), 0, Math.PI * 2); ctx.fill();
    if (!s.trailColor || radius <= 0) return;
    const scale = AGE_SIZE / TRAIL_SIZE, fresh = Math.round(255 * Math.min(Math.max(1 - point.age / s.maxAge, 0), 1));
    const glaze = ageCtx.createRadialGradient(x * scale, y * scale, 0, x * scale, y * scale, radius * scale);
    glaze.addColorStop(0, `rgb(${fresh}, ${fresh}, ${fresh})`); glaze.addColorStop(0.75, `rgb(${fresh}, ${fresh}, ${fresh})`); glaze.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ageCtx.globalCompositeOperation = 'lighten'; ageCtx.beginPath(); ageCtx.fillStyle = glaze; ageCtx.arc(x * scale, y * scale, radius * scale, 0, Math.PI * 2); ageCtx.fill();
  };

  const updateTrail = (delta) => {
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'black'; ctx.fillRect(0, 0, TRAIL_SIZE, TRAIL_SIZE);
    if (s.trailColor) { ageCtx.globalCompositeOperation = 'source-over'; ageCtx.fillStyle = 'black'; ageCtx.fillRect(0, 0, AGE_SIZE, AGE_SIZE); }
    let kept = 0;
    for (const point of state.points) { point.age += delta * 1000; if (point.age <= s.maxAge) state.points[kept++] = point; }
    state.points.length = kept;
    if (!kept) state.force = 0;
    if (s.flow > 0 || s.gravity !== 0) {
      const drag = Math.exp(-3 * delta);
      for (const point of state.points) { point.vx *= drag; point.vy = point.vy * drag - s.gravity * 1.6 * delta; point.x += point.vx * delta; point.y += point.vy * delta; }
    }
    state.points.forEach(drawTouch);
  };

  const burst = (x, y) => {
    for (let k = 0; k < 14; k++) {
      const angle = (k / 14) * Math.PI * 2 + Math.random() * 0.3, speed = 0.35 + Math.random() * 0.25;
      state.points.push({ x, y, age: 0, force: 1, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }
  };

  const resize = () => {
    const ratio = s.dpr ?? Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    state.width = width; state.height = height; state.ratio = ratio;
    const pw = Math.max(1, Math.floor(width * ratio)), ph = Math.max(1, Math.floor(height * ratio));
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  };

  const draw = () => {
    gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, trailTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
    if (s.trailColor) { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ageTexture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ageCanvas); }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.uniform2f(uniforms.u_resolution, state.width * state.ratio, state.height * state.ratio);
    gl.uniform1f(uniforms.u_gridSize, s.gridSize); gl.uniform3fv(uniforms.u_color, s.color); gl.uniform3fv(uniforms.u_trailColor, s.trailColor ?? s.color);
    gl.uniform1f(uniforms.u_ramp, s.trailColor ? 1 : 0); gl.uniform1f(uniforms.u_sigma, s.goo * state.ratio);
    gl.uniform1f(uniforms.u_shine, s.shine); gl.uniform1f(uniforms.u_glow, s.glow);
    gl.uniform1i(uniforms.u_shape, s.shape); gl.uniform1i(uniforms.u_decay, s.decay); gl.uniform1f(uniforms.u_gap, s.gap);
    gl.uniform1f(uniforms.u_sparkle, s.sparkle); gl.uniform1f(uniforms.u_time, state.time); gl.uniform1f(uniforms.u_hasImage, 0);
    gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const frame = (now) => {
    state.raf = 0;
    if (!state.alive) return;
    const delta = state.last ? Math.min((now - state.last) / 1000, 0.1) : 1 / 60;
    state.last = now; state.time += delta;
    resize(); updateTrail(delta); draw();
    if (state.points.length && state.visible) state.raf = requestAnimationFrame(frame); else state.last = 0;
  };
  const wake = () => { if (!state.raf && state.alive && state.visible) state.raf = requestAnimationFrame(frame); };

  const toUv = (event) => {
    const rect = container.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top, side = Math.max(rect.width, rect.height);
    return { x: (x - rect.width / 2) / side + 0.5, y: (rect.height / 2 - y) / side + 0.5, inside: x >= 0 && y >= 0 && x <= rect.width && y <= rect.height };
  };
  const onMove = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;      // solo con ratón
    const { x, y, inside } = toUv(event), pointer = state.pointer, now = performance.now();
    if (inside) {
      const elapsed = Math.max(0.008, (now - pointer.at) / 1000);
      if (pointer.inside) { pointer.vx += ((x - pointer.x) / elapsed - pointer.vx) * 0.5; pointer.vy += ((y - pointer.y) / elapsed - pointer.vy) * 0.5; }
      else { pointer.vx = 0; pointer.vy = 0; }
      addTouch(x, y, pointer.vx * s.flow * 0.3, pointer.vy * s.flow * 0.3); wake();
    }
    pointer.x = x; pointer.y = y; pointer.at = now; pointer.inside = inside;
  };
  const onDown = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const { x, y, inside } = toUv(event);
    if (inside && s.clickBurst) { burst(x, y); wake(); }
  };
  const onLeave = () => { state.pointer.inside = false; };
  const onLost = (event) => { event.preventDefault(); state.alive = false; cancelAnimationFrame(state.raf); };

  container.append(canvas);
  const resizeObserver = new ResizeObserver(() => { resize(); draw(); });
  resizeObserver.observe(container);
  const visibility = new IntersectionObserver((entries) => { state.visible = entries.some((e) => e.isIntersecting); if (state.visible) wake(); });
  visibility.observe(container);
  canvas.addEventListener('webglcontextlost', onLost);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  resize(); draw();

  return {
    destroy() {
      state.alive = false; cancelAnimationFrame(state.raf);
      resizeObserver.disconnect(); visibility.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave); window.removeEventListener('blur', onLeave);
      gl.deleteTexture(trailTexture); gl.deleteTexture(imageTexture); gl.deleteTexture(ageTexture);
      gl.deleteBuffer(buffer); gl.deleteVertexArray(vao); gl.deleteProgram(program);
      canvas.remove();
    },
  };
}
