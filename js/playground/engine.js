// PLAYGROUND · motor de dibujo compartido por Plant Lab y Brush Lab: números al azar con semilla, ruido, el pincel (cada trazo es una nube de puntitos)
// y el papel. Es el mismo código de los dos laboratorios originales, sin cambios de comportamiento; solo se exporta para que lo usen las dos páginas.

/* ══════════════ 1. DETERMINISM ══════════════ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashSeed(s){s=String(s);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function makeNoise2D(rand){
  const g3=new Float32Array([1,1,-1,1,1,-1,-1,-1,1,0,-1,0,1,0,-1,0,0,1,0,-1,0,1,0,-1]);
  const p=new Uint8Array(256);for(let i=0;i<256;i++)p[i]=i;
  for(let i=255;i>0;i--){const j=(rand()*(i+1))|0;const t=p[i];p[i]=p[j];p[j]=t;}
  const perm=new Uint16Array(512),pm=new Uint8Array(512);
  for(let i=0;i<512;i++){perm[i]=p[i&255];pm[i]=perm[i]%12;}
  const F2=0.5*(Math.sqrt(3)-1),G2=(3-Math.sqrt(3))/6;
  return function(xin,yin){
    let n0=0,n1=0,n2=0;const s=(xin+yin)*F2;
    const i=Math.floor(xin+s),j=Math.floor(yin+s);const t=(i+j)*G2;
    const x0=xin-(i-t),y0=yin-(j-t);
    let i1,j1;if(x0>y0){i1=1;j1=0;}else{i1=0;j1=1;}
    const x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2;
    const ii=i&255,jj=j&255;
    const gi0=pm[ii+perm[jj]]*2,gi1=pm[ii+i1+perm[jj+j1]]*2,gi2=pm[ii+1+perm[jj+1]]*2;
    let t0=0.5-x0*x0-y0*y0;if(t0>0){t0*=t0;n0=t0*t0*(g3[gi0]*x0+g3[gi0+1]*y0);}
    let t1=0.5-x1*x1-y1*y1;if(t1>0){t1*=t1;n1=t1*t1*(g3[gi1]*x1+g3[gi1+1]*y1);}
    let t2=0.5-x2*x2-y2*y2;if(t2>0){t2*=t2;n2=t2*t2*(g3[gi2]*x2+g3[gi2+1]*y2);}
    return 70*(n0+n1+n2);};
}
const clamp255=v=>v<0?0:v>255?255:v|0;

/* ══════════════ 2. BRUSH (Phase 1 engine, unchanged) ══════════════ */
const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
function resample(pts,step){
  if(pts.length<2)return pts.slice();
  const out=[{x:pts[0].x,y:pts[0].y}];let carry=0;
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i],seg=dist(a,b);
    if(seg<1e-9)continue;
    let d=step-carry;
    while(d<=seg){const u=d/seg;out.push({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u});d+=step;}
    carry=seg-(d-step);
  }
  const last=pts[pts.length-1];
  if(dist(out[out.length-1],last)>step*0.25)out.push({x:last.x,y:last.y});
  return out;
}
function wobblePath(pts,amp,freq,noise,off){
  if(amp<=0)return pts;
  const p=resample(pts,1.6),n=p.length;
  if(n<2)return p;
  const fLo=freq*0.0075,fHi=freq*0.0380,out=new Array(n);
  for(let i=0;i<n;i++){
    const a=p[Math.max(0,i-1)],b=p[Math.min(n-1,i+1)];
    let tx=b.x-a.x,ty=b.y-a.y;const L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;
    const d=(noise(p[i].x*fLo+off,p[i].y*fLo+off)*0.74+noise(p[i].x*fHi+off*3.1,p[i].y*fHi+off*3.1)*0.26)*amp;
    out[i]={x:p[i].x-ty*d,y:p[i].y+tx*d};
  }
  return out;
}
function applyOvershoot(pts,px,rnd){
  if(px<=0||pts.length<2)return pts;
  const out=pts.slice();
  const ext=(a,b,amt)=>{let dx=b.x-a.x,dy=b.y-a.y;const L=Math.hypot(dx,dy)||1;return{x:b.x+dx/L*amt,y:b.y+dy/L*amt};};
  const s=(rnd()*2-1)*px,e=(rnd()*2-1)*px;
  if(s>0)out.unshift(ext(out[1],out[0],s));
  if(e>0)out.push(ext(out[out.length-2],out[out.length-1],e));
  return out;
}
function renderStroke(ctx,pts,o,rnd,noise,rgb){
  const path=resample(pts,Math.max(0.4,o.spacing)),n=path.length;
  if(n<1)return 0;
  const spanT=Math.max(1,n-1),f=o.noiseFreq;
  const range=Math.max(0,o.maxThickness-o.minThickness);
  const dotRange=Math.max(0,o.maxRadius-o.minRadius);
  const snapOn=o.snapAmount>0&&o.snapPx>=1;
  let dots=0;
  for(let i=0;i<n;i++){
    const px=path[i].x,py=path[i].y,t=i/spanT;
    const k=f>0?Math.abs(noise(px*f,py*f)):rnd();
    let thick=o.minThickness+range*k;
    if(o.taper>0){
      const prof=Math.pow(Math.sin(Math.PI*Math.min(1,Math.max(0,t))),0.55);
      thick*=(1-o.taper)+o.taper*prof;
    }
    if(thick<=0.01)continue;
    if(o.toneJitter>0){
      const j=(rnd()*2-1)*o.toneJitter;
      ctx.fillStyle=`rgba(${clamp255(rgb[0]+j)},${clamp255(rgb[1]+j)},${clamp255(rgb[2]+j)},${o.alpha})`;
    }
    for(let d=0;d<o.density;d++){
      const r=thick*Math.sqrt(rnd()),a=rnd()*Math.PI*2;
      let x=px+r*Math.cos(a),y=py+r*Math.sin(a);
      if(snapOn){
        if(rnd()<o.snapAmount)x=Math.round(x/o.snapPx)*o.snapPx;
        if(rnd()<o.snapAmount)y=Math.round(y/o.snapPx)*o.snapPx;
      }
      const rad=o.minRadius+dotRange*rnd();
      if(rad<0.75)ctx.fillRect(x-rad,y-rad,rad*2,rad*2);
      else{ctx.beginPath();ctx.arc(x,y,rad,0,6.2831853);ctx.fill();}
      dots++;
    }
  }
  return dots;
}
function strokePath(ctx,pts,o,rnd,noise,rgb){
  if(!pts||pts.length<2)return 0;
  ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${o.alpha})`;
  const base=o.wobble>0?wobblePath(pts,o.wobble,o.wobbleFreq,noise,7.31):pts;
  let dots=0;
  for(let pass=0;pass<o.passes;pass++){
    let p=base;
    if(pass>0&&o.wobble>0)p=wobblePath(base,o.wobble*0.22,o.wobbleFreq*2.4,noise,pass*211.7+13.4);
    if(o.overshoot>0)p=applyOvershoot(p,o.overshoot,rnd);
    dots+=renderStroke(ctx,p,o,rnd,noise,rgb);
  }
  return dots;
}

/* ── colour shapes ──────────────────────────────────────────────────
   A fill is not the outline shifted over. It is a second, clumsier drawing of
   the same thing: corners rounded off, edges lumpy at three scales, lumpier in
   some stretches than others, and soft where the medium ran out. */
function polyCentroid(p){let x=0,y=0;for(const q of p){x+=q.x;y+=q.y;}return{x:x/p.length,y:y/p.length};}
function polySize(p){
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const q of p){if(q.x<x0)x0=q.x;if(q.x>x1)x1=q.x;if(q.y<y0)y0=q.y;if(q.y>y1)y1=q.y;}
  return Math.max(1,Math.hypot(x1-x0,y1-y0));
}
function smoothClosed(p,iters){
  const n=p.length;
  for(let it=0;it<iters;it++){
    const out=new Array(n);
    for(let i=0;i<n;i++){
      const a=p[(i-1+n)%n],b=p[(i+1)%n],q=p[i];
      out[i]={x:(a.x+q.x*2+b.x)/4,y:(a.y+q.y*2+b.y)/4};
    }
    p=out;
  }
  return p;
}
function doodleFill(pts,rnd,noise,strength,spread){
  const sp=spread===undefined?1:spread;
  const size=polySize(pts);
  let p=resample(pts,Math.max(1.5,size*0.018));
  if(p.length<6)return pts;
  p=smoothClosed(p,8);                       /* a coloured-in shape has no sharp tips */
  const c=polyCentroid(p);
  const sx=1+(rnd()*2-1)*0.085*sp, sy=1+(rnd()*2-1)*0.075*sp;
  const ox=(rnd()*2-1)*size*0.034*sp, oy=(rnd()*2-1)*size*0.034*sp;
  p=p.map(q=>({x:c.x+(q.x-c.x)*sx+ox, y:c.y+(q.y-c.y)*sy+oy}));

  const n=p.length,out=new Array(n),off=rnd()*300;
  const amp=size*0.058*strength;
  const f1=1.7/size, f2=5.5/size, f3=15/size, fm=2.9/size;
  for(let i=0;i<n;i++){
    const a=p[(i-1+n)%n],b=p[(i+1)%n];
    let tx=b.x-a.x,ty=b.y-a.y;const L=Math.hypot(tx,ty)||1;tx/=L;ty/=L;
    const mod=0.28+0.72*Math.abs(noise(p[i].x*fm+off,p[i].y*fm+off));
    const d=(noise(p[i].x*f1+off,p[i].y*f1+off)*0.58
            +noise(p[i].x*f2+off*2.3,p[i].y*f2+off*2.3)*0.30
            +noise(p[i].x*f3+off*5.1,p[i].y*f3+off*5.1)*0.12)*amp*mod;
    out[i]={x:p[i].x-ty*d,y:p[i].y+tx*d};
  }
  return smoothClosed(out,1);
}
function tracePoly(ctx,p){
  ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
  for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
  ctx.closePath();
}

/* ══════════════ 3. PAPER ══════════════ */
function makePaper(w,h,cfg,seed){
  const cv=document.createElement("canvas");cv.width=w;cv.height=h;
  const ctx=cv.getContext("2d");
  const rnd=mulberry32(hashSeed(seed+"|paper"));
  const noise=makeNoise2D(mulberry32(hashSeed(seed+"|paper-noise")));
  const L=196+cfg.tone*0.62;
  const base=[L,L-cfg.warmth*0.055,L-cfg.warmth*0.165];
  const img=ctx.createImageData(w,h),px=img.data;
  const f1=1/(cfg.mottleScale*6),f2=1/(cfg.mottleScale*1.8),f3=1/(cfg.mottleScale*0.55);
  const g=cfg.grain,m=cfg.mottle,cx=w/2,cy=h/2,maxR=Math.hypot(cx,cy),vg=cfg.vignette;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let v=0;
    if(m>0)v+=(noise(x*f1,y*f1)*0.46+noise(x*f2,y*f2)*0.33+noise(x*f3,y*f3)*0.21)*m;
    if(g>0)v+=(rnd()*2-1)*g;
    if(vg>0)v-=Math.pow(Math.hypot(x-cx,y-cy)/maxR,2.4)*vg;
    const i=(y*w+x)*4;
    px[i]=clamp255(base[0]+v);px[i+1]=clamp255(base[1]+v);px[i+2]=clamp255(base[2]+v);px[i+3]=255;
  }
  ctx.putImageData(img,0,0);
  for(let i=0;i<(cfg.fibers|0);i++){
    const x=rnd()*w,y=rnd()*h,a=rnd()*Math.PI*2,len=2+rnd()*9;
    ctx.strokeStyle=rnd()<0.55?"rgba(120,110,95,.10)":"rgba(255,253,246,.20)";
    ctx.lineWidth=rnd()<0.8?0.6:1.1;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);ctx.stroke();
  }
  return cv;
}

/* ══════════════ 4. 3D — the skeleton under the drawing ══════════════ */

const PRESETS={
  "graphite HB":{spacing:1.1,density:8,minThickness:0.5,maxThickness:2.6,noiseFreq:0.009,minRadius:0.22,maxRadius:0.85,alpha:0.26,toneJitter:16,snapAmount:0.35,snapPx:3,wobble:3.4,wobbleFreq:1.1,passes:2,taper:0.45,overshoot:6},
  "soft 4B":{spacing:1.0,density:13,minThickness:0.9,maxThickness:4.2,noiseFreq:0.007,minRadius:0.28,maxRadius:1.05,alpha:0.20,toneJitter:20,snapAmount:0.4,snapPx:3,wobble:4.2,wobbleFreq:0.85,passes:2,taper:0.4,overshoot:8},
  "charcoal":{spacing:1.5,density:20,minThickness:2.2,maxThickness:8.5,noiseFreq:0.005,minRadius:0.35,maxRadius:1.5,alpha:0.13,toneJitter:24,snapAmount:0.55,snapPx:4,wobble:5.4,wobbleFreq:0.6,passes:2,taper:0.35,overshoot:10},
  "ink nib":{spacing:0.85,density:6,minThickness:0.5,maxThickness:1.9,noiseFreq:0.013,minRadius:0.28,maxRadius:0.72,alpha:0.38,toneJitter:9,snapAmount:0.1,snapPx:2,wobble:2.4,wobbleFreq:1.5,passes:2,taper:0.3,overshoot:5},
  "dry marker":{spacing:1.7,density:15,minThickness:3.0,maxThickness:6.0,noiseFreq:0.009,minRadius:0.9,maxRadius:2.0,alpha:0.24,toneJitter:12,snapAmount:0.25,snapPx:3,wobble:3.0,wobbleFreq:1.0,passes:2,taper:0.12,overshoot:7},
  "chalk":{spacing:1.5,density:22,minThickness:2.6,maxThickness:7.0,noiseFreq:0.004,minRadius:0.4,maxRadius:1.3,alpha:0.11,toneJitter:28,snapAmount:0.5,snapPx:3,wobble:4.6,wobbleFreq:0.7,passes:2,taper:0.3,overshoot:9}
};
const INKS=[["graphite",[58,61,66]],["black",[23,24,26]],["oxblood",[110,42,38]],["sepia",[92,70,50]],["indigo",[47,59,87]],["olive",[74,82,55]],["sanguine",[138,74,55]]];

const BRUSH_PARAMS=[
  ["stroke","spacing","spacing",0.4,6,0.1,"px"],["stroke","density","density",1,40,1,"dots"],
  ["stroke","minThickness","thickness min",0,10,0.1,""],["stroke","maxThickness","thickness max",0.2,20,0.1,""],
  ["stroke","noiseFreq","noise freq",0,0.03,0.0005,""],
  ["grain","minRadius","dot min",0.1,3,0.05,""],["grain","maxRadius","dot max",0.1,5,0.05,""],
  ["grain","alpha","alpha",0.02,1,0.01,""],["grain","toneJitter","tone jitter",0,60,1,""],
  ["grain","snapAmount","grain snap",0,1,0.02,""],["grain","snapPx","snap grid",1,8,1,"px"],
  ["hand","wobble","wobble",0,12,0.1,"px"],["hand","wobbleFreq","wobble freq",0.1,6,0.05,""],
  ["hand","passes","passes",1,4,1,""],["hand","taper","taper",0,1,0.05,""],["hand","overshoot","overshoot",0,20,0.5,"px"]
];
const PAPER_PARAMS=[["tone","tone",0,100,1,""],["warmth","warmth",0,100,1,""],["grain","grain",0,26,1,""],
  ["mottle","mottle",0,30,1,""],["mottleScale","mottle scale",1,40,1,""],["fibers","fibres",0,600,10,""],["vignette","vignette",0,40,1,""]];

export { mulberry32, hashSeed, makeNoise2D, clamp255, dist, resample, wobblePath, applyOvershoot, renderStroke, strokePath, polyCentroid, polySize, smoothClosed, doodleFill, tracePoly, makePaper, PRESETS, INKS, BRUSH_PARAMS, PAPER_PARAMS };
