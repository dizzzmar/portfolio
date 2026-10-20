// Escenas del tráiler. Cada una usa su propio contador de fotogramas (empieza en 0 dentro de su <Sequence>).
// La estructura imita el ritmo del showreel analizado: revelado de marca → aplicaciones en cortes de un pulso → corte seco.
import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, interpolate, useCurrentFrame} from 'remotion';
import {C, JACQUARD, Fill, Grain, Push, RiseLetters, asset, easeOut, hash, ramp, scramble, snap} from './lib';
import ASCII from './tomato-ascii.json';
import {Room3D, Tomato3D} from './three-d';

// ─────────────────────────────────────────────────────────────
// 1 · Tomate ASCII (0–3 s): empieza en un primer plano de letras grandes, la cámara se aleja hasta ver el tomate
// entero y las letras se deshacen dejando paso al tomate 3D, del mismo tamaño y en el mismo sitio.
// Se dibuja en un <canvas> (casi 7.000 caracteres con el color de cada punto de tomato.webp).
// ─────────────────────────────────────────────────────────────
type AsciiData = {cols: number; rows: number; cells: [number, number, number, string][]};
const DATA = ASCII as AsciiData;
const RAMP = '.:-=+*#%@';
const NAME = 'dizmar';
const CELL_H = 7.3; // alto de cada carácter con la cámara alejada: el tomate mide lo mismo que el 3D (≈ 583 px)
const CELL_W = CELL_H * 0.6;

// Cámara: [fotograma, zoom, columna, fila] a la que mira
const CAM: [number, number, number, number][] = [
  [0, 10, 84, 44],
  [44, 7.5, 74, 40],
  [72, 1, 62, 40],
  [90, 1, 62, 40],
];
const camAt = (f: number) => {
  const k = CAM.findIndex(([t]) => t > f);
  if (k <= 0) return CAM[k === 0 ? 0 : CAM.length - 1].slice(1) as number[];
  const [t0, z0, x0, y0] = CAM[k - 1];
  const [t1, z1, x1, y1] = CAM[k];
  const e = k === 2 ? Easing.bezier(0.65, 0, 0.25, 1)((f - t0) / (t1 - t0)) : (f - t0) / (t1 - t0);
  // el zoom se interpola en escala logarítmica para que el alejamiento se sienta constante
  return [Math.exp(Math.log(z0) + (Math.log(z1) - Math.log(z0)) * e), x0 + (x1 - x0) * e, y0 + (y1 - y0) * e];
};

