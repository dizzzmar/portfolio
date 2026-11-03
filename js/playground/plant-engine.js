// PLAYGROUND · la planta: geometría en 3D (hojas, tallos, flores), los rasgos que se sortean con la semilla, el nombre de la especie
// y el rotulado a mano. Código de Plant Lab sin cambios de comportamiento.
import { mulberry32, hashSeed, strokePath } from './engine.js';

const V=(x,y,z)=>({x,y,z});
const vadd=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z);
const vsub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z);
const vmul=(a,s)=>V(a.x*s,a.y*s,a.z*s);
const vcross=(a,b)=>V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const vlen=a=>Math.hypot(a.x,a.y,a.z);
const vnorm=a=>{const l=vlen(a)||1;return V(a.x/l,a.y/l,a.z/l);};

function cubic3(p0,p1,p2,p3,steps){
  const out=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,u=1-t,a=u*u*u,b=3*u*u*t,c=3*u*t*t,d=t*t*t;
    out.push(V(a*p0.x+b*p1.x+c*p2.x+d*p3.x, a*p0.y+b*p1.y+c*p2.y+d*p3.y, a*p0.z+b*p1.z+c*p2.z+d*p3.z));
  }
  return out;
}

/* Where the camera sits, expressed back in model space. Geometry needs this to
   keep blades from turning edge-on and vanishing. */
function invView(pose,X,Y,Z){
  const cr=Math.cos(pose.roll),sr=Math.sin(pose.roll);
  const cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw);
  const cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
  const y1=Y*cp+Z*sp, z2=-Y*sp+Z*cp;
  const x1=X*cy-z2*sy, z=X*sy+z2*cy;
  return vnorm(V(x1*cr+y1*sr, -x1*sr+y1*cr, z));
}
const viewDirModel   = pose=>invView(pose,0,0,1);   /* into the screen */
const screenRightModel = pose=>invView(pose,1,0,0); /* across the screen */

/* Camera. Rotation happens about the plant's waist so it spins in place. */
function makeCam(pose,S,cx,cy){
  const cy_=Math.cos(pose.yaw),sy=Math.sin(pose.yaw);
  const cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
  const cr=Math.cos(pose.roll),sr=Math.sin(pose.roll);
  const pivot=0.5;
  return function(p){
    let x=p.x,y=p.y-pivot,z=p.z;
    let x1=x*cr-y*sr, y1=x*sr+y*cr;                 /* roll  (z axis) */
    let x2=x1*cy_+z*sy, z2=-x1*sy+z*cy_;            /* yaw   (y axis) */
    let y3=y1*cp-z2*sp, z3=y1*sp+z2*cp;             /* pitch (x axis) */
    const f=1/(1+z3*pose.depth*0.42);
    return {x:cx+x2*S*f, y:cy-(y3+pivot)*S*f, z:z3};
  };
}

/* ══════════════ 5. BOTANY — discrete variants, not one shape scaled ══════════════ */

/* Leaf blades as half-width profiles in unit space (v: 0 base → 1 tip). */
const BLADE={
  lance:  t=>0.175*Math.pow(t,0.55)*Math.pow(1-t,1.5)*2.9,
  ovate:  t=>0.310*Math.pow(t,0.85)*Math.pow(1-t,0.85)*4.0,
  heart:  t=>0.330*Math.pow(t,0.34)*Math.pow(1-t,1.02)*2.35,
  needle: t=>0.070*Math.pow(t,0.4)*Math.pow(1-t,0.9)*2.2,
  lobed:  t=>0.285*Math.pow(t,0.8)*Math.pow(1-t,0.8)*3.9*(1+0.28*Math.sin(t*Math.PI*4.5)),
  round:  t=>0.440*Math.sqrt(Math.max(0,t*(1-t)))*2.05,
  strap:  t=>0.125*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.35)),0.28)
};
function bladeOutline(kind,rnd,steps){
  const w=BLADE[kind]||BLADE.ovate;
  const lean=(rnd()*2-1)*0.13;                      /* no leaf is a mirror of itself */
  const R=[],Lf=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps, hw=w(t), sk=lean*Math.sin(Math.PI*t);
    R.push({u:hw+sk, v:t}); Lf.push({u:-hw+sk, v:t});
  }
  return R.concat(Lf.reverse());
}
/* Map a unit-space blade into 3D at a node. */
function bladeTo3D(outline,origin,up,side,len){
  return outline.map(q=>vadd(origin,vadd(vmul(up,q.v*len),vmul(side,q.u*len))));
}

/* A blade seen edge-on disappears. Turn it back toward the camera — partially, so
   the pose still reads, but never all the way to flat. This is the rule layer that
   sits on top of the 3D and keeps the drawing legible. */
function faceCamera(up,side,nrm,view,blend){
  const a=nrm.x*view.x+nrm.y*view.y+nrm.z*view.z;
  const b=side.x*view.x+side.y*view.y+side.z*view.z;
  if(Math.abs(a)>0.72)return side;                    /* already facing us */
  const th=Math.atan2(b,a)*blend;
  const c=Math.cos(th),s2=Math.sin(th);
  return vnorm(vsub(vmul(side,c),vmul(nrm,s2)));
}

/* A grass blade or a fern rachis is a centreline with width, not an outline drawn
   in a flat plane. Offset perpendicular to the local tangent, in the screen plane,
   so the blade always presents its face. */
function taperedRibbon(curve,across,hw){
  const n=curve.length,R=[],L=[];
  for(let i=0;i<n;i++){
    const a=curve[Math.max(0,i-1)],b=curve[Math.min(n-1,i+1)];
    const T=vnorm(vsub(b,a));
    let p=vsub(across,vmul(T,across.x*T.x+across.y*T.y+across.z*T.z));
    if(vlen(p)<1e-4)p=vnorm(vcross(T,V(0,0,1)));else p=vnorm(p);
    const w=hw(i/(n-1));
    R.push(vadd(curve[i],vmul(p,w)));
    L.push(vsub(curve[i],vmul(p,w)));
  }
  return R.concat(L.reverse());
}

/* Stem skeletons per habit. y is up, base at origin, height ~1. */
function stemCurve(habit,rnd,steps){
  const j=()=>(rnd()*2-1);
  const zc=0.16;
  switch(habit){
    case "arching":
      return cubic3(V(0,0,0),V(0.04*j(),0.52,zc*0.6*j()),V(0.20,0.98,zc*0.6*j()),V(0.42,0.88,0.08*j()),steps);
    case "creeping":
      return cubic3(V(0,0,0),V(0.24,0.26,zc*j()),V(0.62,0.34,zc*j()),V(0.92,0.22,0.12*j()),steps);
    case "rosette":
      return cubic3(V(0,0,0),V(0.02*j(),0.10,0.04*j()),V(0.03*j(),0.20,0.04*j()),V(0.05*j(),0.30,0.03*j()),steps);
    case "climbing":{
      const out=[];
      for(let i=0;i<=steps;i++){
        const t=i/steps,a=t*Math.PI*2.6+rnd()*0.2;
        out.push(V(Math.cos(a)*0.17*t, t, Math.sin(a)*0.17*t));
      }
      return out;
    }
    case "clump":
    default: /* erect */
      return cubic3(V(0,0,0),V(0.045*j(),0.34,zc*0.5*j()),V(0.055*j(),0.70,zc*0.5*j()),V(0.05*j(),1.0,0.04*j()),steps);
  }
}
function frameAt(curve,i){
  const a=curve[Math.max(0,i-1)],b=curve[Math.min(curve.length-1,i+1)];
  const T=vnorm(vsub(b,a));
  let ref=V(0,0,1);
  if(Math.abs(T.z)>0.9)ref=V(1,0,0);
  const N=vnorm(vcross(T,ref)), B=vnorm(vcross(T,N));
  return {P:curve[i],T,N,B};
}

/* Flower heads. Each returns {rings:[outline2d], petals:[outline2d], disc:r} in the flower plane. */
/* A single small floret: a rounded lobe on its own little stalk axis, placed and
   tilted in the flower plane. Spikes and globes are built from many of these. */
function floret(w,l,steps){
  const o=[],p=t=>w*Math.pow(t,0.5)*Math.pow(1-t,0.58)*3.0;
  for(let i=0;i<=steps;i++){const t=i/steps;o.push({u:p(t),v:t*l});}
  for(let i=steps;i>=0;i--){const t=i/steps;o.push({u:-p(t),v:t*l});}
  return o;
}
function placeAt(pts,ang,cx,cy){
  const c=Math.cos(ang),s=Math.sin(ang);
  return pts.map(q=>({u:cx+q.u*c-q.v*s, v:cy+q.u*s+q.v*c}));
}

