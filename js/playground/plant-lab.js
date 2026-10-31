// PLAYGROUND · Plant Lab. Cada semilla da una planta distinta (forma, hojas, flor, trazo) dibujada con el pincel de puntitos sobre papel.
// Tres vistas: una planta, una lámina de plantas seguidas (Study) y todas las variantes de un rasgo (Traits). Pulsar una planta de la lámina la abre;
// pulsar una variante de Traits la fija. El motor está en engine.js y plant-engine.js; los controles compartidos, en lab-kit.js.
import { PRESETS, INKS, BRUSH_PARAMS, PAPER_PARAMS, mulberry32, hashSeed, makeNoise2D, strokePath, doodleFill, tracePoly } from './engine.js';
import { TRAITS, GROUPS, PALETTES, rollTraits, speciesName, writeText, buildPlant, makeCam } from './plant-engine.js';
import { $, scheduler, paperCache, slider, toggle, tabs, mediaPicker, inkPicker, savePng, copySettings } from './lab-kit.js';

const LOGICAL = 600;
const DEFAULT_POSE = { yaw: -0.22, pitch: 0.06, roll: 0, depth: 0.30, zoom: 1 };
const state = {
  view: 'bench', seed: '', ink: 0, scale: 2, preset: 'ink nib',
  brush: { ...PRESETS['ink nib'] },
  paper: { tone: 70, warmth: 80, grain: 13, mottle: 4, mottleScale: 6, fibers: 260, vignette: 5 },
  pose: { ...DEFAULT_POSE },
  study: { count: 12, cols: 4, captions: true, turn: 0, vary: 0.55 },
  label: false,
  catalogue: 'leaf',
  locks: {},
};
for (const k in TRAITS) state.locks[k] = 'auto';

const view = $('#view'), vctx = view.getContext('2d');
const paper = paperCache();
const note = $('#note');