export const AsciiTomato: React.FC = () => {
  const f = useCurrentFrame();
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [z, camX, camY] = camAt(f);
  const speed = f > 44 && f < 72 ? Math.sin(((f - 44) / 28) * Math.PI) : 0; // 0 → 1 → 0 durante el alejamiento
  const dissolve = ramp(f, 72, 86, Easing.linear);
  const show3D = ramp(f, 76, 88, Easing.linear);

  React.useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#000';
    g.fillRect(0, 0, 1920, 1080);
    const fs = CELL_H * z * 1.05;
    g.font = `700 ${fs}px "JetBrains Mono", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const draw = (dx: number, color: string | null, alpha: number) => {
      g.globalAlpha = alpha;
      for (const [x, y, lum, hex] of DATA.cells) {
        const sx = 960 + (x - camX) * CELL_W * z + dx;
        const sy = 540 + (y - camY) * CELL_H * z;
        if (sx < -fs || sx > 1920 + fs || sy < -fs || sy > 1080 + fs) continue;
        const seed = x * 131 + y * 71;
        if (hash(seed) * 10 > f) continue; // aparecen en los primeros 10 fotogramas
        if (hash(seed + 5) < dissolve * 1.05) continue; // se deshacen al pasar a 3D
        const tick = Math.floor(f / 3);
        const flick = hash(seed + tick * 17) < 0.12;
        const ch = hash(seed + 9) < 0.14 || flick ? NAME[Math.floor(hash(seed + tick) * NAME.length)] : RAMP[Math.min(RAMP.length - 1, Math.floor(lum * 1.25 * RAMP.length))];
        g.fillStyle = color ?? hex;
        g.fillText(ch, sx, sy);
      }
    };
    // Desfase de color (rojo y cian) que crece con la velocidad del alejamiento
    const ab = 2 + speed * 14;
    g.globalCompositeOperation = 'lighter';
    draw(-ab, '#ff1a00', 0.35);
    draw(ab, '#00b7ff', 0.3);
    g.globalCompositeOperation = 'source-over';
    draw(0, null, 1);
    g.globalAlpha = 1;
  }, [f, z, camX, camY, speed, dissolve]);

  return (
    <Fill bg="#000">
      <canvas ref={ref} width={1920} height={1080} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0 2px, transparent 2px 5px)'}} />
      <AbsoluteFill style={{opacity: show3D}}>
        <Tomato3D spin={(f - 90) / 90} scale={3.4} ring={false} />
      </AbsoluteFill>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 5 · "Creative ___": la frase de la portada, con la palabra que se descifra en cada pulso (gris oscuro, nunca rojo).
// ─────────────────────────────────────────────────────────────
const WORDS = ['Director', 'Coder', 'Maximalist', 'Storyteller', '3D Artist', 'Designer'];
export const Creative: React.FC = () => {
  const f = useCurrentFrame();
  const per = 10;
  const i = Math.min(WORDS.length - 1, Math.floor(f / per));
  const word = scramble(WORDS[i], f, i * per, i === WORDS.length - 1 ? 6 : 3, i);
  return (
    <Fill bg={i % 2 ? C.paper : C.white}>
      <div style={{fontSize: 210, fontWeight: 700, letterSpacing: '-0.05em', color: C.ink, lineHeight: 1.0, width: 1600}}>
        <RiseLetters text="Creative" frame={f} start={0} stagger={0.6} dur={6} />
        <div style={{color: C.grey, transform: `rotate(${(hash(i + 3) - 0.5) * 6}deg) scale(${1 + ((f - i * per) < 2 ? 0.06 : 0)})`, transformOrigin: 'left center'}}>{word}</div>
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 8 · Lexus Electrified: el film con la palabra gigante en contorno cruzando la pantalla, y salida con glitch por franjas.
// ─────────────────────────────────────────────────────────────
export const LexusFilm: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg="#000">
      <AbsoluteFill style={{transform: `scale(${interpolate(f, [0, 22], [1.1, 1.02])})`}}>
        <OffthreadVideo src={asset('projects/lexus-electrified/film.mp4')} startFrom={128} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', top: 330, whiteSpace: 'nowrap', fontSize: 380, fontWeight: 700, letterSpacing: '-0.06em', color: 'transparent', WebkitTextStroke: '4px #fff', transform: `translateX(${interpolate(f, [0, 35], [700, -1500])}px)`}}>
        ELECTRIFIED ELECTRIFIED
      </div>
    </Fill>
  );
};

// Glitch por franjas horizontales que se desplazan y se van apagando (como la pirámide del original).
export const Glitch: React.FC<{src: string; dur?: number}> = ({src, dur = 15}) => {
  const f = useCurrentFrame();
  const bands = 14;
  const out = ramp(f, 3, dur, Easing.in(Easing.quad));
  return (
    <Fill bg="#000">
      {Array.from({length: bands}, (_, i) => {
        const r = hash(i * 9 + Math.floor(f / 2) * 5);
        const dx = (r - 0.5) * 600 * out;
        const visible = hash(i * 3 + 1) > out * 1.1;
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: `${(i / bands) * 100}%`, height: `${100 / bands}%`, overflow: 'hidden', opacity: visible ? 1 : 0}}>
            <img src={src} style={{position: 'absolute', width: 1920, height: 1080, objectFit: 'cover', top: `${-(i / bands) * 1080}px`, transform: `translateX(${dx}px)`, filter: r > 0.7 ? 'hue-rotate(160deg) saturate(3)' : 'none'}} />
          </div>
        );
      })}
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 9 · Soap & Glory · Vanillalicious: letras que caen con rebote, rejilla de bodegones y golpe a sangre.
// ─────────────────────────────────────────────────────────────
const PINK = '#f6c9cd';
const TITLE = '#222222';
export const SoapTitle: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg={PINK}>
      <div style={{display: 'flex', fontSize: 230, fontWeight: 700, letterSpacing: '-0.05em', color: TITLE}}>
        {[...'Vanillalicious'].map((ch, i) => {
          const p = ramp(f, i * 1.1, i * 1.1 + 10, Easing.bezier(0.34, 1.7, 0.64, 1));
          return (
            <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * -500}px) rotate(${(1 - p) * (i % 2 ? 20 : -20)}deg)`, opacity: p > 0 ? 1 : 0}}>
              {ch}
            </span>
          );
        })}
      </div>
          </Fill>
  );
};

