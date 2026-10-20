// Tráiler de lanzamiento de dizmar.xyz · 1920×1080 · 30 fps · 24,5 s.
// Montado sobre una música de 120 BPM: 1 pulso = 15 fotogramas. Todos los cortes caen en pulsos o medios pulsos.
// Para cambiar el orden o la duración de una escena, edita la lista SHOTS (desde, hasta, escena).
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import * as S from './scenes';
import {asset} from './lib';

const SHOTS: [number, number, React.FC][] = [
  [0, 30, S.Burst],          // 0,0 s  estallido ❊ sobre rojo
  [30, 67, S.AsciiTomato],   // 1,0 s  tomate en ASCII
  [67, 90, S.IconFlip],      // 2,2 s  icono de app
  [90, 97, S.AppTab],        // 3,0 s  aplicaciones, un corte por pulso
  [97, 105, S.AppCartela],
  [105, 112, S.AppSky],
  [112, 120, S.AppWordmark],
  [120, 150, S.Creative],    // 4,0 s  "Creative ___"
  [150, 187, S.Carousel],    // 5,0 s  los tres proyectos
  [187, 225, S.Browser],     // 6,2 s  se escribe dizmar.xyz
  [225, 245, S.LexusFilm],   // 7,5 s  Lexus Electrified
  [245, 275, S.LexusWord],
  [275, 285, () => <S.Glitch src={asset('projects/lexus-electrified/kv-building-1600.webp')} dur={10} />],
  [285, 315, S.SoapTitle],   // 9,5 s  Soap & Glory (parón de la música en 10 s)
  [315, 330, S.SoapGrid],
  [330, 345, S.SoapHero],    // 11 s   golpe: vuelve el ritmo
  [345, 405, S.Schweppes],   // 11,5 s Schweppes
  [405, 480, S.NavMap],      // 13,5 s WORK — ABOUT — ROOM — CONTACT → Now live
  [480, 540, S.About],       // 16 s   About
  [540, 585, S.Clients],     // 18 s   clientes
  [585, 630, S.Room],        // 19,5 s The room
  [630, 735, S.Outro],       // 21 s   cierre (golpe final en 21,5 s)
];

export const TOTAL_FRAMES = 735;

export const Trailer: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {SHOTS.map(([from, to, Scene], i) => (
      <Sequence key={i} from={from} durationInFrames={to - from}>
        <Scene />
      </Sequence>
    ))}
    <Audio src={staticFile('music.wav')} />
  </AbsoluteFill>
);
