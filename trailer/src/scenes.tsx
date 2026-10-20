// Escenas del tráiler. Cada una usa su propio contador de fotogramas (empieza en 0 dentro de su <Sequence>).
// La estructura imita el ritmo del showreel analizado: revelado de marca → aplicaciones en cortes de un pulso → corte seco.
import React from 'react';
import {AbsoluteFill, Easing, OffthreadVideo, interpolate, useCurrentFrame} from 'remotion';
import {C, JACQUARD, MONO, Fill, Grain, Push, RiseLetters, asset, easeOut, hash, ramp, scramble, snap} from './lib';
import ASCII from './tomato-ascii.json';
import {Room3D, Tomato3D} from './three-d';

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
// 5 · "Creative ___": la frase de la portada, con la palabra que se descifra cada medio pulso.
// ─────────────────────────────────────────────────────────────
const WORDS = ['Director', 'Coder', 'Maximalist', 'Storyteller', '3D Artist', 'Designer'];
export const Creative: React.FC = () => {
  const f = useCurrentFrame();
  const per = 5;
  const i = Math.min(WORDS.length - 1, Math.floor(f / per));
  const word = scramble(WORDS[i], f, i * per, i === WORDS.length - 1 ? 6 : 3, i);
  return (
    <Fill bg={i % 2 ? C.paper : C.white}>
      <div style={{fontSize: 210, fontWeight: 700, letterSpacing: '-0.05em', color: C.ink, lineHeight: 1.0, width: 1600}}>
        <RiseLetters text="Creative" frame={f} start={0} stagger={0.6} dur={6} />
        <div style={{color: C.red, transform: `rotate(${(hash(i + 3) - 0.5) * 8}deg) scale(${1 + ((f - i * per) < 2 ? 0.08 : 0)})`, transformOrigin: 'left center', fontFamily: i === 2 || i === 5 ? JACQUARD : undefined, fontWeight: i === 2 || i === 5 ? 400 : 700, fontSize: i === 2 || i === 5 ? 250 : undefined}}>{word}</div>
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
  const bars = interpolate(f, [0, 8, 37, 45], [540, 138, 138, 540], {extrapolateRight: 'clamp', easing: easeOut});
  const second = f >= 22;
  return (
    <Fill bg="#000">
      <AbsoluteFill>
        <OffthreadVideo src={asset('projects/schweppes/film.mp4')} startFrom={second ? 420 - 22 : 60} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: bars, background: '#000'}} />
      <div style={{position: 'absolute', left: 90, bottom: 30, display: 'flex', alignItems: 'baseline', gap: 40, opacity: f < 38 ? 1 : 0}}>
        <div style={{fontFamily: MONO, fontSize: 64, fontWeight: 700, color: GOLD, letterSpacing: '0.04em'}}>{scramble('SCHWEPPES', f, 6, 12, 3)}</div>
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
// 3 · El tomate 3D de la portada con su anillo "MARIO DIZ". Da un acelerón en cada golpe y al final sale volando hacia arriba.
// ─────────────────────────────────────────────────────────────
export const TomatoSpin: React.FC = () => {
  const f = useCurrentFrame();
  // Giro base + medio giro extra muy rápido en cada pulso (15 fotogramas)
  const beat = Math.floor(f / 15);
  const inBeat = ramp(f % 15, 0, 7, snap);
  const spin = f / 90 + (beat + inBeat) * 0.5;
  const punch = 1 + (1 - ramp(f % 15, 0, 6)) * 0.12;
  const fly = ramp(f, 46, 60, Easing.in(Easing.cubic));
  const marquee = (dir: number, top: number) => (
    <div style={{position: 'absolute', top, whiteSpace: 'nowrap', fontFamily: JACQUARD, fontSize: 260, lineHeight: 1, color: 'rgba(255,255,255,0.16)', transform: `translateX(${dir * (f * 22) - (dir > 0 ? 2400 : 0)}px)`}}>
      dizmar dizmar dizmar dizmar dizmar dizmar
    </div>
  );
  return (
    <Fill bg={C.red}>
      {marquee(1, 60)}
      {marquee(-1, 760)}
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
      <div style={{position: 'absolute', fontFamily: JACQUARD, fontSize: 200, color: C.white, transform: `scale(${1 + f * 0.04})`, opacity: 1 - white}}>dizmar.xyz</div>
      <AbsoluteFill style={{background: C.white, opacity: white}} />
      <Grain opacity={0.14} />
    </Fill>
  );
};

// ─────────────────────────────────────────────────────────────
// 6 · Montón de proyectos: las imágenes caen sobre la mesa una por pulso medio, giradas, con sacudida al aterrizar.
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
  const last = Math.floor(f / 5);
  const sinceLand = f - last * 5;
  const shake = sinceLand < 3 ? (hash(last) - 0.5) * 18 : 0;
  return (
    <Fill bg={C.black}>
      <AbsoluteFill style={{transform: `translate(${shake}px, ${-shake * 0.6}px)`, alignItems: 'center', justifyContent: 'center'}}>
        {PILE.map((c, i) => {
          const p = ramp(f, i * 5, i * 5 + 5, Easing.bezier(0.2, 0.9, 0.3, 1.15));
          if (f < i * 5) return null;
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
      <div style={{position: 'absolute', left: 90, top: 70, fontFamily: JACQUARD, fontSize: 170, color: '#ffd9b8', opacity: ramp(f, 15, 18, Easing.linear)}}>the room</div>
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
            <span>{typed}<span style={{color: C.red, opacity: Math.floor(f / 4) % 2 === 0 && f < 40 ? 1 : 0}}>|</span></span>
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