function flowerHead(kind,petals,rnd){
  const out={petals:[],rings:[],rays:[],arcs:[],disc:0};
  const petal=(len,wid,shape)=>{
    const o=[];
    for(let i=0;i<=18;i++){const t=i/18;o.push({u:wid*shape(t),v:t*len});}
    for(let i=18;i>=0;i--){const t=i/18;o.push({u:-wid*shape(t),v:t*len});}
    return o;
  };
  const round=t=>Math.sqrt(Math.max(0,t*(1-t)))*2;
  const drop =t=>Math.pow(t,0.5)*Math.pow(1-t,0.75)*2.6;
  switch(kind){
    case "daisy":{
      out.disc=0.085;
      const blade=t=>Math.pow(t,0.85)*Math.pow(1-t,0.40)*2.60;   /* widest at ~0.68 */
      const gaps=[];let sum=0;
      for(let i=0;i<petals;i++){const g=0.62+rnd()*0.76;gaps.push(g);sum+=g;}
      let a=rnd()*Math.PI*2;
      for(let i=0;i<petals;i++){
        out.petals.push({a,pts:petal(0.38+rnd()*0.18,0.150+rnd()*0.030,blade),r0:0.045});
        a+=gaps[i]/sum*Math.PI*2;
      }
      for(let i=0;i<9;i++){                                       /* stippled centre */
        const t=rnd()*Math.PI*2,r=Math.sqrt(rnd())*0.055;
        out.rings.push({r:0.011,cy:Math.sin(t)*r,ax:Math.cos(t)*r,squash:1});
      }
      break;}
    case "globe":{
      /* an allium: a hollow sphere of florets, each on its own spoke from a small
         centre — no solid disc, which is what made it a pompom */
      const n=petals*2+4;
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2+(rnd()*2-1)*0.10;
        const r=0.27+rnd()*0.13;
        out.rays.push({a,r0:0.035,r1:r});
        out.petals.push({a:0,r0:0,
          pts:placeAt(floret(0.038,0.105,8),a-Math.PI/2,Math.cos(a)*r,Math.sin(a)*r)});
      }
      break;}
    case "bell":{
      const o=[];
      for(let i=0;i<=22;i++){const t=i/22;o.push({u:0.19*(0.35+0.65*Math.pow(t,1.5)),v:-t*0.44});}
      for(let i=22;i>=0;i--){const t=i/22;o.push({u:-0.19*(0.35+0.65*Math.pow(t,1.5)),v:-t*0.44});}
      out.petals.push({a:0,pts:o,r0:0});
      out.rings.push({r:0.19,cy:-0.44,squash:0.34});
      break;}
    case "trumpet":{
      const o=[], prof=t=>0.032+0.052*t+0.235*Math.pow(Math.max(0,(t-0.52)/0.48),2.1);
      const R=prof(1), lip=0.56, lobes=5;
      for(let i=0;i<=20;i++){const t=i/20;o.push({u:prof(t),v:t*lip});}
      for(let i=1;i<lobes*4;i++){
        const t=i/(lobes*4);
        o.push({u:R*(1-2*t), v:lip-0.075*Math.sin(Math.PI*t)+0.022*Math.sin(t*Math.PI*lobes)});
      }
      for(let i=20;i>=0;i--){const t=i/20;o.push({u:-prof(t),v:t*lip});}
      out.petals.push({a:0,pts:o,r0:0});
      /* far rim, arcing the other way */
      const back=[];
      for(let i=0;i<=14;i++){const t=i/14;back.push({u:R*(1-2*t)*0.94, v:lip+0.055*Math.sin(Math.PI*t)});}
      out.arcs=[back];
      break;}
    case "spike":{
      /* many small florets alternating up a bare axis, crowded low and thinning
         to the tip — a spike is an inflorescence, not one long lumpy head */
      const n=14+Math.floor(rnd()*8);
      out.arcs=[[{u:0,v:0.0},{u:0,v:0.74}]];
      for(let i=0;i<n;i++){
        const t=i/(n-1), sd=i%2?1:-1;
        const v=0.05+t*0.66;
        const sc=(1-t*0.62)*(0.45+0.55*Math.min(1,t*5));
        const tilt=sd*(1.02+rnd()*0.30)-0.10;
        out.petals.push({a:0,r0:0,
          pts:placeAt(floret(0.052*sc+0.012,0.20*sc+0.045,10),tilt,sd*0.012,v)});
      }
      break;}
    case "umbel":{
      const n=petals;
      for(let i=0;i<n;i++){
        const a=-Math.PI/2+(i/(n-1||1)-0.5)*2.3;
        out.rays.push({a,r0:0,r1:0.34+rnd()*0.10});
        out.rings.push({r:0.052,cy:0,ax:Math.cos(a)*(0.34+0.05),ay:Math.sin(a)*(0.34+0.05),squash:1});
      }
      break;}
    default:{ /* cluster */
      const n=petals;
      for(let i=0;i<n;i++){
        const a=rnd()*Math.PI*2,r=rnd()*0.26;
        out.rings.push({r:0.075+rnd()*0.05,cy:0,ax:Math.cos(a)*r,ay:Math.sin(a)*r,squash:1});
      }
      break;}
  }
  return out;
}

/* ══════════════ 6. TRAITS ══════════════ */
const TRAITS={
  form:       {label:"form",    opts:{bloom:30,foliage:17,berries:14,seedhead:12,grass:11,buds:9,fern:7}},
  habit:      {label:"habit",   opts:{erect:28,clump:22,arching:18,rosette:12,creeping:11,climbing:9}},
  stem:       {label:"stem",    opts:{single:52,branched:32,bifid:16}},
  leaf:       {label:"leaf",    opts:{ovate:20,lance:20,heart:12,needle:12,lobed:12,round:12,strap:12}},
  phyllotaxy: {label:"set",     opts:{alternate:34,opposite:28,whorled:20,basal:18}},
  density:    {label:"density", opts:{normal:42,sparse:30,dense:28}},
  venation:   {label:"veins",   opts:{none:62,midrib:22,pinnate:10,palmate:6}},
  flower:     {label:"head",    opts:{daisy:22,globe:14,bell:14,spike:14,cluster:14,umbel:12,trumpet:10}},
  arrangement:{label:"borne",   opts:{solitary:34,spray:26,raceme:22,corymb:18}},
  petals:     {label:"count",   opts:{"five":24,"six":20,"eight":18,"twelve":16,"many":12,"three":10}},
  fill:       {label:"fill",    opts:{none:34,hatch:22,scribble:16,stipple:16,solid:12}},
  colour:     {label:"colour",  opts:{accent:40,none:30,full:30}},
  palette:    {label:"palette", opts:{sand:18,moss:18,ochre:16,rust:14,sea:12,ash:12,bruise:10}},
  ground:     {label:"ground",  opts:{none:40,soil:24,pot:20,roots:16}},
  quirk:      {label:"mark",    opts:{none:46,tendrils:12,lean:12,bitten:10,dropped:10,thorns:10}}
};
const GROUPS={
  structure:["form","habit","stem","ground"],
  foliage:["leaf","phyllotaxy","density","venation"],
  flower:["flower","arrangement","petals"],
  treatment:["fill","colour","palette","quirk"]
};
const PETAL_N={three:3,five:5,six:6,eight:8,twelve:12,many:15};

const PALETTES={
  sand:  [[196,166,124],[214,192,158],[168,140,104]],
  moss:  [[122,138,96],[92,110,76],[150,162,118]],
  ochre: [[198,148,68],[176,124,52],[220,180,110]],
  rust:  [[168,92,66],[142,70,50],[196,124,92]],
  sea:   [[112,140,144],[86,114,124],[150,174,172]],
  ash:   [[146,146,142],[118,118,116],[176,176,170]],
  bruise:[[126,102,134],[100,80,112],[156,132,158]]
};

function pick(opts,r){
  const keys=Object.keys(opts);
  let total=0;for(const k of keys)total+=opts[k];
  let x=r*total;
  for(const k of keys){x-=opts[k];if(x<=0)return k;}
  return keys[keys.length-1];
}
function pctOf(key,val){
  const o=TRAITS[key].opts;
  let total=0;for(const k in o)total+=o[k];
  return o[val]/total*100;
}
function rollTraits(seed,locks){
  /* Each trait rolls from its own stream, keyed by its name. With one shared
     stream a locked trait consumed no draw, so every trait listed after it
     shifted along — locking the fill silently re-rolled the ground. */
  const t={};
  for(const k in TRAITS)
    t[k]=locks[k]&&locks[k]!=="auto"
      ? locks[k]
      : pick(TRAITS[k].opts, mulberry32(hashSeed(seed+"|trait:"+k))());
  return t;
}

/* ══════════════ 6b. NAMING ══════════════
   Real botanical names are already built the way we want: Genus + a descriptive
   epithet drawn straight from the plant's morphology (cordata = heart-shaped,
   repens = creeping). So this isn't an invented scheme layered on top — it's the
   actual convention, driven by traits we already roll.

   Uniqueness: a binomial can only exist if its GENUS exists, so the whole
   collision question reduces to the genus. These 28 are deliberately two-morpheme
   compounds — the first draft used single classical morphemes and produced real
   genera (Avena, Coccinia, Anthelia). They also avoid -ella/-opsis, the most
   crowded terminations in taxonomy. Every one ends in -a, so it is feminine and
   epithet agreement is automatic and always correct. Spot-audited against real
   taxonomy; high confidence, not a proof against all ~60,000 published genera. */
const GENERA={
  bloom:    ["Calyxvira","Petalorna","Corollunda","Anthelarna"],
  foliage:  ["Frondavira","Viridalma","Foliostra","Thallovena"],
  berries:  ["Baccaurna","Drupelva","Coccarna","Pomelurna"],
  seedhead: ["Achenovira","Glumarna","Caryopsista","Seminalma"],
  grass:    ["Culmarna","Stipulvena","Graminorna","Aristalma"],
  buds:     ["Gemmavira","Alabastria","Turionvela","Bracteolma"],
  fern:     ["Pteridalma","Filicorna","Soravena","Rachivena"]
};
/* Real Latin descriptive terms. The -aris/-is forms are third declension and
   identical in masculine and feminine, so they agree unchanged. */
const EPITHETS={
  heart:  ["cordata","cordifolia","subcordata"],
  ovate:  ["ovata","ovalifolia","obovata"],
  lance:  ["lanceolata","hastata","ensifolia"],
  needle: ["acicularis","acerosa","filifolia"],
  lobed:  ["lobata","incisa","laciniata"],
  round:  ["orbicularis","rotundifolia","peltata"],
  strap:  ["loriformis","ligulata","linearis"]
};
/* An unusual specimen earns a third name. Botanical convention already has the
   slot — var. — so rarity shows up in the name itself, not just as a number. */
