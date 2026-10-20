// Escenas del tráiler. Cada una usa su propio contador de fotogramas (empieza en 0 dentro de su <Sequence>).
// La estructura imita el ritmo del showreel analizado: revelado de marca → aplicaciones en cortes de un pulso → corte seco.
import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Fill, Grain, Label, Push, RiseLetters, asset, easeOut, hash, ramp, scramble, snap} from './lib';
import ASCII from './tomato-ascii.json';

// ─────────────────────────────────────────────────────────────
// 1 · Estallido: un pétalo blanco gira y se clona en 8 (el ❊ de la cartela "Mario Diz"). Fondo rojo marca.
// ─────────────────────────────────────────────────────────────
const Petal: React.FC<{angle: number; scale?: number}> = ({angle, scale = 1}) => (
  <g transform={`rotate(${angle}) scale(${scale})`}>
    {/* Punta de flecha hacia fuera con muesca: lectura gráfica del ❊ */}
    <path d="M0 -18 L-26 -62 L-12 -62 L-12 -150 L12 -150 L12 -62 L26 -62 Z" fill={C.white} />
  </g>
);

export const Burst: React.FC = () => {
  const f = useCurrentFrame();
  const enter = ramp(f, 0, 6, snap);
  const spread = ramp(f, 5, 20, easeOut);
  const punch = interpolate(f, [21, 25, 30], [1, 1.45, 1.38], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: snap});
  const spin = interpolate(f, [0, 20], [-140, 0], {extrapolateRight: 'clamp', easing: easeOut});
  return (
    <Fill bg={C.red}>
      <svg viewBox="-200 -200 400 400" width={620} height={620} style={{transform: `scale(${enter * punch}) rotate(${spin}deg)`}}>
        {Array.from({length: 8}, (_, i) => {
          const delay = i * 0.06;
          const p = Math.max(0, Math.min(1, (spread - delay) / (1 - delay)));
          return <Petal key={i} angle={i * 45 * p} scale={i === 0 ? 1 : p} />;
        })}
      </svg>
      <Grain />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 2 · Tomate ASCII: el tomate de la portada dibujado con letras de "dizmar", con desfase de color y zoom brusco.
// ─────────────────────────────────────────────────────────────
const CHARS = 'dizmar01';
export const AsciiTomato: React.FC = () => {
  const f = useCurrentFrame();
  const reveal = ramp(f, 0, 12, Easing.linear);
  const zoom = f < 22 ? interpolate(f, [0, 22], [0.62, 0.7]) : interpolate(f, [22, 26], [1.25, 1.55], {extrapolateRight: 'clamp', easing: snap});
  const grid = ASCII as number[][];
  const layer = (color: string, dx: number) => (
    <div style={{position: 'absolute', fontFamily: MONO, fontSize: 30, lineHeight: '32px', letterSpacing: 2, color, whiteSpace: 'pre', transform: `translateX(${dx}px)`, mixBlendMode: 'screen', fontWeight: 700}}>
      {grid.map((row, y) => (
        <div key={y}>
          {row
            .map((v, x) => {
              if (v <= 0.04 || hash(x * 31 + y * 17) > reveal * 1.15) return ' ';
              const flick = hash(x * 7 + y * 13 + Math.floor(f / 2) * 3);
              return v > 0.55 ? CHARS[Math.floor(flick * 4)] : CHARS[4 + Math.floor(flick * 4)];
            })
            .join('')}
        </div>
      ))}
    </div>
  );
  const shift = f >= 22 ? 9 : 4;
  return (
    <Fill bg="#000">
      <div style={{position: 'relative', width: 1900, height: 960, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${zoom})`}}>
        {layer('#ff2a00', -shift)}
        {layer('#00c8ff', shift)}
        {layer('rgba(255,255,255,0.85)', 0)}
      </div>
      {/* líneas de escaneo */}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 2px, transparent 2px 5px)'}} />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 3 · Icono de app: tomate en un cuadrado rojo redondeado que gira en 3D.
// ─────────────────────────────────────────────────────────────
export const IconFlip: React.FC = () => {
  const f = useCurrentFrame();
  const turn = interpolate(f, [0, 10, 18, 23], [-90, 0, 0, 180], {extrapolateRight: 'clamp', easing: easeOut});
  const s = interpolate(f, [0, 8], [0.7, 1], {extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.6, 0.64, 1)});
  return (
    <Fill bg={C.paper}>
      <div style={{perspective: 1400}}>
        <div style={{width: 380, height: 380, borderRadius: 96, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotateY(${turn}deg) scale(${s})`, boxShadow: '0 30px 60px rgba(0,0,0,0.12)'}}>
          <img src={asset('images/tomato.webp')} style={{width: 250}} />
        </div>
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 4 · Aplicaciones de la identidad, un corte por pulso (≈ 0,25 s cada una).
// ─────────────────────────────────────────────────────────────
export const AppTab: React.FC = () => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 8], [1.12, 1], {extrapolateRight: 'clamp', easing: easeOut});
  return (
    <Fill bg="#dedcd6">
      <div style={{transform: `scale(${s})`, width: 1500}}>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 8, paddingLeft: 40}}>
          <div style={{background: '#fff', borderRadius: '22px 22px 0 0', padding: '22px 34px', display: 'flex', alignItems: 'center', gap: 20, fontSize: 34, color: C.ink}}>
            <img src={asset('images/favicon-192.png')} style={{width: 46}} />
            Mario Diz — Art director
            <span style={{color: '#999', marginLeft: 30}}>×</span>
          </div>
        </div>
        <div style={{background: '#fff', borderRadius: 22, padding: '26px 36px', fontSize: 36, color: '#777'}}>
          <span style={{color: C.ink}}>dizmar.xyz</span>
        </div>
      </div>
    </Fill>
  );
};

