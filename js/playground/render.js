// PLAYGROUND · dibuja una hoja (un <canvas>) a partir de lo que llega a un nodo «Sheet»: una planta, una lámina de plantas, las variantes de un rasgo
// o una forma de prueba, con un pincel, una tinta y un papel. No guarda estado de la página: todo viene en los argumentos.
import { INKS, PRESETS, mulberry32, hashSeed, makeNoise2D, strokePath, doodleFill, tracePoly, makePaper } from './engine.js';
import { TRAITS, PALETTES, rollTraits, speciesName, writeText, buildPlant, makeCam } from './plant-engine.js';
import { buildShape } from './brush-shapes.js';

export const LOGICAL = 600;

// ---------- Una planta en su caja (motor de Plant Lab sin cambios; el pincel llega por argumento) ----------
function drawSpecimen(ctx,traits,parts,pose,box,rgb,dotsRef,seed,brush){
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
    const b={...brush};
    ["minThickness","maxThickness","minRadius","maxRadius","spacing","wobble","overshoot"].forEach(p=>b[p]*=k);
    b.snapPx=Math.max(1,b.snapPx*k);
    b.noiseFreq=brush.noiseFreq/k;
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

// ---------- Hojas ----------
// Cada canvas recuerda su papel (se genera una vez por combinación de ajustes y semilla) y el dibujo en curso (las láminas se pintan unas pocas plantas por fotograma).
const sessions = new WeakMap();
const session = (canvas) => { let s = sessions.get(canvas); if (!s) sessions.set(canvas, s = { token: 0, key: '', paper: null }); return s; };
function paperFor(s, w, paper, seed) {
  const key = JSON.stringify(paper) + '|' + seed + '|' + w;
  if (s.key !== key) { s.key = key; s.paper = makePaper(w, w, paper, seed); }
  return s.paper;
}

// Cuadrícula de dibujos en UN papel, sin costuras entre celdas
function drawGrid(canvas, ctx, s, token, items, cfg, o, rgb) {
  const n = items.length, cols = Math.max(1, Math.min(cfg.cols, n)), rows = Math.ceil(n / cols);
  const cw = LOGICAL / cols, ch = LOGICAL / rows;
  const capH = cfg.captions ? Math.min(24, ch * 0.15) : 0;
  const dots = { n: 0 };
  let i = 0;
  const step = () => {
    if (token !== s.token) return; // empezó otra hoja
    const until = Math.min(n, i + (o.preview ? 6 : 2));
    for (; i < until; i++) {
      const it = items[i];
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
      const spin = (mulberry32(hashSeed(it.seed + '|grid'))() * 2 - 1) * (cfg.turn || 0) * 1.3;
      const pose = { ...cfg.pose, yaw: cfg.pose.yaw + spin };
      drawSpecimen(ctx, it.traits, buildPlant(it.traits, it.seed, pose), pose,
        { cx: cx + cw / 2, cy: cy + (ch - capH) / 2, w: cw * 0.76, h: (ch - capH) * 0.80, zoom: cfg.pose.zoom, vary: cfg.vary || 0 }, rgb, dots, it.seed, o.brush);
      if (capH && it.label) {
        const fs = Math.max(8, Math.min(15, ch * 0.075));
        dots.n += writeText(ctx, it.label, cx + cw / 2, cy + ch - capH * 0.62, fs, o.brush,
          mulberry32(hashSeed(it.seed + '|label')), makeNoise2D(mulberry32(hashSeed(it.seed + '|n'))), rgb);
      }
    }
    if (i < n) requestAnimationFrame(step);
  };
  step();
}

// Una variante de un rasgo solo se ve si la planta tiene la parte a la que se aplica
const CAT_NEEDS = { flower: { form: 'bloom' }, arrangement: { form: 'bloom' }, petals: { form: 'bloom' }, leaf: {}, phyllotaxy: {}, density: {}, venation: {}, fill: {}, palette: { colour: 'full' } };
const LEAFY = ['leaf', 'phyllotaxy', 'density', 'venation', 'fill'];

/* d = lo que llega al nodo: { kind: 'plant' | 'study' | 'traits' | 'shape', seed, ... }
   o = { brush, ink (índice), paper, scale, preview, label }  → devuelve { heavy } */
export function renderSheet(canvas, d, o) {
  const s = session(canvas), token = ++s.token;
  const ctx = canvas.getContext('2d');
  const scale = o.preview ? 1 : o.scale, W = LOGICAL * scale;
  canvas.width = W; canvas.height = W;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(paperFor(s, W, o.paper, d ? d.seed : '0'), 0, 0);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (!d) return { heavy: false };
  const rgb = INKS[o.ink][1], dots = { n: 0 };

  if (d.kind === 'plant') {
    const traits = rollTraits(d.seed, d.locks);
    drawSpecimen(ctx, traits, buildPlant(traits, d.seed, d.pose), d.pose,
      { cx: LOGICAL * 0.5, cy: o.label ? LOGICAL * 0.47 : LOGICAL * 0.5, w: LOGICAL * 0.74, h: o.label ? LOGICAL * 0.76 : LOGICAL * 0.80, zoom: d.pose.zoom }, rgb, dots, d.seed, o.brush);
    if (o.label) {
      dots.n += writeText(ctx, speciesName(traits, d.seed).full, LOGICAL * 0.5, LOGICAL * 0.955, 17, o.brush,
        mulberry32(hashSeed(d.seed + '|label')), makeNoise2D(mulberry32(hashSeed(d.seed + '|n'))), rgb);
    }
  } else if (d.kind === 'study') {
    const base = +d.seed || 0, items = [];
    for (let i = 0; i < d.count; i++) {
      const sd = String(base + i), tr = rollTraits(sd, d.locks);
      items.push({ seed: sd, traits: tr, label: d.names ? speciesName(tr, sd).short : '' });
    }
    drawGrid(canvas, ctx, s, token, items, { cols: d.cols, captions: d.names, vary: d.vary, turn: d.turn, pose: d.pose }, o, rgb);
    return { heavy: false };
  } else if (d.kind === 'traits') {
    const key = d.key, base = rollTraits(d.seed, d.locks);
    const fix = { ...(CAT_NEEDS[key] || {}) };
    if (LEAFY.includes(key) && (base.form === 'grass' || base.form === 'fern')) fix.form = 'foliage';
    if (key !== 'ground') fix.ground = 'none'; // una maceta es ruido en un catálogo
    const items = Object.keys(TRAITS[key].opts).map((v) => ({ seed: d.seed, traits: { ...base, ...fix, [key]: v }, label: v }));
    const cols = items.length <= 4 ? items.length : items.length <= 6 ? 3 : 4;
    drawGrid(canvas, ctx, s, token, items, { cols, captions: true, vary: 0, turn: 0, pose: d.pose }, o, rgb);
    return { heavy: false };
  } else if (d.kind === 'shape') {
    const make = () => buildShape(d.shape, LOGICAL, mulberry32(hashSeed(d.seed + '|' + d.shape)));
    const noise = () => makeNoise2D(mulberry32(hashSeed(d.seed + '|n')));
    if (!d.compare) {
      const rnd = mulberry32(hashSeed(d.seed + '|' + d.shape)), n = noise();
      ctx.save();
      ctx.translate(LOGICAL / 2, LOGICAL / 2); ctx.scale(d.size, d.size); ctx.translate(-LOGICAL / 2, -LOGICAL / 2);
      make().forEach((p) => { dots.n += strokePath(ctx, p, o.brush, rnd, n, rgb); });
      ctx.restore();
    } else {
      const names = Object.keys(PRESETS), cols = 3, rows = Math.ceil(names.length / cols), cw = LOGICAL / cols, ch = LOGICAL / rows;
      names.forEach((name, i) => {
        const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
        const rnd = mulberry32(hashSeed(d.seed + '|' + d.shape)), n = noise(), k = Math.min(cw, ch) / LOGICAL * 0.86;
        ctx.save();
        ctx.translate(cx + cw / 2 - LOGICAL * k / 2, cy + ch / 2 - LOGICAL * k / 2 + 8);
        ctx.scale(k, k);
        make().forEach((p) => { strokePath(ctx, p, PRESETS[name], rnd, n, rgb); });
        ctx.restore();
        ctx.fillStyle = 'rgba(40,36,30,.78)';
        ctx.font = '14px "Funnel Sans", "Helvetica Neue", Arial, sans-serif';
        ctx.fillText(name, cx + 14, cy + ch - 14);
      });
      return { heavy: false };
    }
  }
  return { heavy: dots.n > 420000 };
}