const VAR_EPITHETS={
  habit:{erect:"stricta",clump:"caespitosa",arching:"arcuata",
         rosette:"rosulata",creeping:"repens",climbing:"scandens"},
  quirk:{tendrils:"cirrhosa",lean:"declinata",bitten:"erosa",
         dropped:"decidua",thorns:"spinosa"},
  ground:{soil:"terrestris",pot:"hortensis",roots:"radicosa"},
  flower:{daisy:"radiata",globe:"glomerata",bell:"campanulata",spike:"spicata",
          cluster:"conferta",umbel:"umbellata",trumpet:"tubiflora"},
  phyllotaxy:{alternate:"alterna",opposite:"opposita",whorled:"verticillata",basal:"basalis"},
  venation:{midrib:"costata",pinnate:"penninervia",palmate:"palmatinervia"},
  density:{sparse:"laxa",dense:"densa"},
  arrangement:{spray:"paniculata",raceme:"racemosa",corymb:"corymbosa"}
};

function speciesName(traits,seed){
  const r=mulberry32(hashSeed(seed+"|name"));
  const gl=GENERA[traits.form]||GENERA.bloom;
  const genus=gl[Math.floor(r()*gl.length)%gl.length];
  /* Grass and fern discard the main axis and build their own geometry — they
     never use the leaf trait, so naming one "cordifolia" would describe a
     heart-shaped leaf the drawing doesn't have. They get epithets about the
     structure they actually show instead. */
  const FORM_EPITHETS={
    grass:["graminea","culmifera","aristata","fistulosa"],
    fern:["pinnata","bipinnata","frondosa","filicina"]
  };
  const el=FORM_EPITHETS[traits.form]||EPITHETS[traits.leaf]||EPITHETS.ovate;
  const epithet=el[Math.floor(r()*el.length)%el.length];

  /* The variety epithet describes whichever trait is rarest — but only among
     traits this form actually DRAWS. Every specimen rolls all fifteen traits,
     yet a grass never renders a flower head or leaf veins, and a bud is closed
     so its flower shape is invisible. Naming a grass "var. tubiflora" would
     describe a trumpet flower that isn't in the picture. */
  const EXPRESSED={
    bloom:   ["habit","quirk","ground","flower","phyllotaxy","venation","density","arrangement"],
    buds:    ["habit","quirk","ground","phyllotaxy","venation","density","arrangement"],
    foliage: ["habit","quirk","ground","phyllotaxy","venation","density"],
    berries: ["habit","quirk","ground","phyllotaxy","venation","density"],
    seedhead:["habit","quirk","ground","phyllotaxy","venation","density"],
    grass:   ["ground"],
    fern:    ["ground"]
  };
  const eligible=EXPRESSED[traits.form]||EXPRESSED.bloom;
  let rarest=101,rk=null;
  for(const k of eligible){
    if(!VAR_EPITHETS[k]||!VAR_EPITHETS[k][traits[k]])continue;
    const p=pctOf(k,traits[k]);
    if(p<rarest){rarest=p;rk=k;}
  }
  const variety=(rarest<=13&&rk)?VAR_EPITHETS[rk][traits[rk]]:null;
  return {genus,epithet,variety,
          full:genus+" "+epithet+(variety?" var. "+variety:""),
          short:genus[0]+". "+epithet};
}

/* ══════════════ 6c. HANDWRITING ══════════════
   A connected cursive alphabet: every lowercase glyph is ONE continuous stroke
   entering at the baseline on the left and leaving at the baseline on the
   right, so consecutive letters join into a single flowing line the way a
   pen actually moves. Ascenders and descenders loop rather than running
   straight. Capitals are drawn separately (simple, legible skeletons) since
   they only ever open a word and don't need to physically join what follows. */
const _cub=(p,n)=>{                      // chained cubics: x0,y0, c1,c2,p1, c1,c2,p1...
  const o=[{x:p[0],y:p[1]}];
  for(let i=2;i+5<p.length;i+=6){
    const x0=o[o.length-1].x, y0=o[o.length-1].y;
    for(let k=1;k<=n;k++){
      const t=k/n,u=1-t;
      o.push({
        x:u*u*u*x0+3*u*u*t*p[i]+3*u*t*t*p[i+2]+t*t*t*p[i+4],
        y:u*u*u*y0+3*u*u*t*p[i+1]+3*u*t*t*p[i+3]+t*t*t*p[i+5]});
    }
  }
  return o;
};
const S=(...p)=>_cub(p,9);
const xh=0.52, asc=1.18, dsc=-0.40;

/* An oval, the core of a c d g o q — traced from the right, up over the top,
   down the left, and round the bottom, which is how a pen actually makes one. */
const oval=(x,w,h)=>[x+w,h*0.62, x+w,h*0.95, x+w*0.62,h, x+w*0.42,h,
                     x+w*0.12,h, x,h*0.62, x,h*0.38,
                     x,h*0.10, x+w*0.30,0, x+w*0.52,0.02,
                     x+w*0.78,0.05, x+w,h*0.28, x+w,h*0.62];