export const AppCartela: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg={C.black}>
      <img src={asset('images/name-cartela.webp')} style={{width: 1500, transform: `scale(${interpolate(f, [0, 8], [0.92, 1], {extrapolateRight: 'clamp', easing: easeOut})})`}} />
    </Fill>
  );
};

export const AppSky: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg={C.sky}>
      <Push src={asset('images/sky.webp')} frame={f} dur={8} from={1.15} />
      <img src={asset('images/tomato.webp')} style={{position: 'absolute', width: 380, transform: `translateY(${interpolate(f, [0, 8], [40, 0], {extrapolateRight: 'clamp', easing: easeOut})}px)`}} />
      <Grain opacity={0.12} />
    </Fill>
  );
};

export const AppWordmark: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg={C.paper}>
      <div style={{fontSize: 300, fontWeight: 700, letterSpacing: '-0.06em', color: C.ink, display: 'flex', alignItems: 'baseline'}}>
        dizmar
        <span style={{width: 70, height: 70, borderRadius: 99, background: C.red, display: 'inline-block', marginLeft: 12, transform: `scale(${ramp(f, 1, 6, Easing.bezier(0.34, 1.8, 0.64, 1))})`}} />
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 5 · "Creative ___": la frase de la portada, con la palabra que se descifra cada medio pulso.
// ─────────────────────────────────────────────────────────────
const WORDS = ['Director', 'Coder', 'Maximalist', 'Storyteller', '3D Artist', 'Designer'];
export const Creative: React.FC = () => {
  const f = useCurrentFrame();
  const per = 5;
  const i = Math.min(WORDS.length - 1, Math.floor(f / per));
  const word = scramble(WORDS[i], f, i * per, i === WORDS.length - 1 ? 6 : 3, i);
  return (
    <Fill bg={C.white}>
      <div style={{fontSize: 190, fontWeight: 700, letterSpacing: '-0.05em', color: C.ink, lineHeight: 1.05, width: 1500}}>
        <RiseLetters text="Creative" frame={f} start={0} stagger={0.6} dur={6} />
        <div style={{color: C.red}}>{word}</div>
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 6 · Carrusel: los tres proyectos como carteles verticales que pasan en fila.
// ─────────────────────────────────────────────────────────────
const CARDS = [
  {src: 'projects/lexus-electrified/poised-1080.webp', title: 'Lexus Electrified', year: '2025', pos: 'center'},
  {src: 'projects/soap-and-glory-vanilla/sg2-1600.webp', title: 'Soap & Glory', year: '2026', pos: 'center'},
  {src: 'projects/schweppes/frame-2-1600.webp', title: 'Schweppes', year: '2026', pos: '30% center'},
];
export const Carousel: React.FC = () => {
  const f = useCurrentFrame();
  const pan = interpolate(f, [0, 37], [380, -120], {easing: Easing.bezier(0.5, 0, 0.2, 1)});
  const zoomOut = interpolate(f, [24, 37], [1, 0.86], {extrapolateLeft: 'clamp', easing: easeOut});
  return (
    <Fill bg={C.black}>
      <div style={{display: 'flex', gap: 48, transform: `translateX(${pan}px) scale(${zoomOut})`}}>
        {CARDS.map((c, i) => {
          const p = ramp(f, i * 4, i * 4 + 12, snap);
          return (
            <div key={i} style={{transform: `translateY(${(1 - p) * 700}px)`}}>
              <div style={{width: 470, height: 760, overflow: 'hidden'}}>
                <img src={asset(c.src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: c.pos}} />
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 20}}>
                <Label>{c.title}</Label>
                <Label color="rgba(255,255,255,0.6)">{c.year}</Label>
              </div>
            </div>
          );
        })}
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 7 · Navegador: se escribe la dirección, carga y aparece la descripción (de gris a negro).
// ─────────────────────────────────────────────────────────────
const URL = 'www.dizmar.xyz';
const LINE = 'Mario Diz — art direction & visual design, Madrid.';
export const Browser: React.FC = () => {
  const f = useCurrentFrame();
  const typed = URL.slice(0, Math.floor(interpolate(f, [0, 14], [0, URL.length], {extrapolateRight: 'clamp'})));
  const load = ramp(f, 16, 26, Easing.bezier(0.7, 0, 0.3, 1));
  const caret = Math.floor(f / 4) % 2 === 0 && f < 16;
  const words = LINE.split(' ');
  return (
    <Fill bg={C.white} style={{justifyContent: 'flex-start', alignItems: 'flex-start', padding: '200px 210px'}}>
      <div style={{position: 'absolute', top: 0, left: 0, height: 8, width: `${load * 100}%`, background: C.red, opacity: f > 30 ? 0 : 1}} />
      <div style={{display: 'flex', alignItems: 'center', gap: 30}}>
        <img src={asset('images/favicon-192.png')} style={{width: 74, height: 74, borderRadius: 8}} />
        <div style={{fontSize: 74, color: f < 16 ? '#9a9a9a' : C.ink, letterSpacing: '-0.02em'}}>
          {f < 16 ? typed : URL}
          <span style={{opacity: caret ? 1 : 0, color: C.red}}>|</span>
        </div>
      </div>
      <div style={{marginTop: 110, fontSize: 96, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.08, maxWidth: 1450, color: C.ink}}>
        {words.map((w, i) => {
          const p = ramp(f, 18 + i * 1.6, 24 + i * 1.6);
          return (
            <span key={i} style={{opacity: 0.12 + p * 0.88, filter: `blur(${(1 - p) * 6}px)`}}>
              {w}{' '}
            </span>
          );
        })}
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 8 · Lexus Electrified: el film, una palabra que se construye sobre el key visual y salida con glitch por franjas.
// ─────────────────────────────────────────────────────────────
export const LexusFilm: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg="#000">
      <AbsoluteFill style={{transform: `scale(${interpolate(f, [0, 22], [1.1, 1.02])})`}}>
        <OffthreadVideo src={asset('projects/lexus-electrified/film.mp4')} startFrom={128} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 90, bottom: 80, color: C.white}}>
        <RiseLetters text="Lexus Electrified" frame={f} start={2} stagger={0.7} dur={8} style={{fontSize: 120, fontWeight: 700, letterSpacing: '-0.04em'}} />
        <Label style={{opacity: ramp(f, 10, 16), marginTop: 10}}>Audiovisual · Lexus Singapore · 2025</Label>
      </div>
    </Fill>
  );
};

