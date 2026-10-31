// PLAYGROUND · formas de prueba de Brush Lab (curva, línea, círculo, hoja, ramita, rayado, garabato, rayos), cada una como lista de trazos.
// Código de Brush Lab sin cambios de comportamiento.

function cubic(p0,p1,p2,p3,steps){
  const out = [];
  for (let i=0;i<=steps;i++){
    const t = i/steps, u = 1-t;
    out.push({
      x: u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      y: u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y
    });
  }
  return out;
}
function ring(cx,cy,r,steps){
  const out = [];
  for (let i=0;i<=steps;i++){
    const a = i/steps*Math.PI*2;
    out.push({x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r});
  }
  return out;
}
function leafShape(bx,by,bw,bh,steps,lean){
  /* lean skews the tip off the midline so the two sides aren't mirror images */
  const k = lean || 0;
  const tip = {x:bx+bw*(0.5+k*0.28), y:by};
  const base = {x:bx+bw*(0.5-k*0.1), y:by+bh};
  const right = cubic(base, {x:bx+bw*(1.05+k*0.15),y:by+bh*0.72}, {x:bx+bw*(0.92+k*0.1),y:by+bh*0.22}, tip, steps);
  const left  = cubic(tip, {x:bx+bw*(0.08+k*0.2),y:by+bh*0.22}, {x:bx-bw*(0.05-k*0.08),y:by+bh*0.72}, base, steps);
  return right.concat(left.slice(1));
}

function buildShape(kind, S, rnd){
  const P = [];
  const pad = S*0.14, w = S-pad*2;
  switch(kind){
    case "line":
      P.push([{x:pad, y:S*0.5}, {x:S-pad, y:S*0.5}]);
      break;
    case "curve":
      P.push(cubic({x:pad,y:S*0.72},{x:S*0.34,y:S*0.05},{x:S*0.66,y:S*0.95},{x:S-pad,y:S*0.28}, 90));
      break;
    case "circle":
      P.push(ring(S/2, S/2, w*0.36, 140));
      break;
    case "leaf":
      P.push(leafShape(S*0.3, S*0.16, S*0.4, S*0.68, 48, 0.35));
      /* midrib */
      P.push(cubic({x:S*0.5,y:S*0.82},{x:S*0.51,y:S*0.62},{x:S*0.5,y:S*0.38},{x:S*0.5,y:S*0.19}, 40));
      break;
    case "sprig": {
      const bottom = {x:S*0.5, y:S*0.92}, top = {x:S*0.46, y:S*0.16};
      const stem = cubic(bottom, {x:S*0.62,y:S*0.7}, {x:S*0.34,y:S*0.4}, top, 80);
      P.push(stem);
      const at = [0.26, 0.42, 0.58, 0.74];
      at.forEach((t, i) => {
        const idx = Math.round(t*(stem.length-1));
        const a = stem[idx];
        const side = i % 2 ? 1 : -1;
        const size = S*(0.20 - i*0.018);
        const ax = a.x + side*size*0.62, ay = a.y - size*0.42;
        const lf = leafShape(ax - size/2, ay - size*0.8, size, size*1.5, 30, (rnd()*2-1)*0.5);
        P.push(lf);
        P.push([{x:a.x, y:a.y}, {x:ax, y:ay+size*0.34}]);
      });
      P.push(ring(top.x, top.y - S*0.02, S*0.075, 60));
      for (let i=0;i<6;i++){
        const a = i/6*Math.PI*2 + 0.4;
        P.push([
          {x:top.x+Math.cos(a)*S*0.075, y:top.y-S*0.02+Math.sin(a)*S*0.075},
          {x:top.x+Math.cos(a)*S*0.145, y:top.y-S*0.02+Math.sin(a)*S*0.145}
        ]);
      }
      break;
    }
    case "hatch": {
      const a = -0.62, n = 34;
      for (let i=0;i<n;i++){
        const u = i/(n-1);
        const cxp = pad + u*w;
        const jitter = (rnd()*2-1)*S*0.02;
        const len = w*(0.42 + rnd()*0.3);
        const mx = cxp + jitter, my = S*0.5 + (rnd()*2-1)*S*0.05;
        P.push([
          {x:mx-Math.cos(a)*len/2, y:my-Math.sin(a)*len/2},
          {x:mx+Math.cos(a)*len/2, y:my+Math.sin(a)*len/2}
        ]);
      }
      break;
    }
    case "scribble": {
      const pts = [];
      let x = pad, y = S*0.5;
      for (let i=0;i<180;i++){
        const t = i/179;
        x = pad + t*w;
        y = S*0.5 + Math.sin(t*Math.PI*13)*S*0.2*Math.sin(t*Math.PI) + (rnd()*2-1)*S*0.012;
        pts.push({x,y});
      }
      P.push(pts);
      break;
    }
    case "rays": {
      const cx = S*0.5, cy = S*0.5, n = 12;
      for (let i=0;i<n;i++){
        const a = i/n*Math.PI;
        P.push([
          {x:cx-Math.cos(a)*w*0.44, y:cy-Math.sin(a)*w*0.44},
          {x:cx+Math.cos(a)*w*0.44, y:cy+Math.sin(a)*w*0.44}
        ]);
      }
      break;
    }
  }
  return P;
}

/* ============================================================
   6. PRESETS
   ============================================================ */

export { cubic, buildShape };