function arcSeg(cx,cy,rx,ry,a0,a1,n){const o=[];n=n||14;for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*Math.PI/180;o.push({x:cx+Math.cos(a)*rx,y:cy+Math.sin(a)*ry});}return o;}
const GLYPH={
  " ":{w:0.34,p:[]},
  ".":{w:0.28,p:[S(0.10,0.03, 0.16,0.03, 0.18,0.09, 0.12,0.10, 0.06,0.11, 0.05,0.05, 0.10,0.03)]},

  /* ── lowercase: entry at (0,0), exit at (w,0) ── */
  a:{w:0.64,p:[S(0,0, 0.08,0.16, 0.10,0.30, 0.14,0.40, ...oval(0.14,0.34,xh).slice(2),
                0.48,0.30, 0.46,0.12, 0.50,0.03, 0.56,0.00, 0.60,0.00, 0.64,0)]},
  c:{w:0.56,p:[S(0,0, 0.06,0.18, 0.10,0.34, 0.14,0.44, 0.22,0.55, 0.42,0.55, 0.46,0.44,
                0.40,0.50, 0.10,0.48, 0.10,0.26, 0.10,0.06, 0.34,0.00, 0.44,0.06,
                0.50,0.10, 0.52,0.04, 0.56,0)]},
  e:{w:0.54,p:[S(0,0, 0.10,0.14, 0.06,0.26, 0.22,0.28, 0.40,0.30, 0.34,0.56, 0.20,0.52,
                0.06,0.48, 0.08,0.10, 0.26,0.04, 0.40,-0.01, 0.48,0.04, 0.54,0)]},
  i:{w:0.42,p:[S(0,0, 0.10,0.20, 0.14,0.38, 0.20,xh, 0.24,0.30, 0.26,0.12, 0.30,0.04,
                0.34,0.00, 0.38,0.00, 0.42,0),
               S(0.24,0.74, 0.28,0.74, 0.29,0.80, 0.24,0.81, 0.19,0.82, 0.19,0.75, 0.24,0.74)]},
  l:{w:0.44,p:[S(0,0, 0.06,0.22, 0.02,0.62, 0.14,asc, 0.24,1.30, 0.34,0.90, 0.26,0.44,
                0.22,0.20, 0.24,0.06, 0.30,0.02, 0.36,-0.01, 0.40,0.00, 0.44,0)]},
  n:{w:0.68,p:[S(0,0, 0.08,0.18, 0.10,0.34, 0.12,xh, 0.16,0.34, 0.16,0.16, 0.22,0.10,
                0.30,0.02, 0.40,0.16, 0.42,0.34, 0.44,0.46, 0.44,0.30, 0.48,0.14,
                0.52,0.04, 0.58,0.00, 0.62,0.00, 0.68,0)]},
  m:{w:0.96,p:[S(0,0, 0.08,0.18, 0.10,0.34, 0.12,xh, 0.16,0.34, 0.16,0.16, 0.22,0.10,
                0.30,0.02, 0.40,0.18, 0.42,xh, 0.46,0.34, 0.46,0.16, 0.52,0.10,
                0.60,0.02, 0.70,0.18, 0.72,0.44, 0.74,0.30, 0.78,0.14,
                0.84,0.04, 0.90,0.00, 0.92,0.00, 0.96,0)]},
  o:{w:0.60,p:[S(0,0, 0.06,0.20, 0.08,0.34, 0.12,0.44, ...oval(0.12,0.36,xh).slice(2),
                0.48,0.34, 0.46,0.14, 0.52,0.06, 0.56,0.02, 0.58,0.00, 0.60,0)]},
  r:{w:0.56,p:[S(0,0, 0.08,0.18, 0.10,0.34, 0.14,0.46, 0.20,0.44, 0.22,0.34,
                0.28,0.50, 0.36,0.52, 0.42,0.48, 0.40,0.36, 0.38,0.20, 0.40,0.08,
                0.46,0.02, 0.50,0.00, 0.56,0)]},
  s:{w:0.50,p:[S(0,0, 0.08,0.18, 0.12,0.34, 0.18,0.50, 0.34,0.54, 0.36,0.44,
                0.38,0.32, 0.16,0.26, 0.16,0.14, 0.16,0.04, 0.34,0.00, 0.44,0.04,
                0.48,0.06, 0.48,0.02, 0.50,0)]},
  t:{w:0.50,p:[S(0,0, 0.08,0.20, 0.14,0.44, 0.22,0.86, 0.26,0.60, 0.26,0.34,
                0.26,0.16, 0.28,0.06, 0.34,0.02, 0.40,-0.01, 0.44,0.00, 0.50,0),
               S(0.08,0.52, 0.20,0.56, 0.32,0.56, 0.44,0.52)]},
  u:{w:0.66,p:[S(0,0, 0.08,0.20, 0.10,0.36, 0.12,xh, 0.16,0.30, 0.14,0.10,
                0.24,0.02, 0.34,-0.04, 0.42,0.16, 0.44,xh, 0.46,0.34, 0.48,0.14,
                0.54,0.04, 0.60,0.00, 0.62,0.00, 0.66,0)]},
  v:{w:0.62,p:[S(0,0, 0.08,0.20, 0.10,0.36, 0.14,xh, 0.22,0.26, 0.24,0.06,
                0.32,0.02, 0.42,-0.02, 0.46,0.30, 0.46,0.48, 0.50,0.30, 0.56,0.10, 0.62,0)]},
  b:{w:0.60,p:[S(0,0, 0.06,0.24, 0.04,0.64, 0.16,asc, 0.26,1.28, 0.32,0.86, 0.24,0.42,
                0.20,0.22, 0.14,0.10, 0.20,0.06, 0.34,-0.02, 0.50,0.10, 0.48,0.26,
                0.46,0.42, 0.28,0.44, 0.26,0.30, 0.30,0.14, 0.44,0.06, 0.60,0)]},
  d:{w:0.66,p:[S(0,0, 0.06,0.18, 0.08,0.32, 0.12,0.42, ...oval(0.12,0.34,xh).slice(2),
                0.50,0.46, 0.44,0.80, 0.46,asc, 0.52,1.24, 0.54,0.70, 0.50,0.30,
                0.48,0.12, 0.54,0.02, 0.60,0.00, 0.64,0.00, 0.66,0)]},
  g:{w:0.62,p:[S(0,0, 0.06,0.18, 0.08,0.32, 0.12,0.42, ...oval(0.12,0.34,xh).slice(2),
                0.48,0.30, 0.46,0.00, 0.44,-0.20, 0.42,-0.36, 0.24,-0.40, 0.14,-0.30,
                0.06,-0.22, 0.20,-0.10, 0.34,-0.04, 0.50,0.02, 0.58,0.00, 0.62,0)]},
  h:{w:0.66,p:[S(0,0, 0.06,0.24, 0.04,0.64, 0.16,asc, 0.26,1.28, 0.32,0.86, 0.24,0.42,
                0.20,0.22, 0.18,0.10, 0.20,0.04, 0.30,0.02, 0.40,0.18, 0.42,0.44,
                0.44,0.30, 0.48,0.12, 0.54,0.04, 0.60,0.00, 0.66,0)]},
  p:{w:0.64,p:[S(0,0, 0.08,0.18, 0.10,0.32, 0.12,0.44, 0.14,0.20, 0.12,-0.10,
                0.10,-0.28, 0.08,-0.40, 0.16,-0.40, 0.18,-0.24, 0.20,-0.06, 0.18,0.16,
                0.20,0.34, 0.30,0.54, 0.48,0.50, 0.50,0.34, 0.52,0.16, 0.34,0.02,
                0.24,0.10, 0.34,0.02, 0.52,0.02, 0.64,0)]},
  f:{w:0.56,p:[S(0,0, 0.06,0.22, 0.04,0.62, 0.16,asc, 0.28,1.30, 0.34,0.88, 0.26,0.44,
                0.22,0.18, 0.20,-0.10, 0.16,-0.28, 0.12,-0.42, -0.02,-0.38, 0.02,-0.24,
                0.06,-0.12, 0.24,0.00, 0.40,0.02, 0.50,0.03, 0.54,0.00, 0.56,0),
               S(0.06,0.50, 0.18,0.54, 0.32,0.54, 0.44,0.50)]},
  j:{w:0.46,p:[S(0,0, 0.10,0.20, 0.16,0.38, 0.22,xh, 0.22,0.20, 0.18,-0.10,
                0.16,-0.28, 0.14,-0.42, -0.02,-0.38, 0.02,-0.24, 0.06,-0.12, 0.24,0.00,
                0.38,0.02, 0.44,0.00, 0.46,0),
               S(0.26,0.74, 0.30,0.74, 0.31,0.80, 0.26,0.81, 0.21,0.82, 0.21,0.75, 0.26,0.74)]},
  k:{w:0.66,p:[S(0,0, 0.06,0.24, 0.04,0.64, 0.16,asc, 0.26,1.28, 0.32,0.86, 0.24,0.42,
                0.20,0.22, 0.18,0.10, 0.20,0.04, 0.46,0.46, 0.30,0.30, 0.24,0.22,
                0.36,0.26, 0.42,0.12, 0.50,0.00, 0.58,0.00, 0.66,0)]},
  q:{w:0.64,p:[S(0,0, 0.06,0.18, 0.08,0.32, 0.12,0.42, ...oval(0.12,0.34,xh).slice(2),
                0.48,0.30, 0.46,0.00, 0.44,-0.22, 0.42,-0.38, 0.50,-0.40, 0.52,-0.26,
                0.54,-0.12, 0.56,0.00, 0.60,0.00, 0.64,0)]},
  w:{w:0.90,p:[S(0,0, 0.08,0.20, 0.10,0.36, 0.14,xh, 0.20,0.26, 0.22,0.06,
                0.30,0.02, 0.40,-0.02, 0.44,0.30, 0.44,xh, 0.48,0.28, 0.50,0.06,
                0.58,0.02, 0.68,-0.02, 0.72,0.30, 0.72,0.48, 0.78,0.28, 0.84,0.10, 0.90,0)]},
  x:{w:0.62,p:[S(0,0, 0.10,0.20, 0.16,0.36, 0.24,xh, 0.36,0.30, 0.44,0.10, 0.52,0),
               S(0.10,xh, 0.22,0.36, 0.34,0.20, 0.50,0.02)]},
  y:{w:0.64,p:[S(0,0, 0.08,0.20, 0.10,0.36, 0.14,xh, 0.20,0.26, 0.22,0.06,
                0.30,0.02, 0.40,-0.02, 0.44,0.24, 0.44,xh, 0.42,0.16, 0.38,-0.14,
                0.34,-0.32, 0.30,-0.42, 0.10,-0.38, 0.12,-0.24, 0.14,-0.12, 0.34,-0.02,
                0.52,0.02, 0.60,0.00, 0.64,0)]},
  z:{w:0.60,p:[S(0,0, 0.08,0.20, 0.12,0.38, 0.16,0.50, 0.30,0.56, 0.42,0.50,
                0.34,0.42, 0.20,0.20, 0.14,0.04, 0.28,0.04, 0.36,-0.10, 0.34,-0.26,
                0.32,-0.40, 0.14,-0.40, 0.12,-0.28, 0.10,-0.18, 0.30,-0.06, 0.46,0.00,
                0.54,0.00, 0.60,0)]}
};


const CAP={
  A:{w:0.72,p:[[{x:0,y:0},{x:0.36,y:1},{x:0.72,y:0}],[{x:0.14,y:0.32},{x:0.58,y:0.32}]]},
  B:{w:0.64,p:[[{x:0,y:1},{x:0,y:0}],[{x:0,y:1},{x:0.38,y:1}],
      arcSeg(0.38,0.76,0.24,0.24,90,-90,12),[{x:0,y:0.52},{x:0.42,y:0.52}],
      arcSeg(0.42,0.26,0.26,0.26,90,-90,12),[{x:0,y:0},{x:0.42,y:0}]]},
  C:{w:0.70,p:[arcSeg(0.35,0.50,0.35,0.50,55,305,20)]},
  D:{w:0.68,p:[[{x:0,y:1},{x:0,y:0}],[{x:0,y:1},{x:0.32,y:1}],
      arcSeg(0.32,0.50,0.36,0.50,90,-90,16),[{x:0,y:0},{x:0.32,y:0}]]},
  E:{w:0.58,p:[[{x:0.56,y:1},{x:0,y:1},{x:0,y:0},{x:0.56,y:0}],[{x:0,y:0.52},{x:0.44,y:0.52}]]},
  F:{w:0.56,p:[[{x:0.56,y:1},{x:0,y:1},{x:0,y:0}],[{x:0,y:0.54},{x:0.42,y:0.54}]]},
  G:{w:0.72,p:[arcSeg(0.36,0.50,0.36,0.50,55,320,20),[{x:0.72,y:0.42},{x:0.72,y:0.05}],[{x:0.72,y:0.42},{x:0.42,y:0.42}]]},
  H:{w:0.68,p:[[{x:0,y:1},{x:0,y:0}],[{x:0.68,y:1},{x:0.68,y:0}],[{x:0,y:0.52},{x:0.68,y:0.52}]]},
  I:{w:0.24,p:[[{x:0.12,y:1},{x:0.12,y:0}]]},
  J:{w:0.48,p:[[{x:0.40,y:1},{x:0.40,y:0.22}],arcSeg(0.20,0.22,0.20,0.22,0,-180,12)]},
  K:{w:0.64,p:[[{x:0,y:1},{x:0,y:0}],[{x:0.62,y:1},{x:0.05,y:0.44}],[{x:0.24,y:0.60},{x:0.66,y:0}]]},
  L:{w:0.52,p:[[{x:0,y:1},{x:0,y:0},{x:0.52,y:0}]]},
  M:{w:0.84,p:[[{x:0,y:0},{x:0,y:1},{x:0.42,y:0.34},{x:0.84,y:1},{x:0.84,y:0}]]},
  N:{w:0.72,p:[[{x:0,y:0},{x:0,y:1},{x:0.72,y:0},{x:0.72,y:1}]]},
  O:{w:0.76,p:[arcSeg(0.38,0.50,0.38,0.50,0,360,24)]},
  P:{w:0.62,p:[[{x:0,y:0},{x:0,y:1},{x:0.34,y:1}],arcSeg(0.34,0.74,0.28,0.26,90,-90,12),[{x:0,y:0.48},{x:0.34,y:0.48}]]},
  Q:{w:0.76,p:[arcSeg(0.38,0.50,0.38,0.50,0,360,24),[{x:0.50,y:0.24},{x:0.78,y:-0.06}]]},
  R:{w:0.64,p:[[{x:0,y:0},{x:0,y:1},{x:0.34,y:1}],arcSeg(0.34,0.74,0.28,0.26,90,-90,12),
      [{x:0,y:0.48},{x:0.34,y:0.48}],[{x:0.30,y:0.48},{x:0.64,y:0}]]},
  S:{w:0.60,p:[arcSeg(0.30,0.74,0.28,0.26,20,300,14),arcSeg(0.30,0.26,0.30,0.26,140,-110,14)]},
  T:{w:0.62,p:[[{x:0,y:1},{x:0.62,y:1}],[{x:0.31,y:1},{x:0.31,y:0}]]},
  U:{w:0.68,p:[[{x:0,y:1},{x:0,y:0.32}],arcSeg(0.34,0.32,0.34,0.32,180,360,14),[{x:0.68,y:1},{x:0.68,y:0}]]},
  V:{w:0.70,p:[[{x:0,y:1},{x:0.35,y:0},{x:0.70,y:1}]]},
  W:{w:1.02,p:[[{x:0,y:1},{x:0.24,y:0},{x:0.51,y:0.66},{x:0.78,y:0},{x:1.02,y:1}]]},
  X:{w:0.66,p:[[{x:0,y:1},{x:0.66,y:0}],[{x:0.66,y:1},{x:0,y:0}]]},
  Y:{w:0.66,p:[[{x:0,y:1},{x:0.33,y:0.48},{x:0.66,y:1}],[{x:0.33,y:0.48},{x:0.33,y:0}]]},
  Z:{w:0.62,p:[[{x:0,y:1},{x:0.62,y:1},{x:0,y:0},{x:0.62,y:0}]]}
};
for(const k in CAP) GLYPH[k]=CAP[k];