export const SoapGrid: React.FC = () => {
  const f = useCurrentFrame();
  const imgs = ['sg1', 'sg3', 'sg4', 'sg2'];
  return (
    <Fill bg={PINK}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 400px)', gap: 24}}>
        {imgs.map((n, i) => {
          const p = ramp(f, i * 2, i * 2 + 10, snap);
          return (
            <div key={n} style={{width: 400, height: 400, overflow: 'hidden', transform: `translateY(${(1 - p) * (i % 2 ? 300 : -300)}px)`, opacity: p}}>
              <img src={asset(`projects/soap-and-glory-vanilla/${n}-800.webp`)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.15 - p * 0.15})`}} />
            </div>
          );
        })}
      </div>
    </Fill>
  );
};

export const SoapHero: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg={PINK}>
      <Push src={asset('projects/soap-and-glory-vanilla/sg5-1600.webp')} frame={f} dur={15} from={1.35} to={1.05} pos="center 40%" />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 10 · Schweppes: el film en formato cine (bandas negras) y el título que se descifra.
// ─────────────────────────────────────────────────────────────
export const Schweppes: React.FC = () => {
  const f = useCurrentFrame();
  const bars = interpolate(f, [0, 8, 67, 75], [540, 138, 138, 540], {extrapolateRight: 'clamp', easing: easeOut});
  const second = f >= 37;
  return (
    <Fill bg="#000">
      <AbsoluteFill>
        <OffthreadVideo src={asset('projects/schweppes/film.mp4')} startFrom={second ? 420 - 37 : 60} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 90, bottom: 30, display: 'flex', alignItems: 'baseline', gap: 40, opacity: f < 66 ? 1 : 0}}>
        <div style={{fontSize: 72, fontWeight: 700, color: C.white, letterSpacing: '-0.02em'}}>{scramble('Schweppes', f, 6, 12, 3)}</div>
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 12 · About: la foto en un marco rojo pequeño hace zoom a pantalla completa y entra el nombre en Jacquard.
// ─────────────────────────────────────────────────────────────
export const About: React.FC = () => {
  const f = useCurrentFrame();
  const z = ramp(f, 8, 22, Easing.bezier(0.7, 0, 0.2, 1));
  const w = interpolate(z, [0, 1], [430, 1920]);
  const h = interpolate(z, [0, 1], [575, 1080]);
  return (
    <Fill bg={C.black}>
      <div style={{width: w, height: h, overflow: 'hidden', outline: `${(1 - z) * 8}px solid ${C.red}`, outlineOffset: (1 - z) * 14, position: 'relative'}}>
        <img src={asset('images/mario-956.webp')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%'}} />
      </div>
      <div style={{position: 'absolute', bottom: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30}}>
        <div style={{fontFamily: JACQUARD, fontSize: 300, lineHeight: 1, color: C.white, textShadow: '0 6px 40px rgba(0,0,0,0.35)', opacity: ramp(f, 22, 25, Easing.linear), transform: `scale(${interpolate(ramp(f, 22, 32), [0, 1], [1.3, 1])}) rotate(${interpolate(ramp(f, 22, 32), [0, 1], [-6, -2])}deg)`}}>
          Mario Diz
        </div>
      </div>
    </Fill>
  );
};


// ─────────────────────────────────────────────────────────────
// 2 · El tomate 3D de la portada con su anillo "MARIO DIZ" sobre rojo. Da un acelerón en cada golpe y al final sale volando hacia arriba.
// ─────────────────────────────────────────────────────────────
export const TomatoSpin: React.FC = () => {
  const f = useCurrentFrame();
  // Giro base + medio giro extra muy rápido en cada pulso (15 fotogramas)
  const beat = Math.floor(f / 15);
  const inBeat = ramp(f % 15, 0, 7, snap);
  const spin = f / 90 + (beat + inBeat) * 0.5;
  const punch = 1 + (1 - ramp(f % 15, 0, 6)) * 0.12;
  const fly = ramp(f, 46, 60, Easing.in(Easing.cubic));
  return (
    <Fill bg={C.red}>
      <AbsoluteFill style={{transform: `scale(${punch})`}}>
        <Tomato3D spin={spin} scale={3.4} y={fly * 6} tilt={Math.sin(f / 9) * 0.15} />
      </AbsoluteFill>
      <Grain opacity={0.12} />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 4 · El cielo de la portada: las nubes se acercan, se desenfocan y se funden en blanco.
// ─────────────────────────────────────────────────────────────
export const SkyDive: React.FC = () => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, 30], [1, 3.2], {easing: Easing.in(Easing.quad)});
  const blur = interpolate(f, [8, 30], [0, 18], {extrapolateLeft: 'clamp'});
  const white = ramp(f, 20, 30, Easing.linear);
  return (
    <Fill bg={C.sky}>
      <AbsoluteFill style={{transform: `scale(${z})`, filter: `blur(${blur}px)`}}>
        <img src={asset('images/sky.webp')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% 40%'}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', fontSize: 190, fontWeight: 700, letterSpacing: '-0.05em', color: C.white, transform: `scale(${1 + f * 0.04})`, opacity: 1 - white}}>dizmar.xyz</div>
      <AbsoluteFill style={{background: C.white, opacity: white}} />
      <Grain opacity={0.14} />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 6 · Montón de proyectos: las imágenes caen sobre la mesa una cada 7 fotogramas, giradas, con sacudida al aterrizar.
// ─────────────────────────────────────────────────────────────
const PILE = [
  {src: 'projects/lexus-electrified/poised-640.webp', w: 380, h: 675, x: -560, y: 10, r: -8},
  {src: 'projects/soap-and-glory-vanilla/sg3-800.webp', w: 520, h: 520, x: 40, y: -120, r: 6},
  {src: 'projects/schweppes/frame-1-800.webp', w: 720, h: 405, x: 420, y: 200, r: -4},
  {src: 'room/vinyl-cover.webp', w: 380, h: 380, x: -180, y: 250, r: 12},
  {src: 'projects/lexus-electrified/kv-lake-800.webp', w: 620, h: 438, x: 560, y: -260, r: 9},
  {src: 'projects/soap-and-glory-vanilla/sg1-800.webp', w: 460, h: 460, x: -60, y: 40, r: -14},
];
export const Pile: React.FC = () => {
  const f = useCurrentFrame();
  const last = Math.floor(f / 7);
  const sinceLand = f - last * 7;
  const shake = sinceLand < 3 ? (hash(last) - 0.5) * 18 : 0;
  return (
    <Fill bg={C.black}>
      <AbsoluteFill style={{transform: `translate(${shake}px, ${-shake * 0.6}px)`, alignItems: 'center', justifyContent: 'center'}}>
        {PILE.map((c, i) => {
          const p = ramp(f, i * 7, i * 7 + 6, Easing.bezier(0.2, 0.9, 0.3, 1.15));
          if (f < i * 7) return null;
          return (
            <img key={i} src={asset(c.src)} style={{position: 'absolute', width: c.w, height: c.h, objectFit: 'cover', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', transform: `translate(${c.x}px, ${c.y + (1 - p) * -900}px) rotate(${c.r + (1 - p) * 40}deg) scale(${1 + (1 - p) * 0.4})`}} />
          );
        })}
      </AbsoluteFill>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 11 · La habitación 3D: travelling lento, la lámpara-tomate se enciende en el golpe y entran pegatinas.
// ─────────────────────────────────────────────────────────────
export const RoomShot: React.FC = () => {
  const f = useCurrentFrame();
  const sticker = (src: string, at: number, x: number, y: number, r: number, w: number) => {
    const p = ramp(f, at, at + 6, Easing.bezier(0.34, 1.6, 0.64, 1));
    if (f < at) return null;
    return <img src={asset(src)} style={{position: 'absolute', left: x, top: y, width: w, transform: `rotate(${r}deg) scale(${interpolate(p, [0, 1], [1.6, 1])})`, opacity: Math.min(1, p * 2), boxShadow: '0 20px 40px rgba(0,0,0,0.4)'}} />;
  };
  return (
    <Fill bg="#140d09">
      <Room3D dur={75} lampAt={15} />
      <div style={{position: 'absolute', left: 90, top: 70, fontSize: 130, fontWeight: 700, letterSpacing: '-0.04em', color: C.white, opacity: ramp(f, 15, 18, Easing.linear)}}>the room</div>
      {sticker('room/now-playing-sticker.webp', 45, 1240, 690, -7, 520)}
      {sticker('room/film-poster.webp', 55, 120, 520, 6, 300)}
      <Grain opacity={0.12} />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 13 · Buscador: se escribe "mario diz", salen sugerencias, el cursor rojo de la web va a dizmar.xyz y hace clic.
// Es un buscador genérico (sin marca), sobre el cielo desenfocado.
// ─────────────────────────────────────────────────────────────
const QUERY = 'mario diz';
const SUGGEST = ['dizmar.xyz', 'mario diz portfolio', 'mario diz tomato'];
export const Search: React.FC = () => {
  const f = useCurrentFrame();
  const enter = ramp(f, 0, 8, snap);
  const typed = QUERY.slice(0, Math.max(0, Math.min(QUERY.length, Math.floor((f - 6) / 2.6))));
  const drop = ramp(f, 32, 40);
  // Cursor: entra desde abajo a la derecha y se para sobre la primera sugerencia; crece al pasar por encima (como en la web)
  const move = ramp(f, 40, 58, Easing.bezier(0.6, 0, 0.2, 1));
  const cx = interpolate(move, [0, 1], [1700, 640]);
  const cy = interpolate(move, [0, 1], [1100, 456]);
  const hover = ramp(f, 56, 62, Easing.bezier(0.34, 1.8, 0.64, 1));
  const click = f >= 72 ? ramp(f, 72, 76) : 0;
  const cursorScale = 1 + hover * 1.5 - click * 1.1 + (f >= 76 ? ramp(f, 76, 80) * 1.1 : 0);
  const zoom = interpolate(f, [78, 90], [1, 6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  return (
    <Fill bg={C.sky}>
      <AbsoluteFill style={{filter: 'blur(14px)', transform: 'scale(1.1)'}}>
        <img src={asset('images/sky.webp')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', transform: `scale(${zoom})`, transformOrigin: '640px 456px'}}>
        <div style={{width: 1200, transform: `translateY(${(1 - enter) * 300}px) scale(${0.9 + enter * 0.1})`, opacity: enter, marginTop: -60}}>
          <div style={{background: C.white, borderRadius: drop > 0.01 ? '48px 48px 0 0' : 999, height: 120, display: 'flex', alignItems: 'center', gap: 32, padding: '0 50px', fontSize: 54, color: C.ink, boxShadow: '0 30px 80px rgba(0,0,0,0.18)'}}>
            <svg width={50} height={50} viewBox="0 0 24 24"><circle cx={10} cy={10} r={7} stroke="#888" strokeWidth={2.4} fill="none" /><path d="M15 15 L21 21" stroke="#888" strokeWidth={2.4} strokeLinecap="round" /></svg>
            <span>{typed}<span style={{color: C.ink, opacity: Math.floor(f / 4) % 2 === 0 && f < 40 ? 1 : 0}}>|</span></span>
          </div>
          <div style={{background: C.white, borderRadius: '0 0 48px 48px', overflow: 'hidden', height: drop * 330, boxShadow: '0 30px 80px rgba(0,0,0,0.18)'}}>
            {SUGGEST.map((t, i) => (
              <div key={t} style={{height: 104, display: 'flex', alignItems: 'center', gap: 32, padding: '0 50px', fontSize: 46, color: i === 0 ? C.ink : '#666', background: i === 0 && hover > 0.2 ? '#f3f1ec' : 'transparent', borderTop: '1px solid #eee'}}>
                {i === 0 ? <img src={asset('images/favicon-192.png')} style={{width: 48, height: 48, borderRadius: 8}} /> : <span style={{width: 48, textAlign: 'center', color: '#aaa'}}>↗</span>}
                <span style={{fontWeight: i === 0 ? 700 : 400}}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
      {/* Cursor rojo de la web: punto de 24 px (aquí escalado a 1080p) */}
      <div style={{position: 'absolute', left: cx - 22, top: cy - 22, width: 44, height: 44, borderRadius: 99, background: C.red, transform: `scale(${cursorScale})`, opacity: f > 84 ? 0 : 1}} />
      <AbsoluteFill style={{background: C.white, opacity: ramp(f, 84, 90, Easing.linear)}} />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 14 · Final: la portada. Cielo, el tomate 3D girando con su anillo y la dirección. Sin "now live": el buscador ya lo cuenta.
// ─────────────────────────────────────────────────────────────
export const Home: React.FC = () => {
  const f = useCurrentFrame();
  const flash = 1 - ramp(f, 0, 10, Easing.linear);
  const pop = ramp(f, 0, 14, Easing.bezier(0.34, 1.5, 0.64, 1));
  const spin = f / 70 + (1 - ramp(f, 0, 24)) * -1.2;
  const url = 'dizmar.xyz';
  const shown = Math.floor(interpolate(f, [20, 40], [0, url.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <Fill bg={C.sky}>
      <Push src={asset('images/sky.webp')} frame={f} dur={105} from={1.25} to={1.05} pos="60% 40%" />
      <AbsoluteFill style={{transform: `scale(${0.4 + pop * 0.6})`}}>
        <Tomato3D spin={spin} scale={3.6} y={0.55} />
      </AbsoluteFill>
      <div style={{position: 'absolute', top: 780, display: 'flex', fontSize: 150, fontWeight: 700, letterSpacing: '-0.05em', color: C.white}}>
        {[...url].map((ch, i) => (
          <span key={i} style={{display: 'inline-block', transform: `translateY(${i < shown ? 0 : 60}px)`, opacity: i < shown ? 1 : 0}}>{ch}</span>
        ))}
      </div>
      <Grain opacity={0.14} />
      <AbsoluteFill style={{background: C.white, opacity: flash}} />
    </Fill>
  );
};
