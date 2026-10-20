// Colores, letra y ayudas comunes del tráiler. Los valores salen de DESIGN.md.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile} from 'remotion';

export const C = {
  red: '#f83d0c',
  aboutRed: '#f04a30',
  black: '#0c0c0b',
  white: '#ffffff',
  ink: '#111111',
  paper: '#fbfaf6',
  sky: '#4f8fd8',
};

// Helvetica Neue en Apple, Arial en el resto (en el render de Linux cae en Liberation Sans, misma métrica que Arial).
export const FONT = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';
export const MONO = '"JetBrains Mono", "Courier New", monospace';

export const asset = (path: string) => staticFile(`assets/${path}`);

// Curva de salida de la web (cubic-bezier(0.23, 1, 0.32, 1)) y una más brusca para los golpes.
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
export const snap = Easing.bezier(0.16, 1, 0.3, 1);

export const ramp = (frame: number, from: number, to: number, ease = easeOut) =>
  interpolate(frame, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

// Ruido determinista: el mismo fotograma siempre da el mismo resultado (necesario para renderizar en paralelo).
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const Fill: React.FC<{bg: string; children?: React.ReactNode; style?: React.CSSProperties}> = ({bg, children, style}) => (
  <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontFamily: FONT, ...style}}>
    {children}
  </AbsoluteFill>
);

// Grano de papel de la web por encima de todo, muy suave.
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.08}) => (
  <AbsoluteFill style={{backgroundImage: `url(${asset('images/grain.png')})`, opacity, mixBlendMode: 'overlay', pointerEvents: 'none'}} />
);

// Etiqueta pequeña en mayúsculas (como --fs-xs con --tracking-label), escalada para 1080p.
export const Label: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({children, color = C.white, style}) => (
  <div style={{fontSize: 26, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, color, ...style}}>{children}</div>
);

// Texto que entra letra a letra desde abajo, con máscara y un pequeño rebote.
export const RiseLetters: React.FC<{
  text: string; frame: number; start: number; stagger?: number; dur?: number; style?: React.CSSProperties;
}> = ({text, frame, start, stagger = 1.2, dur = 9, style}) => (
  <div style={{display: 'flex', overflow: 'hidden', lineHeight: 1.05, paddingBottom: '0.08em', ...style}}>
    {[...text].map((ch, i) => {
      const p = ramp(frame, start + i * stagger, start + i * stagger + dur, Easing.bezier(0.34, 1.4, 0.64, 1));
      return (
        <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`, whiteSpace: 'pre'}}>
          {ch}
        </span>
      );
    })}
  </div>
);

// Palabra que se descifra de izquierda a derecha (como "Creative ___" de la portada).
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
export const scramble = (text: string, frame: number, start: number, dur: number, seed = 0) => {
  const p = Math.max(0, Math.min(1, (frame - start) / dur));
  return [...text]
    .map((ch, i) => {
      if (ch === ' ') return ' ';
      if (i < p * text.length) return ch;
      return GLYPHS[Math.floor(hash(frame * 13 + i * 7 + seed) * GLYPHS.length)];
    })
    .join('');
};

// Vídeo o imagen a sangre que se "empuja" despacio (Ken Burns corto).
export const Push: React.FC<{src: string; frame: number; dur: number; from?: number; to?: number; pos?: string}> = ({
  src, frame, dur, from = 1.08, to = 1.0, pos = 'center',
}) => {
  const s = interpolate(frame, [0, dur], [from, to], {extrapolateRight: 'clamp', easing: easeOut});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${s})`}} />
    </AbsoluteFill>
  );
};