function textPaths(str,size,x,baseY){
  /* Connected script: every lowercase glyph enters and leaves exactly at the
     baseline (y=0), so letters must butt together with no tracking gap and no
     per-glyph jitter — either would pull a join off the baseline and break the
     line. The brush's own wobble already supplies the organic variation along
     each stroke, so the skeleton itself stays exact. Slant is a plain shear
     (x += y*SLANT), which leaves y=0 points untouched, so it never disturbs
     the connection points either. */
  const SLANT=0.32;          /* ~18deg; the reference sits near this */
  const COND=0.88;           /* condensed — script is narrow relative to its height */
  const paths=[]; let cx=0;
  for(const ch of str){
    const g=GLYPH[ch]||GLYPH[" "];
    for(const poly of g.p)
      paths.push(poly.map(p=>({x:x+(cx+p.x*COND+p.y*SLANT)*size, y:baseY-p.y*size})));
    cx+=g.w*COND;
  }
  return {paths, width:cx*size};
}
function textWidth(str,size){
  let cx=0;
  for(const ch of str) cx+=(GLYPH[ch]||GLYPH[" "]).w*0.88;
  return cx*size;
}
/* Written with the same brush as the plant, just finer — a nib doesn't change
   hands between drawing a specimen and labelling it. */
function writeText(ctx,str,centreX,baseY,size,brush,rnd,noise,rgb){
  const x0=centreX-textWidth(str,size)/2;
  const t=textPaths(str,size,x0,baseY);
  /* a hand doesn't start or stop dead — the stroke arrives and leaves */
  const cub=(pts,n)=>{const o=[];for(let i=0;i<=n;i++){const u=i/n,v=1-u;
    o.push({x:v*v*v*pts[0]+3*v*v*u*pts[2]+3*v*u*u*pts[4]+u*u*u*pts[6],
            y:v*v*v*pts[1]+3*v*v*u*pts[3]+3*v*u*u*pts[5]+u*u*u*pts[7]});}return o;};
  const S1=size;
  /* No entry swash: every name opens with a capital, and a capital doesn't
     begin at the baseline — the lead-in stroke aimed there and simply floated
     free as a dash. Only the exit is safe, since the last letter is always
     lowercase and always leaves at the baseline. */
  const xe=x0+t.width;
  t.paths.push(cub([xe,baseY, xe+S1*0.18,baseY-S1*0.04,
                    xe+S1*0.36,baseY-S1*0.10, xe+S1*0.58,baseY-S1*0.30],10));
  const o={...brush,
    minThickness:Math.max(0.10,brush.minThickness*0.42),
    maxThickness:Math.max(0.45,brush.maxThickness*0.42),
    spacing:Math.max(0.5,brush.spacing*0.75),
    wobble:brush.wobble*0.30, overshoot:brush.overshoot*0.22,
    density:Math.max(2,Math.round(brush.density*0.7)), passes:1};
  let dots=0;
  for(const p of t.paths) dots+=strokePath(ctx,p,o,rnd,noise,rgb);
  return dots;
}