export const LexusWord: React.FC = () => {
  const f = useCurrentFrame();
  const src = f < 15 ? 'projects/lexus-electrified/kv-lake-1600.webp' : 'projects/lexus-electrified/kv-building-1600.webp';
  return (
    <Fill bg="#000">
      <Push src={asset(src)} frame={f % 15} dur={15} from={1.12} />
      <AbsoluteFill style={{background: 'rgba(0,0,0,0.25)'}} />
      <div style={{position: 'relative', color: C.white, fontSize: 200, fontWeight: 700, letterSpacing: '-0.05em'}}>
        {f < 15 ? <RiseLetters text="ELECTRIFIED." frame={f} start={0} stagger={0.8} dur={7} /> : <RiseLetters text="SINGAPORE." frame={f} start={15} stagger={0.8} dur={7} />}
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
const CARAMEL = '#9a4f1c';
export const SoapTitle: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg={PINK}>
      <div style={{display: 'flex', fontSize: 230, fontWeight: 700, letterSpacing: '-0.05em', color: CARAMEL}}>
        {[...'Vanillalicious'].map((ch, i) => {
          const p = ramp(f, i * 1.1, i * 1.1 + 10, Easing.bezier(0.34, 1.7, 0.64, 1));
          return (
            <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * -500}px) rotate(${(1 - p) * (i % 2 ? 20 : -20)}deg)`, opacity: p > 0 ? 1 : 0}}>
              {ch}
            </span>
          );
        })}
      </div>
      <Label color={CARAMEL} style={{position: 'absolute', bottom: 120, opacity: ramp(f, 16, 24)}}>Soap & Glory · Key visuals · 2026</Label>
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
const GOLD = '#f2c94c';
export const Schweppes: React.FC = () => {
  const f = useCurrentFrame();
  const bars = interpolate(f, [0, 10, 50, 60], [540, 138, 138, 540], {extrapolateRight: 'clamp', easing: easeOut});
  const second = f >= 30;
  return (
    <Fill bg="#000">
      <AbsoluteFill>
        <OffthreadVideo src={asset('projects/schweppes/film.mp4')} startFrom={second ? 420 - 30 : 60} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 90, bottom: 30, display: 'flex', alignItems: 'baseline', gap: 40, opacity: f < 52 ? 1 : 0}}>
        <div style={{fontFamily: MONO, fontSize: 64, fontWeight: 700, color: GOLD, letterSpacing: '0.04em'}}>{scramble('SCHWEPPES', f, 6, 12, 3)}</div>
        <Label color="rgba(255,255,255,0.7)" style={{opacity: ramp(f, 14, 20)}}>AI film · 2026</Label>
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 11 · Mapa de la web: icono que se dibuja, WORK cae letra a letra; luego las secciones unidas por una línea en escalón.
// ─────────────────────────────────────────────────────────────
export const NavMap: React.FC = () => {
  const f = useCurrentFrame();
  // Parte A (0–20): icono circular que se dibuja + WORK
  if (f < 20) {
    const draw = ramp(f, 0, 12);
    return (
      <Fill bg={C.white}>
        <svg width={220} height={220} viewBox="-60 -60 120 120" style={{marginBottom: 40}}>
          <circle r={50} fill="none" stroke={C.ink} strokeWidth={6} strokeDasharray={314} strokeDashoffset={314 * (1 - draw)} transform="rotate(-90)" />
          <path d="M-12 12 L14 -14 M-2 -14 L14 -14 L14 2" stroke={C.red} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{opacity: ramp(f, 8, 12)}} />
        </svg>
        <RiseLetters text="WORK" frame={f} start={4} stagger={1.5} dur={8} style={{fontSize: 110, fontWeight: 700, letterSpacing: '0.02em', color: C.ink}} />
      </Fill>
    );
  }
  // Parte B (20–75): secciones unidas por un trazo en escalón que se dibuja; al final, check + NOW LIVE
  const g = f - 20;
  const items = [
    {t: 'WORK', x: 100, y: 540},
    {t: 'ABOUT', x: 620, y: 400},
    {t: 'ROOM', x: 1130, y: 660},
    {t: 'CONTACT', x: 1500, y: 490},
  ];
  const path = 'M 20 540 L 80 540 M 350 540 L 470 540 L 470 400 L 600 400 M 920 400 L 1010 400 L 1010 660 L 1110 660 M 1400 660 L 1440 660 L 1440 490 L 1480 490';
  const draw = ramp(g, 0, 30, Easing.bezier(0.6, 0, 0.3, 1));
  const shift = interpolate(g, [30, 40], [0, -2000], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.7, 0, 0.2, 1)});
  const live = ramp(g, 38, 48, Easing.bezier(0.34, 1.5, 0.64, 1));
  return (
    <Fill bg={C.white}>
      <AbsoluteFill style={{transform: `translateX(${shift}px)`}}>
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          <path d={path} stroke={C.ink} strokeWidth={6} fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        </svg>
        {items.map((it, i) => {
          const p = ramp(g, i * 7, i * 7 + 8, Easing.bezier(0.34, 1.6, 0.64, 1));
          return (
            <div key={it.t} style={{position: 'absolute', left: it.x, top: it.y - 50, fontSize: 80, lineHeight: 1, fontWeight: 700, color: C.ink, transform: `translateY(${(1 - p) * 60}px)`, opacity: p}}>
              {it.t}
            </div>
          );
        })}
      </AbsoluteFill>
      <div style={{display: 'flex', alignItems: 'center', gap: 50, transform: `scale(${live})`, opacity: live}}>
        <svg width={170} height={170} viewBox="-60 -60 120 120">
          <circle r={52} fill={C.red} />
          <path d="M-22 2 L-6 18 L24 -14" stroke={C.white} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ramp(g, 42, 50)} />
        </svg>
        <div style={{fontSize: 160, fontWeight: 700, letterSpacing: '-0.04em', color: C.ink}}>Now live</div>
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 12 · About: la foto en un marco rojo pequeño hace zoom a pantalla completa y entra la cartela con el nombre.
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
        <img src={asset('images/name-cartela.webp')} style={{width: 1100, opacity: ramp(f, 24, 28, Easing.linear), transform: `scale(${interpolate(ramp(f, 24, 34), [0, 1], [1.25, 1])})`}} />
        <Label style={{opacity: ramp(f, 32, 40)}}>Art director & visual designer · Madrid</Label>
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 13 · Clientes: rejilla de logos que entran uno a uno (como la rejilla de variaciones de letra del original).
// ─────────────────────────────────────────────────────────────
const LOGOS = ['ogilvy.svg', 'wpp.svg', 'lexus.svg', 'toyota.svg', 'heineken.svg', 'verizon.svg', 'coca-cola-company.svg', 'nestle.png'];
export const Clients: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Fill bg={C.paper}>
      <Label color="#777" style={{position: 'absolute', top: 120}}>Selected clients</Label>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 340px)', gridAutoRows: 220, gap: 30, marginTop: 60}}>
        {LOGOS.map((l, i) => {
          const p = ramp(f, i * 2, i * 2 + 7, Easing.bezier(0.34, 1.6, 0.64, 1));
          return (
            <div key={l} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${p})`, opacity: p}}>
              <img src={asset(`brands/${l}`)} style={{maxWidth: 240, maxHeight: 110, filter: 'grayscale(1) brightness(0)'}} />
            </div>
          );
        })}
      </div>
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 14 · The room: tres cortes sobre el rojo de About (disco, película, pegatina).
// ─────────────────────────────────────────────────────────────
export const Room: React.FC = () => {
  const f = useCurrentFrame();
  const shots = [
    {src: 'room/vinyl-cover.webp', label: 'Now playing', w: 620},
    {src: 'room/film-poster.webp', label: 'Last watched', w: 440},
    {src: 'room/now-playing-sticker.webp', label: 'See the room →', w: 620},
  ];
  const i = Math.min(2, Math.floor(f / 15));
  const lf = f - i * 15;
  const s = shots[i];
  return (
    <Fill bg={C.aboutRed}>
      <img src={asset(s.src)} style={{width: s.w, transform: `rotate(${interpolate(lf, [0, 15], [-6, 2])}deg) scale(${interpolate(lf, [0, 6], [1.15, 1], {extrapolateRight: 'clamp', easing: easeOut})})`, boxShadow: '0 30px 60px rgba(0,0,0,0.25)'}} />
      <Label style={{position: 'absolute', bottom: 110}}>{s.label}</Label>
      <Label style={{position: 'absolute', top: 110}}>The room</Label>
      <Grain opacity={0.1} />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 15 · Cierre: un círculo se dibuja, se cierra en el tomate con el golpe final y se escribe la dirección.
// ─────────────────────────────────────────────────────────────
export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const draw = ramp(f, 0, 14, Easing.bezier(0.6, 0, 0.3, 1));
  const pop = ramp(f, 15, 24, Easing.bezier(0.34, 1.7, 0.64, 1));
  const ring = interpolate(f, [13, 17], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const url = 'dizmar.xyz';
  const typed = url.slice(0, Math.floor(interpolate(f, [30, 46], [0, url.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  const up = ramp(f, 28, 40);
  return (
    <Fill bg={C.red}>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.18), transparent 60%)'}} />
      <div style={{position: 'relative', transform: `translateY(${-up * 120}px)`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <svg width={360} height={360} viewBox="-60 -60 120 120" style={{position: 'absolute', opacity: ring}}>
          <circle r={50} fill="none" stroke={C.white} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} transform="rotate(-90)" />
        </svg>
        <img src={asset('images/tomato.webp')} style={{width: 330, transform: `scale(${pop}) rotate(${(1 - pop) * -30}deg)`}} />
      </div>
      <div style={{position: 'absolute', top: 690, fontSize: 150, fontWeight: 700, letterSpacing: '-0.05em', color: C.white, height: 170}}>
        {typed}
        <span style={{opacity: f > 30 && Math.floor(f / 5) % 2 === 0 ? 1 : 0}}>_</span>
      </div>
      <Label style={{position: 'absolute', top: 900, opacity: ramp(f, 50, 60)}}>Mario Diz · Portfolio · Now live</Label>
      <Grain opacity={0.14} />
    </Fill>
  );
};