// ---------- Una planta en su hoja ----------
function drawSpecimen(ctx,traits,parts,pose,box,rgb,dotsRef,seed){
  seed=seed||state.seed;
  /* Same fix on the render side: colour, interior fill and ink each get a stream
     keyed to the part they belong to, so a brush tweak cannot reshuffle a
     neighbouring stroke and a palette change cannot disturb the linework. */
  const RS=(...k)=>mulberry32(hashSeed(seed+"|"+k.join(":")));
  const noise=makeNoise2D(mulberry32(hashSeed(seed+"|n")));

  /* Project at unit scale first, measure the silhouette, then fit it to the frame.
     Perspective here is scale-independent, so measuring once is exact. */
  const probe=makeCam(pose,1,0,0);
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;      /* the plant */
  let gx0=Infinity,gx1=-Infinity,gy0=Infinity,gy1=-Infinity;  /* what it stands in */
  const proj=parts.map(p=>{
    const paths=p.paths.map(path=>path.map(probe));
    const fill=p.fill?p.fill.map(probe):null;
    let z=0,n=0;
    const isG=String(p.key).startsWith("gnd");
    paths.forEach(path=>path.forEach(q=>{
      if(isG){
        if(q.x<gx0)gx0=q.x; if(q.x>gx1)gx1=q.x;
        if(q.y<gy0)gy0=q.y; if(q.y>gy1)gy1=q.y;
      } else {
        if(q.x<x0)x0=q.x; if(q.x>x1)x1=q.x;
        if(q.y<y0)y0=q.y; if(q.y>y1)y1=q.y;
      }
    }));
    p.paths.forEach(path=>path.forEach(v=>{z+=v.z;n++;}));
    return {paths,fill,tone:p.tone,key:p.key,z:n?z/n:0};
  });
  /* A wide soil line or a deep pot used to drive the whole frame and shrink the
     specimen to nothing. Ground may push the edges out, but only so far. */
  if(gx0<Infinity){
    const pw=Math.max(1e-3,x1-x0), ph=Math.max(1e-3,y1-y0);
    x0=Math.min(x0,Math.max(gx0,x0-pw*0.30)); x1=Math.max(x1,Math.min(gx1,x1+pw*0.30));
    y0=Math.min(y0,Math.max(gy0,y0-ph*0.15)); y1=Math.max(y1,Math.min(gy1,y1+ph*0.45));
  }
  const bw=Math.max(1e-3,x1-x0), bh=Math.max(1e-3,y1-y0);
  /* Filling every cell makes a thin stem and a squat rosette the same height, so
     a plate of uprights turns into a page of hairlines. Blend the cell-fit scale
     toward the specimen's true size — the model is built at height ~1, so its own
     bounding box already knows how big it ought to be. Clamped so nothing spills. */
  const fit=Math.min(box.w/bw,box.h/bh);
  const vary=box.vary||0;
  const trueS=box.h/1.05;
  const S=Math.min(fit,fit*Math.pow(trueS/fit,vary))*(box.zoom||1);
  const mx=(x0+x1)/2, my=(y0+y1)/2;
  const map=q=>({x:box.cx+(q.x-mx)*S, y:box.cy+(q.y-my)*S});

  /* Media is described in absolute px, so at half size the same preset clogs and at
     double size it thins to a scratch. Scale the hand with the drawing. */
  const k=Math.max(0.45,Math.min(1.7,S/460));
  const B=(()=>{
    const b={...state.brush};
    ["minThickness","maxThickness","minRadius","maxRadius","spacing","wobble","overshoot"].forEach(p=>b[p]*=k);
    b.snapPx=Math.max(1,b.snapPx*k);
    b.noiseFreq=state.brush.noiseFreq/k;
    return b;
  })();
  const flat=proj.map(p=>({
    paths:p.paths.map(path=>path.map(map)),
    fill:p.fill?p.fill.map(map):null,
    tone:p.tone,key:p.key,z:p.z
  })).sort((a,b)=>a.z-b.z);

  /* colour first, flat and misregistered, so the ink lands on top of it */
  if(traits.colour!=="none"){
    const pal=PALETTES[traits.palette];
    ctx.save();ctx.globalCompositeOperation="multiply";
    flat.forEach(p=>{
      if(!p.fill)return;
      if(traits.colour==="accent"&&p.tone!==2)return;
      const rnd=RS("col",p.key);
      const c=pal[p.tone%pal.length];
      ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;

      const blob=doodleFill(p.fill,rnd,noise,1);
      ctx.globalAlpha=0.66;
      tracePoly(ctx,blob);ctx.fill();

      /* a second, sloppier coat — where the two overlap the colour sits denser,
         the way a marker gone over twice does */
      ctx.globalAlpha=0.24;
      tracePoly(ctx,doodleFill(p.fill,rnd,noise,1.45,0.3));ctx.fill();

      /* break the vector edge with the same grain the ink uses */
      ctx.globalAlpha=1;
      dotsRef.n+=strokePath(ctx,blob,{
        ...B,alpha:0.10,density:Math.max(3,Math.round(B.density*0.45)),
        minThickness:1.0*k,maxThickness:3.6*k,taper:0,passes:1,overshoot:0,
        wobble:0,toneJitter:8
      },rnd,noise,c);
    });
    ctx.restore();
  }

  /* foliage fill treatment, drawn in ink inside the blade bounds */
  if(traits.fill!=="none"){
    flat.forEach(p=>{
      if(!p.fill||p.tone!==1)return;
      let xs=Infinity,xe=-Infinity,ys=Infinity,ye=-Infinity;
      p.fill.forEach(q=>{xs=Math.min(xs,q.x);xe=Math.max(xe,q.x);ys=Math.min(ys,q.y);ye=Math.max(ye,q.y);});
      ctx.save();
      ctx.beginPath();ctx.moveTo(p.fill[0].x,p.fill[0].y);
      for(let i=1;i<p.fill.length;i++)ctx.lineTo(p.fill[i].x,p.fill[i].y);
      ctx.closePath();ctx.clip();
      const rnd=RS("treat",p.key);
      const o={...B,overshoot:0,passes:1};
      /* below thumbnail size any interior treatment just fills the specimen in
         solid black, so step it down and finally drop it altogether */
      if(k<0.42)return;
      const treat=(k<0.66&&traits.fill!=="stipple")?"hatch":traits.fill;
      if(k<0.66)o.alpha=Math.max(0.04,o.alpha*0.45);
      if(treat==="hatch"){
        const step=Math.max(5,(xe-xs)/(k<0.66?5:9));
        for(let x=xs-(ye-ys);x<xe+(ye-ys);x+=step)
          dotsRef.n+=strokePath(ctx,[{x,y:ys},{x:x+(ye-ys),y:ye}],o,rnd,noise,rgb);
      } else if(treat==="scribble"){
        const pts=[];const n=54;
        for(let i=0;i<=n;i++){
          const t=i/n;
          pts.push({x:xs+t*(xe-xs),y:ys+(ye-ys)*(0.5+0.44*Math.sin(t*Math.PI*9))});
        }
        dotsRef.n+=strokePath(ctx,pts,o,rnd,noise,rgb);
      } else if(treat==="stipple"){
        ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.min(1,o.alpha*1.6)})`;
        const n=Math.min(700,Math.round((xe-xs)*(ye-ys)/(k<0.66?70:26)));
        for(let i=0;i<n;i++){
          const x=xs+rnd()*(xe-xs),y=ys+rnd()*(ye-ys),r=o.minRadius+rnd()*(o.maxRadius-o.minRadius);
          ctx.beginPath();ctx.arc(x,y,r,0,6.2831853);ctx.fill();dotsRef.n++;
        }
      } else if(treat==="solid"){
        const so={...o,taper:0,wobble:1.2*k,spacing:Math.max(1.4,o.spacing*1.6),
                  density:Math.max(2,Math.round(o.density*0.5)),alpha:Math.min(1,o.alpha*1.5)};
        const step=Math.max(2.4,o.maxThickness*0.95);
        for(let y=ys;y<ye;y+=step)
          dotsRef.n+=strokePath(ctx,[{x:xs,y},{x:xe,y}],so,rnd,noise,rgb);
      }
      ctx.restore();
    });
  }

  /* ink last */
  flat.forEach(p=>p.paths.forEach((path,j)=>{dotsRef.n+=strokePath(ctx,path,B,RS("ink",p.key,j),noise,rgb);}));
}

// ---------- Láminas: muchas plantas en UN papel, dibujadas unas pocas por fotograma para no bloquear la página ----------
const B_TEXT = () => ({ ...state.brush });
let gridToken = 0, gridCells = [];
function renderGrid(items, cfg, preview) {
  const token = ++gridToken;
  const scale = preview ? 1 : state.scale, W = LOGICAL * scale;
  view.width = W; view.height = W;
  vctx.setTransform(1, 0, 0, 1, 0, 0);
  vctx.drawImage(paper(W, state.paper, state.seed), 0, 0);
  vctx.setTransform(scale, 0, 0, scale, 0, 0);

  const n = items.length, cols = Math.max(1, Math.min(cfg.cols, n)), rows = Math.ceil(n / cols);
  const cw = LOGICAL / cols, ch = LOGICAL / rows;
  const capH = cfg.captions ? Math.min(24, ch * 0.15) : 0;
  const rgb = INKS[state.ink][1];
  const dotsRef = { n: 0 };
  gridCells = [];
  let i = 0;
  const step = () => {
    if (token !== gridToken) return; // empezó otra lámina
    const until = Math.min(n, i + (preview ? 6 : 2));
    for (; i < until; i++) {
      const it = items[i];
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
      gridCells.push({ x: cx, y: cy, w: cw, h: ch, item: it });
      const spin = (mulberry32(hashSeed(it.seed + '|grid'))() * 2 - 1) * (cfg.turn || 0) * 1.3;
      const pose = { ...state.pose, yaw: state.pose.yaw + spin };
      drawSpecimen(vctx, it.traits, buildPlant(it.traits, it.seed, pose), pose,
        { cx: cx + cw / 2, cy: cy + (ch - capH) / 2, w: cw * 0.76, h: (ch - capH) * 0.80, zoom: state.pose.zoom, vary: cfg.vary || 0 },
        rgb, dotsRef, it.seed);
      if (capH && it.label) {
        // El nombre se escribe con el mismo pincel que la planta
        const fs = Math.max(8, Math.min(15, ch * 0.075));
        dotsRef.n += writeText(vctx, it.label, cx + cw / 2, cy + ch - capH * 0.62, fs, B_TEXT(),
          mulberry32(hashSeed(it.seed + '|label')), makeNoise2D(mulberry32(hashSeed(it.seed + '|n'))), rgb);
      }
    }
    if (i < n) requestAnimationFrame(step);
  };
  step();
}

function renderStudy(preview) {
  const base = +state.seed || 0, items = [];
  for (let i = 0; i < state.study.count; i++) {
    const sd = String(base + i), tr = rollTraits(sd, state.locks);
    items.push({ seed: sd, traits: tr, label: state.study.captions ? speciesName(tr, sd).short : '' });
  }
  renderGrid(items, { cols: state.study.cols, captions: state.study.captions, vary: state.study.vary, turn: state.study.turn }, preview);
  syncTraits(rollTraits(state.seed, state.locks));
}

// Una variante de un rasgo solo se ve si la planta tiene la parte a la que se aplica: el catálogo de flores se hace sobre una planta con flor
const CAT_NEEDS = { flower: { form: 'bloom' }, arrangement: { form: 'bloom' }, petals: { form: 'bloom' }, leaf: {}, phyllotaxy: {}, density: {}, venation: {}, fill: {}, palette: { colour: 'full' } };
const LEAFY = ['leaf', 'phyllotaxy', 'density', 'venation', 'fill'];
function renderTraits(preview) {
  const key = state.catalogue, base = rollTraits(state.seed, state.locks);
  const fix = { ...(CAT_NEEDS[key] || {}) };
  if (LEAFY.includes(key) && (base.form === 'grass' || base.form === 'fern')) fix.form = 'foliage';
  if (key !== 'ground') fix.ground = 'none'; // una maceta es ruido en un catálogo
  const items = Object.keys(TRAITS[key].opts).map((v) => ({ seed: state.seed, traits: { ...base, ...fix, [key]: v }, label: v }));
  const cols = items.length <= 4 ? items.length : items.length <= 6 ? 3 : 4;
  renderGrid(items, { cols, captions: true, vary: 0, turn: 0 }, preview);
  syncTraits(base);
}

function render(preview) {
  if (state.view === 'study') { renderStudy(preview); return; }
  if (state.view === 'traits') { renderTraits(preview); return; }
  gridToken++;
  const scale = preview ? 1 : state.scale, W = LOGICAL * scale;
  view.width = W; view.height = W;
  vctx.setTransform(1, 0, 0, 1, 0, 0);
  vctx.drawImage(paper(W, state.paper, state.seed), 0, 0);
  vctx.setTransform(scale, 0, 0, scale, 0, 0);

  const traits = rollTraits(state.seed, state.locks);
  const rgb = INKS[state.ink][1], dotsRef = { n: 0 };
  drawSpecimen(vctx, traits, buildPlant(traits, state.seed, state.pose), state.pose,
    { cx: LOGICAL * 0.5, cy: state.label ? LOGICAL * 0.47 : LOGICAL * 0.5, w: LOGICAL * 0.74, h: state.label ? LOGICAL * 0.76 : LOGICAL * 0.80, zoom: state.pose.zoom }, rgb, dotsRef);
  // La especie se rotula en la propia hoja, con la misma mano
  if (state.label) {
    dotsRef.n += writeText(vctx, speciesName(traits, state.seed).full, LOGICAL * 0.5, LOGICAL * 0.955, 17, state.brush,
      mulberry32(hashSeed(state.seed + '|label')), makeNoise2D(mulberry32(hashSeed(state.seed + '|n'))), rgb);
  }
  syncTraits(traits);
  // Solo se avisa cuando de verdad pesa: es lo único que el visitante puede corregir
  note.textContent = dotsRef.n > 420000 ? 'Heavy drawing: lower the density or raise the alpha.' : '';
}
const request = scheduler(render);

// ---------- Rasgos: cada selector enseña el valor que tiene ahora la planta; elegir uno lo fija, «Random» lo suelta ----------
const traitRefs = {};
function buildTraits() {
  for (const group in GROUPS) {
    const host = $('#t-' + group);
    GROUPS[group].forEach((key) => {
      const id = 'pg-t-' + key;
      const shown = document.createElement('span'); shown.className = 'pg-shown'; shown.setAttribute('aria-hidden', 'true');
      const sel = document.createElement('select'); sel.id = id;
      sel.innerHTML = '<option value="auto">Random</option>' + Object.keys(TRAITS[key].opts).map((v) => `<option value="${v}">${v}</option>`).join('');
      sel.addEventListener('change', () => { state.locks[key] = sel.value; request(false); });
      const wrap = document.createElement('div'); wrap.className = 'pg-pick'; wrap.append(shown, sel);
      const label = document.createElement('label'); label.htmlFor = id; label.textContent = TRAITS[key].label;
      const row = document.createElement('div'); row.className = 'pg-row pg-row-inline'; row.append(label, wrap);
      host.append(row);
      traitRefs[key] = { sel, shown, wrap, label: TRAITS[key].label };
    });
  }
}
function syncTraits(traits) {
  for (const key in traitRefs) {
    const r = traitRefs[key], locked = state.locks[key] !== 'auto';
    const value = locked ? state.locks[key] : traits[key];
    r.sel.value = state.locks[key];
    r.shown.textContent = value;
    r.wrap.classList.toggle('is-locked', locked);
    r.sel.setAttribute('aria-label', `${r.label}: ${value}${locked ? '' : ', random'}`);
  }
}

// ---------- Controles ----------
const refresh = () => request(false);
const preview = () => request(true);
const brushSliders = [], poseSliders = [];

function build() {
  buildTraits();

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
  [['yaw', -1.6, 1.6, 0.01, ''], ['pitch', -0.9, 0.9, 0.01, ''], ['roll', -0.7, 0.7, 0.01, ''], ['depth', 0, 1, 0.02, ''], ['zoom', 0.5, 1.5, 0.02, '×']].forEach(([key, min, max, step, unit]) => {
    poseSliders.push(slider($('#g-pose'), { label: key, get: () => state.pose[key], set: (v) => { state.pose[key] = v; }, min, max, step, unit, onInput: preview, onCommit: refresh }));
  });
  $('#pose-reset').addEventListener('click', () => { state.pose = { ...DEFAULT_POSE }; poseSliders.forEach((s) => s.sync()); refresh(); });

  const s = state.study, st = $('#g-study');
  slider(st, { label: 'specimens', get: () => s.count, set: (v) => { s.count = Math.round(v); }, min: 4, max: 30, step: 1, onInput: preview, onCommit: refresh });
  slider(st, { label: 'columns', get: () => s.cols, set: (v) => { s.cols = Math.round(v); }, min: 2, max: 6, step: 1, onInput: preview, onCommit: refresh });
  slider(st, { label: 'size variation', get: () => s.vary, set: (v) => { s.vary = v; }, min: 0, max: 1, step: 0.05, onInput: preview, onCommit: refresh });
  slider(st, { label: 'turn spread', get: () => s.turn, set: (v) => { s.turn = v; }, min: 0, max: 1, step: 0.05, onInput: preview, onCommit: refresh });
  toggle(st, { label: 'Names', get: () => s.captions, set: (v) => { s.captions = v; }, onChange: refresh });

  const cat = $('#catalogue');
  cat.innerHTML = Object.keys(TRAITS).map((k) => `<option value="${k}">${TRAITS[k].label}</option>`).join('');
  cat.value = state.catalogue;
  const shown = cat.previousElementSibling, showCat = () => { shown.textContent = TRAITS[cat.value].label; };
  showCat();
  cat.addEventListener('change', () => { state.catalogue = cat.value; showCat(); refresh(); });

  const out = $('#g-output');
  toggle(out, { label: 'Name on the sheet', get: () => state.label, set: (v) => { state.label = v; }, onChange: refresh });
  slider(out, { label: 'resolution', get: () => state.scale, set: (v) => { state.scale = Math.round(v); }, min: 1, max: 3, step: 1, unit: '×', onCommit: refresh });
}

// ---------- Vistas, semilla, teclado ----------
const viewTabs = tabs($('#views'), [['bench', 'Single'], ['study', 'Study'], ['traits', 'Traits']], state.view, (v) => setView(v));
function setView(v) {
  state.view = v;
  viewTabs.select(v);
  $('#d-study').hidden = v !== 'study';
  $('#d-traits').hidden = v !== 'traits';
  view.classList.toggle('is-sheet', v !== 'bench');
  view.setAttribute('aria-label', v === 'bench' ? 'Plant drawing' : v === 'study' ? 'Sheet of plant drawings, click one to open it' : 'Every variant of one trait, click one to fix it');
  refresh();
}
const seedInput = $('#seed');
function setSeed(s) { state.seed = String(s); seedInput.value = state.seed; refresh(); }
seedInput.addEventListener('input', () => { state.seed = seedInput.value || '0'; preview(); });
seedInput.addEventListener('change', refresh);
$('#prev').addEventListener('click', () => setSeed(Math.max(0, (+state.seed || 0) - 1)));
$('#next').addEventListener('click', () => setSeed((+state.seed || 0) + 1));
$('#reroll').addEventListener('click', () => setSeed(Math.floor(Math.random() * 10000)));

// Pulsar una planta de la lámina la abre; pulsar una variante del catálogo la fija
view.addEventListener('click', (e) => {
  if (state.view === 'bench') return;
  const r = view.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * LOGICAL, y = (e.clientY - r.top) / r.height * LOGICAL;
  const hit = gridCells.find((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
  if (!hit) return;
  if (state.view === 'traits') { state.locks[state.catalogue] = hit.item.label; setView('bench'); }
  else { state.seed = String(hit.item.seed); seedInput.value = state.seed; setView('bench'); }
});

$('#save').addEventListener('click', () => {
  render(false);
  savePng(view, `plant_${state.seed}_${state.preset.replace(/\W/g, '-')}.png`);
});
$('#copy').addEventListener('click', () => copySettings({
  seed: state.seed, medium: state.preset, brush: state.brush, paper: state.paper, ink: INKS[state.ink][0], pose: state.pose, traits: rollTraits(state.seed, state.locks),
}, $('#copy-note')));
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target !== document.body) return; // solo con nada enfocado: sobre un botón, una pestaña o un campo las flechas son suyas
  if (e.key === 'r' || e.key === 'R') $('#reroll').click();
  if (e.key === 's' || e.key === 'S') $('#save').click();
  if (e.key === 'ArrowRight') $('#next').click();
  if (e.key === 'ArrowLeft') $('#prev').click();
});

// Una semilla fija al abrir haría que un programa generativo parezca una imagen: sale una al azar, salvo que la dirección lleve ?seed=
const urlSeed = new URLSearchParams(location.search).get('seed');
state.seed = urlSeed ? urlSeed : String(Math.floor(Math.random() * 10000));
seedInput.value = state.seed;
build();
setView('bench');