/* ══════════════ 7. BUILD THE SPECIMEN ══════════════ */
const tipI=c=>c.length-1;
function buildPlant(traits,seed,pose){
  /* Every element draws from its OWN stream, keyed by what it is rather than by
     when it was built. With a single sequential stream, adding one leaf shifted
     every draw after it, so changing any trait re-rolled the whole specimen. */
  const S=(...k)=>mulberry32(hashSeed(seed+"|"+k.join(":")));
  const rnd=S("geo");
  const view=viewDirModel(pose);
  const across=screenRightModel(pose);
  const parts=[];                       /* {paths:[[v3]], fill:[v3]|null, tone:0..2} */
  const add=(paths,fill,tone,key)=>parts.push({paths,fill:fill||null,tone:tone||0,key:key||("p"+parts.length)});

  const rosette=traits.habit==="rosette";
  /* A rosette is not a short stem with leaves crowded on it — it is a radial
     cluster at ground level, and when it flowers it sends up a bare scape. */
  const H=rosette?(traits.form==="foliage"?0.42:0.95)
                 :traits.habit==="creeping"?0.62:1;
  const stem=stemCurve(rosette?"erect":traits.habit,rnd,72).map(p=>vmul(p,H));
  if(!(rosette&&traits.form==="foliage"))add([stem],null,0,"stem");

  /* Thorns ride the stem, alternating sides. The old test was i%14 with i
     stepping by 7 from 8, which never lands on zero — so every thorn went the
     same way. Count them instead of testing the index. */
  if(traits.quirk==="thorns"){
    /* A bare line reads as a twig, not a spike — nothing about a single stroke
       says "sharp." A thorn is a small closed wedge: wide where it meets the
       stem, tapering hard to a point, and curved back toward the stem the way
       a rose or acacia thorn hooks rather than sticking out straight. Drawing
       it as a filled outline lets the brush render a real taper instead of a
       uniform-width hairline. */
    const tr=S("thorns");
    let k=0;
    for(let i=8;i<stem.length-4;i+=7,k++){
      const f=frameAt(stem,i);
      const side=k%2?1:-1;
      const out=vnorm(vadd(vmul(f.N,side*0.95),vmul(f.B,side*(tr()*0.5-0.25))));
      const len=0.052+tr()*0.026, base=0.011+tr()*0.006;
      const hook=0.55+tr()*0.35;              /* how hard it curves back */
      const tip=vadd(f.P,vadd(vmul(out,len),vmul(f.T,-len*hook*0.7)));
      const mid=vadd(f.P,vadd(vmul(out,len*0.62),vmul(f.T,-len*hook*0.22)));
      const bL=vadd(f.P,vmul(f.T,base));       /* two base corners along the stem */
      const bR=vadd(f.P,vmul(f.T,-base));
      /* Colour picks up any part with a fill, and a thorn's pointed silhouette
         reads as a little coloured flag or bud once washed — undermining the
         sharp, woody character just built for it. A real thorn stays the stem's
         own dull colour regardless of what the flowers look like, so it keeps
         its outline for the brush's taper but carries no fill to colour. */
      add([[bL,mid,tip,mid,bR]],null,0,"thorn"+k);
    }
  }

  const form=traits.form;
  let planTilt=0;

  if(form==="grass"||form==="fern"){
    parts.length=0;                                  /* these do not use the main axis */
    if(form==="grass"){
      const gn=S("grass");
      const n=6+Math.floor(gn()*5), a0g=gn()*Math.PI*2;
      for(let i=0;i<n;i++){
        const rnd=S("blade",i);
        const a=a0g+(i/n)*Math.PI*2+(rnd()*2-1)*0.28;   /* radial, not a flat fan */
        const d=V(Math.cos(a),0,Math.sin(a));
        const r=0.20+rnd()*0.22, h=(0.55+rnd()*0.45)*H;
        const c=cubic3(V(0,0,0),vadd(vmul(d,r*0.25),V(0,h*0.52,0)),
                       vadd(vmul(d,r*0.85),V(0,h*0.94,0)),
                       vadd(vmul(d,r*1.5),V(0,h*0.78,0)),40);
        add([taperedRibbon(c,across,t=>0.016*Math.pow(1-t,0.75)*(1-t*0.2))],null,1,"blade"+i);
      }
      const stalks=1+Math.floor(gn()*2);
      for(let i=0;i<stalks;i++){
        const rnd=S("culm",i);
        const la=rnd()*Math.PI*2, lr=0.04+rnd()*0.07, h=(0.86+rnd()*0.16)*H;
        const ld=V(Math.cos(la)*lr,0,Math.sin(la)*lr);
        const c=cubic3(V(0,0,0),vadd(vmul(ld,0.4),V(0,h*0.4,0)),vadd(vmul(ld,0.8),V(0,h*0.75,0)),vadd(ld,V(0,h,0)),34);
        add([c],null,0);
        const top=c[c.length-1], T=vnorm(vsub(top,c[c.length-6]));
        const pl=cubic3(top,vadd(top,vmul(T,0.06*H)),vadd(top,vmul(T,0.13*H)),vadd(top,vmul(T,0.19*H)),18);
        add([taperedRibbon(pl,across,t=>0.020*Math.sin(Math.PI*Math.min(1,t*1.15+0.06)))],
            taperedRibbon(pl,across,t=>0.020*Math.sin(Math.PI*Math.min(1,t*1.15+0.06))),2);
        for(let b=0;b<14;b++){                        /* awns off the spikelet */
          const t=0.12+rnd()*0.85, sd=b%2?1:-1;
          const p0=pl[Math.round(t*(pl.length-1))];
          add([[p0,vadd(vadd(p0,vmul(across,sd*(0.020+rnd()*0.022))),vmul(T,0.020+rnd()*0.020))]],null,0);
        }
      }
    } else {
      const nf=1+Math.floor(S("fern")()*2);
      for(let fi=0;fi<nf;fi++){
        const rnd=S("frond",fi);
        const fa=rnd()*Math.PI*2, fr=(fi===0?0.04:0.20)+rnd()*0.08, h=(0.78+rnd()*0.22)*H;
        const fd=V(Math.cos(fa)*fr,0,Math.sin(fa)*fr);
        const rach=cubic3(V(0,0,0),vadd(vmul(fd,0.3),V(0,h*0.36,0)),
                          vadd(vmul(fd,0.85),V(0,h*0.72,0)),vadd(vmul(fd,1.2),V(0,h,0)),56);
        add([rach],null,0);
        const np=8+Math.floor(rnd()*4);
        for(let i=0;i<np;i++){
          const rnd=S("pinna",fi,i);
          const t=0.14+(i/(np-1))*0.82, idx=Math.round(t*(rach.length-1));
          const f=frameAt(rach,idx);
          const env=Math.sin(Math.PI*Math.pow(t,0.60))*(1-t*0.42);
          const len=(0.155+rnd()*0.055)*H*env;
          if(len<0.012)continue;
          for(const sd of [-1,1]){
            let p=vsub(across,vmul(f.T,across.x*f.T.x+across.y*f.T.y+across.z*f.T.z));
            p=vlen(p)<1e-4?f.N:vnorm(p);
            const up=vnorm(vadd(vmul(p,sd*0.95),vmul(f.T,0.58)));  /* swept toward the tip */
            const sideV=vnorm(vcross(up,vnorm(vcross(p,f.T))));
            const bl=bladeTo3D(bladeOutline("lance",rnd,20),f.P,up,sideV,len);
            add([bl],bl,1);
          }
        }
      }
    }
  } else {

  /* Composition layer. Phyllotaxy alone puts blades wherever the spiral lands,
     including straight across the stem and straight at the camera, which is what
     turned the specimens into knots. Blades are now thrown to screen-left and
     screen-right of the axis, with only enough tilt left to keep the pose reading,
     and anything that would land on top of an existing blade is shrunk or dropped. */
  const leafy=form==="foliage";
  const nodeCount=leafy?{sparse:4,normal:6,dense:8}[traits.density]
                       :{sparse:2,normal:3,dense:4}[traits.density];
  const perNode={alternate:1,opposite:2,whorled:3,basal:1}[traits.phyllotaxy];
  const bladeSteps=traits.leaf==="lobed"?46:30;
  const basal=traits.phyllotaxy==="basal";

  /* How fat is this blade, really? The clearance test used to assume every leaf
     was long and thin, so a round one claimed far less room than it occupies. */
  const prof=BLADE[traits.leaf]||BLADE.ovate;
  let maxHW=0;
  for(let i=1;i<40;i++)maxHW=Math.max(maxHW,prof(i/40));

  /* A round blade seen edge-on is a circle, and circles round a point overlap no
     matter how you space them. Real plates draw fat rosettes from above instead.
     The fatter the leaf, the further the specimen tips toward a plan view. */
  const fat=Math.max(0,Math.min(1,(maxHW-0.16)/0.30));
  planTilt=rosette?fat*(form==="foliage"?0.95:0.58):0;
  if(traits.ground==="pot"||traits.ground==="soil")planTilt=Math.min(planTilt,0.44);
  const planView=planTilt>0.02;

  const slots=[];
  const sr=S("slots");
  const ROSETTE=rosette;
  const PHYLLO={alternate:2.3999,opposite:1.5708,whorled:1.0472,basal:0};
  let azM=sr()*Math.PI*2;
  if(ROSETTE||basal){
    /* A round blade's footprint isn't just its angular width — it's round in
       every direction, so simple wedge math undercounts how much room it eats
       compared to a blade of the same half-width that tapers to a point. Blades
       close to circular (aspect near 1:1) get an extra count reduction so they
       read as a handful of big rounded leaves, like a real echeveria, rather
       than a packed ring of overlapping coins. */
    const tipHW=prof(0.92), roundness=Math.min(1,tipHW/(maxHW||1e-4));
    const countK=1-roundness*0.62;
    const n=ROSETTE?Math.max(4,Math.min(11,Math.round(Math.PI*1.15/Math.atan(maxHW)*countK+sr()*2-1)))
                   :4+Math.floor(sr()*3);
    for(let i=0;i<n;i++){
      const az=azM+i*2.3999;                       /* golden-angle spiral */
      /* A leaf aimed at or away from the camera would project to nothing, so lift
         it as it approaches the view axis. The fan stays readable from any yaw. */
      const ov=Math.abs(Math.cos(az)*view.x+Math.sin(az)*view.z);
      slots.push({idx:Math.round((0.005+sr()*0.02)*tipI(stem)),
                  azModel:az, spread:0, rosette:ROSETTE,
                  /* The old version reduced elevation by however much planTilt would
                     later add back, on the theory the two would sum to a constant
                     viewing angle. That's only true for the one leaf that happens to
                     sit on the tilt axis — planTilt rotates the WHOLE rosette about a
                     single horizontal axis, but each leaf's own elevation lifts it
                     about its own azimuth's axis, a different axis for every leaf
                     around the circle. Compensating per-leaf for a rotation that
                     doesn't act along the leaf's own axis just squashed the cone flat.
                     A plan-view rosette now gets one fixed, modest lift — natural
                     droop, nothing more — and planTilt alone does the leaning back. */
                  elev:planView?0.26+sr()*0.14
                        :((ROSETTE?0.40:0.34)+ov*0.52+sr()*0.16),
                  shrink:(ROSETTE?1.15:0.82)+sr()*0.22});
    }
  } else {
    for(let i=0;i<nodeCount;i++){
      const idx=Math.round(((leafy?0.10:0.05)+(i/(nodeCount-1||1))*(leafy?0.80:0.30))*tipI(stem));
      const shrink=1-i/(nodeCount+1.6)*0.55;
      const base=0.90+sr()*0.32;
      for(let k=0;k<perNode;k++)
        slots.push({idx, azModel:azM+k*(Math.PI*2/perNode),
                    spread:(sr()*2-1)*0.22, elev:base+k*0.06+sr()*0.10, shrink});
      azM+=PHYLLO[traits.phyllotaxy];
    }
  }

  const placed=[];
  slots.forEach((sl,ni)=>{
    const rnd=S("leaf",ni);
    const f=frameAt(stem,sl.idx);
    /* The blade's azimuth is fixed to the plant, so turning the specimen really
       does rearrange it. It is then pulled part of the way toward whichever screen
       hemisphere is nearer — enough that nothing collapses edge-on, not so much
       that the pose stops mattering. */
    const a0=Math.atan2(across.x*f.B.x+across.y*f.B.y+across.z*f.B.z,
                        across.x*f.N.x+across.y*f.N.y+across.z*f.N.z);
    const wrap=d=>Math.atan2(Math.sin(d),Math.cos(d));
    const dA=wrap(a0-sl.azModel), dB=wrap(a0+Math.PI-sl.azModel);
    const a=sl.azModel+(sl.rosette?0.18:0.55)*(Math.abs(dA)<Math.abs(dB)?dA:dB)+sl.spread;
    const outward=vnorm(vadd(vmul(f.N,Math.cos(a)),vmul(f.B,Math.sin(a))));
    const up=vnorm(vadd(vmul(outward,Math.cos(sl.elev)),vmul(f.T,Math.sin(sl.elev))));
    const nrm=vnorm(vsub(vmul(f.T,Math.cos(sl.elev)),vmul(outward,Math.sin(sl.elev))));
    /* faceCamera fights edge-on collapse by rotating each blade's face toward
       the camera. For a plan-tilted rosette that is the wrong tool: the WHOLE
       assembly is about to lean toward the viewer as one rigid tilt, so correcting
       every individual leaf on top of that as well over-rotates the far-side
       leaves until they mirror the near-side ones — a symmetric flat fan instead
       of a spiral. The more the plant leans back, the less each leaf needs its
       own correction. */
    const fcBlend=sl.rosette?Math.max(0.06,0.62*(1-planTilt)):0.62;
    const side=faceCamera(up,vnorm(vcross(up,nrm)),nrm,view,fcBlend);

    /* a fat blade has to be shorter or the rosette closes into a flower shape */
    const wide=Math.max(0.55,Math.min(1.35,0.30/maxHW));
    let len=(sl.rosette?(0.28+rnd()*0.14)*wide:0.20+rnd()*0.13)*sl.shrink*H*(traits.leaf==="needle"?1.45:traits.leaf==="strap"?1.5:1);
    let org,cen;
    let tries=0;
    for(;;){
      /* Petiole length was decided by the phyllotaxy TRAIT ("basal"), not by
         whether this plant is actually a rosette — so a rosette whose phyllotaxy
         happened to roll "opposite" got the long, normal-stem petiole ratio
         instead of the short one. That's why leaves floated above a burst of
         bare straight sticks instead of emerging from the crown. */
      org=vadd(f.P,vmul(up,len*((basal||sl.rosette)?0.10:0.26)));
      cen=vadd(org,vmul(up,len*0.5));
      const r=len*Math.max(0.40,maxHW*1.15);
      if(sl.rosette){placed.push({c:cen,r});break;}   /* spacing is the spiral's job */
      const clash=placed.some(p=>vlen(vsub(cen,p.c))<(r+p.r)*0.70);
      if(!clash){placed.push({c:cen,r});break;}
      if(++tries>2)return;                              /* no room — leave it out */
      len*=0.66;
    }

    let outline=bladeOutline(traits.leaf,rnd,bladeSteps);
    if(traits.quirk==="bitten"&&ni===1){
      outline=outline.map((q,qi)=>
        (qi>bladeSteps*0.30&&qi<bladeSteps*0.52)?{u:q.u*0.42,v:q.v}:q);
    }
    const blade=bladeTo3D(outline,org,up,side,len);
    const paths=[blade,[f.P,org]];

    if(traits.venation!=="none"&&!sl.rosette){
      paths.push([vadd(org,vmul(up,len*0.06)),vadd(org,vmul(up,len*0.90))]);
      if(traits.venation==="pinnate"){
        for(let v=1;v<=2;v++){
          const t=0.34+v*0.22, hw=(BLADE[traits.leaf]||BLADE.ovate)(t)*len*0.72;
          const c=vadd(org,vmul(up,t*len));
          paths.push([c,vadd(vadd(c,vmul(side,hw)),vmul(up,len*0.09))]);
          paths.push([c,vadd(vadd(c,vmul(side,-hw)),vmul(up,len*0.09))]);
        }
      } else if(traits.venation==="palmate"){
        [-1,1].forEach(v=>{
          const c=vadd(org,vmul(up,len*0.10));
          paths.push([c,vadd(vadd(c,vmul(side,v*0.17*len)),vmul(up,len*0.66))]);
        });
      }
    }
    add(paths,blade,1,"leaf"+ni);

    if(traits.quirk==="tendrils"&&ni%2===0&&!basal){
      const t0=vadd(org,vmul(up,len*0.5)),coil=[];
      for(let q=0;q<=26;q++){
        const t=q/26,ang=t*Math.PI*4.2;
        coil.push(vadd(t0,vadd(vmul(side,Math.cos(ang)*0.045*t+0.10*t),vmul(up,Math.sin(ang)*0.045*t+0.14*t))));
      }
      add([coil],null,0);
    }
  });

  const flowers=(form==="bloom"||form==="buds");

  /* How the flowers are borne on the axis. A single big terminal head is the
     childish default; real botanical doodles hang small florets off pedicels. */
  const tip=stem.length-1, heads=[];
  if(flowers){
  const ir=S("infl");
  /* A raceme/spray/corymb is many florets along one run of stem. If each one takes
     its "outward" direction from the stem's OWN local frame, a twisting habit like
     climbing spins that frame through a full turn over the run — so consecutive
     florets fire off in unrelated compass directions instead of forming one
     coherent spike. Fix the outward reference once, at the middle of the run, and
     every floret in this inflorescence uses that same compass bearing. Only the
     attachment point (f.P) still comes from each floret's own place on the stem. */
  const f0=frameAt(stem,Math.round(tip*0.5));
  const pedicel=(idx,outDir,L,scale)=>{
    const f=frameAt(stem,idx);
    const dir=vnorm(vadd(vmul(f0.N,outDir.n),vadd(vmul(f0.B,outDir.b),vmul(f0.T,outDir.t))));
    const end=vadd(f.P,vmul(dir,L));
    add([cubic3(f.P,vadd(f.P,vmul(dir,L*0.45)),vadd(end,vmul(f0.T,-L*0.30)),end,18)],null,0);
    heads.push({pos:end,tan:dir,scale});
  };
  /* A floret's own radius is roughly 0.24*scale*H (see HS below). If the pedicel
     carrying it is shorter than that, the florets pile into an unreadable ball —
     this was happening on every habit, not just creeping. Pedicel length is now
     derived FROM the scale, with enough clearance that heads stay separate. */
  const stalk=(scale,mul)=>(mul[0]+ir()*mul[1])*scale*H;
  switch(traits.arrangement){
    case "spray":{
      const n=3+Math.floor(ir()*3);
      for(let i=0;i<n;i++){
        const idx=Math.round((0.76+(i/(n-1||1))*0.22)*tip);
        const sc=0.42+ir()*0.14;
        pedicel(idx,{n:(i%2?1:-1)*(0.6+ir()*0.5),b:(ir()*2-1)*0.5,t:1.15+ir()*0.5},stalk(sc,[1.0,0.55]),sc);
      }
      heads.push({pos:stem[tip],tan:frameAt(stem,tip).T,scale:0.5});
      break;}
    case "raceme":{
      const n=7+Math.floor(ir()*5);                    /* fewer, so along-stem spacing survives */
      for(let i=0;i<n;i++){
        const idx=Math.round((0.50+(i/(n-1))*0.48)*tip);  /* spread over more of the stem */
        const sc=0.20+ir()*0.08;
        pedicel(idx,{n:(i%2?1:-1)*1.0,b:(ir()*2-1)*0.25,t:0.75},stalk(sc,[1.1,0.6]),sc);
      }
      break;}
    case "corymb":{
      const base=Math.round(0.82*tip), n=4+Math.floor(ir()*4);
      for(let i=0;i<n;i++){
        const a=(i/(n-1||1)-0.5)*1.25;
        const sc=0.30+ir()*0.10;
        /* outer stalks run a little longer than inner ones, the flat-topped
           silhouette a real corymb has */
        const L=stalk(sc,[0.95,0.5])*(1+Math.abs(Math.sin(a))*0.35);
        pedicel(base,{n:Math.sin(a)*0.95,b:(ir()*2-1)*0.45,t:Math.cos(a)*1.35},L,sc);
      }
      break;}
    default:
      heads.push({pos:stem[tip],tan:frameAt(stem,tip).T,scale:1});
  }
  if(traits.arrangement!=="solitary")
    heads.forEach((h,i)=>{if(i<heads.length-1&&rnd()<0.28)h.bud=true;});
  if(form==="buds")heads.forEach(h=>h.bud=true);
  }

  /* Berries: small round fruit on stubby stalks up the top half. */
  if(form==="berries"){
    const n=6+Math.floor(S("berries")()*7);
    for(let i=0;i<n;i++){
      const rnd=S("berry",i);
      const idx=Math.round((0.42+(i/(n-1))*0.56)*tip), f=frameAt(stem,idx);
      const ab=i*2.3999+0.7;
      const p=vnorm(vadd(vmul(f.N,Math.cos(ab)),vmul(f.B,Math.sin(ab))));
      const dir=vnorm(vadd(vmul(p,0.9),vmul(f.T,0.75)));
      const L=(0.030+rnd()*0.030)*H, c=vadd(f.P,vmul(dir,L)), r=(0.022+rnd()*0.014)*H;
      add([[f.P,c]],null,0);
      const ring=[],sv=vnorm(vcross(dir,view));
      const uv=vnorm(vcross(sv,view));
      for(let q=0;q<=26;q++){const a=q/26*Math.PI*2;ring.push(vadd(c,vadd(vmul(sv,Math.cos(a)*r),vmul(uv,Math.sin(a)*r))));}
      add([ring],ring,2,"berry"+i);
    }
  }

  /* Seed head: a spindle of scales with bristles, no petals at all. */
  if(form==="seedhead"){
    const rnd=S("seedhead");
    const f=frameAt(stem,tip), T=f.T, base=stem[tip];
    const L=(0.16+rnd()*0.09)*H;
    const ax=cubic3(base,vadd(base,vmul(T,L*0.34)),vadd(base,vmul(T,L*0.68)),vadd(base,vmul(T,L)),24);
    const sp=taperedRibbon(ax,across,t=>(0.030+rnd()*0.004)*Math.sin(Math.PI*Math.min(1,t*1.05+0.10)));
    add([sp],sp,2);
    for(let b=0;b<20;b++){
      const t=0.18+rnd()*0.80, sd=b%2?1:-1;
      const p0=ax[Math.round(t*(ax.length-1))];
      add([[p0,vadd(vadd(p0,vmul(across,sd*(0.022+rnd()*0.028))),vmul(T,0.026+rnd()*0.030))]],null,0);
    }
  }

  if(flowers&&traits.stem!=="single"&&traits.habit!=="rosette"){
    const bi=Math.round(stem.length*0.74);
    const f=frameAt(stem,bi);
    const dir=vnorm(vadd(vmul(f.N,0.55),vmul(f.T,1.3)));
    const bEnd=vadd(f.P,vmul(dir,0.22*H));
    const branch=cubic3(f.P,vadd(f.P,vmul(dir,0.18*H)),vadd(bEnd,vmul(f.N,-0.06)),bEnd,40);
    add([branch],null,0);
    heads.push({pos:bEnd,tan:dir,scale:traits.arrangement==="solitary"?0.72:0.45});
    if(traits.stem==="bifid"){
      const dir2=vnorm(vadd(vmul(f.N,-0.5),vmul(f.T,1.45)));
      const b2=vadd(f.P,vmul(dir2,0.17*H));
      add([cubic3(f.P,vadd(f.P,vmul(dir2,0.15*H)),vadd(b2,vmul(f.N,0.05)),b2,36)],null,0);
      heads.push({pos:b2,tan:dir2,scale:traits.arrangement==="solitary"?0.58:0.38});
    }
  }

  /* flower heads */
  const petalN=PETAL_N[traits.petals];
  heads.forEach((h,hi)=>{
    const rnd=S("head",hi);
    const pos=h.pos, tan=h.tan;
    /* face mostly toward the model's +Z so heads read frontally, but still rotate with the plant */
    const nrm=vnorm(vadd(vmul(tan,0.52),V(0,0.10,0.78)));
    let side=vcross(V(0,1,0),nrm);
    if(vlen(side)<0.05)side=vcross(V(1,0,0),nrm);
    side=vnorm(side);
    let up=vnorm(vcross(nrm,side));
    side=faceCamera(up,side,nrm,view,0.58);
    up=vnorm(vcross(vnorm(vcross(side,up)),side));
    const KS={spike:1.55,cluster:1.15,umbel:1.15,globe:1.05}[traits.flower]||1;
    const HS=(0.21+rnd()*0.06)*h.scale*H*KS;
    const head=h.bud?null:flowerHead(traits.flower,petalN,rnd);
    const to3=(u,v)=>vadd(pos,vadd(vmul(side,u*HS),vmul(up,v*HS)));

    if(h.bud){                                   /* a closed teardrop, still on its way up */
      const b=[];
      const bw=t=>0.105*Math.pow(t,0.5)*Math.pow(1-t,0.62)*3.2;
      for(let i=0;i<=15;i++){const t=i/15;b.push(to3( bw(t), t*0.66));}
      for(let i=15;i>=0;i--){const t=i/15;b.push(to3(-bw(t), t*0.66));}
      add([b],b,2);
      return;
    }
    if(head.disc>0){
      const ring=[];
      for(let i=0;i<=46;i++){const a=i/46*Math.PI*2;ring.push(to3(Math.cos(a)*head.disc,Math.sin(a)*head.disc));}
      add([ring],ring,2);
    }
    head.petals.forEach(p=>{
      const ca=Math.cos(p.a),sa=Math.sin(p.a);
      const pts=p.pts.map(q=>{
        const vv=q.v+(p.r0||0);
        return to3(q.u*ca-vv*sa, q.u*sa+vv*ca);
      });
      add([pts],pts,2);
    });
    (head.arcs||[]).forEach(a=>add([a.map(q=>to3(q.u,q.v))],null,0));
    head.rays.forEach(r=>{
      add([[to3(Math.cos(r.a)*r.r0,Math.sin(r.a)*r.r0),to3(Math.cos(r.a)*r.r1,Math.sin(r.a)*r.r1)]],null,0);
    });
    head.rings.forEach(r=>{
      const ring=[];
      for(let i=0;i<=34;i++){
        const a=i/34*Math.PI*2;
        ring.push(to3((r.ax||0)+Math.cos(a)*r.r,(r.cy||0)+Math.sin(a)*r.r*(r.squash??1)));
      }
      add([ring],ring,2);
    });
    /* a petal that came loose and is on its way down */
    if(traits.quirk==="dropped"&&hi===0&&head.petals.length){
      const p=head.petals[0],fall=vadd(pos,V(0.20*H,-0.34*H,0.02));
      const pts=p.pts.map(q=>vadd(fall,vadd(vmul(side,(q.u*0.9+q.v*0.4)*HS),vmul(up,(q.v*0.5-q.u*0.8)*HS))));
      add([pts],pts,2);
    }
  });

  /* Sister axes rising from the same point — on the reference sheet this is as
     common as the single stem, and it is what makes a specimen read as a plant
     rather than a diagram of one. */
  if(traits.habit==="clump"){
    const term=flowers;
    const n=1+Math.floor(S("clump")()*2);
    for(let i=0;i<n;i++){
      const rnd=S("sister",i);
      const ca=rnd()*Math.PI*2, cr=0.10+rnd()*0.10, hh=(0.66+rnd()*0.22)*H;
      const cd=V(Math.cos(ca)*cr,0,Math.sin(ca)*cr);
      const sis=cubic3(V(0,0,0),vadd(vmul(cd,0.4),V(0,hh*0.34,0)),
                       vadd(vmul(cd,0.9),V(0,hh*0.70,0)),vadd(vmul(cd,1.25),V(0,hh,0)),56);
      add([sis],null,0);
      if(term)heads.push({pos:sis[sis.length-1],
                  tan:vnorm(vsub(sis[sis.length-1],sis[sis.length-6])),
                  scale:0.62+rnd()*0.20, bud:form==="buds"||rnd()<0.22});
    }
  }

  }
  /* ground treatment */
  {
    const rnd=S("ground");
    /* Ground is a solid in the world, not a decoration on the picture plane.
       Build it as real rings so it foreshortens with pitch and holds up at any yaw. */
    let nr=vsub(V(0,0,0),view);                        /* toward the camera */
    nr=vsub(nr,vmul(V(0,1,0),nr.y));
    nr=vlen(nr)<1e-4?V(0,0,-1):vnorm(nr);
    const ux=vnorm(vcross(V(0,1,0),nr));
    const ring=(r,y,from,to,steps)=>{
      const o=[];
      for(let i=0;i<=steps;i++){
        const th=from+(to-from)*(i/steps);
        o.push(V(ux.x*Math.cos(th)*r+nr.x*Math.sin(th)*r, y,
                 ux.z*Math.cos(th)*r+nr.z*Math.sin(th)*r));
      }
      return o;
    };
    if(traits.ground==="soil"){
      const r=0.36, near=ring(r,0.004,0,Math.PI,30);
      add([near.map((p,i)=>V(p.x,p.y+Math.sin(i*0.9)*0.006,p.z))],null,0,"gnd0");
    } else if(traits.ground==="pot"){
      const w=0.30,b=w*0.72,d=0.30;
      const rimN=ring(w,0.02,0,Math.PI,26), rimF=ring(w,0.02,Math.PI,Math.PI*2,26);
      const baseN=ring(b,-d,0,Math.PI,26);
      const body=rimN.concat(baseN.slice().reverse());
      add([body],body,1,"gnd0");
      add([rimN],null,0,"gnd1"); add([rimF],null,0,"gnd2"); add([baseN],null,0,"gnd3");
      const lipN=ring(w*1.06,-0.055,0,Math.PI,26);
      add([lipN,[rimN[0],lipN[0]],[rimN[rimN.length-1],lipN[lipN.length-1]]],null,0,"gnd4");
    } else if(traits.ground==="roots"){
      /* Evenly-spaced straight spokes from one point read as a drawn star, not
         a root ball. Real roots fork at uneven intervals, wander instead of
         running straight, taper as they thin out, and rarely all reach the
         same length. */
      const n=4+Math.floor(rnd()*4);
      const angles=[]; let a0r=rnd()*Math.PI*2;
      for(let i=0;i<n;i++){ a0r+=(Math.PI*2/n)*(0.55+rnd()*0.9); angles.push(a0r); }
      angles.forEach((a,i)=>{
        /* Root length was a flat constant, never scaled by H like every other
           part of the plant. A rosette built at H≈0.4 still grew roots sized for
           a full-height H=1 plant, so they towered over the leaf cluster instead
           of belonging to it. */
        const L=(0.11+rnd()*0.20)*H, wander=(rnd()*2-1)*0.5;
        const d2=V(Math.cos(a),0,Math.sin(a));
        const perp=V(-Math.sin(a),0,Math.cos(a));
        const root=cubic3(V(0,0,0),
          vadd(vadd(vmul(d2,L*0.30),vmul(perp,L*wander*0.25)),V(0,-L*0.30,0)),
          vadd(vadd(vmul(d2,L*0.68),vmul(perp,L*wander*0.55)),V(0,-L*0.82,0)),
          vadd(vadd(vmul(d2,L*0.92),vmul(perp,L*wander*0.70)),V(0,-L*1.15,0)),22);
        const taper=taperedRibbon(root,across,t=>0.006*Math.pow(1-t,0.8)+0.0015);
        add([taper],taper,0,"gnd"+i);
        if(rnd()<0.45){                        /* an occasional forking rootlet */
          const bi=10+Math.floor(rnd()*8);
          const bp=root[bi], bd=vnorm(vadd(vmul(d2,0.5+rnd()*0.4),vmul(perp,(rnd()*2-1)*0.7)));
          const bL=L*(0.25+rnd()*0.25);
          const branch=cubic3(bp,vadd(bp,vmul(bd,bL*0.4)),vadd(bp,vmul(bd,bL*0.75)),
                              vadd(bp,vadd(vmul(bd,bL),V(0,-bL*0.4,0))),14);
          add([taperedRibbon(branch,across,t=>0.004*Math.pow(1-t,0.8)+0.0012)],null,0,"gnd"+i+"b");
        }
      });
    }
  }
  if(planTilt>0.02){
    const c=Math.cos(planTilt), si=Math.sin(planTilt);
    const k=vnorm(V(across.x,0,across.z));            /* camera's horizontal */
    const tip=v=>{
      const kd=k.x*v.x+k.y*v.y+k.z*v.z, kc=vcross(k,v);
      return V(v.x*c+kc.x*si+k.x*kd*(1-c),
               v.y*c+kc.y*si+k.y*kd*(1-c),
               v.z*c+kc.z*si+k.z*kd*(1-c));
    };
    parts.forEach(p=>{
      if(String(p.key).startsWith("gnd"))return;    /* the pot stays on the table */
      p.paths=p.paths.map(pa=>pa.map(tip));
      if(p.fill)p.fill=p.fill.map(tip);
    });
  }

  return parts;
}


export { TRAITS, GROUPS, PALETTES, pctOf, rollTraits, speciesName, writeText, buildPlant, makeCam };
