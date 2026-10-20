// Tráiler de lanzamiento de dizmar.xyz · 1920×1080 · 30 fps · 24,5 s.
// Montado sobre una música de 120 BPM: 1 pulso = 15 fotogramas. Todos los cortes caen en pulsos o medios pulsos.
// Para cambiar el orden o la duración de una escena, edita la lista SHOTS (desde, hasta, escena).
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile} from 'remotion';
import '@fontsource/jacquard-24';
import * as S from './scenes';
import {asset} from './lib';

const SHOTS: [number, number, React.FC][] = [
  [0, 30, S.Burst],          // 0,0 s  estallido ❊ sobre rojo
  [30, 60, S.AsciiTomato],   // 1,0 s  tomate en ASCII
  [60, 120, S.TomatoSpin],   // 2,0 s  tomate 3D con el anillo MARIO DIZ, acelerón en cada golpe
  [120, 150, S.SkyDive],     // 4,0 s  el cielo se acerca y se funde en blanco
  [150, 180, S.Creative],    // 5,0 s  "Creative ___"
  [180, 210, S.Pile],        // 6,0 s  los proyectos caen sobre la mesa
  [210, 245, S.LexusFilm],   // 7,0 s  Lexus Electrified
  [245, 255, () => <S.Glitch src={asset('projects/lexus-electrified/kv-building-1600.webp')} dur={10} />],
  [255, 300, S.SoapTitle],   // 8,5 s  Soap & Glory (parón de la música en 10 s)
  [300, 330, S.SoapGrid],
  [330, 345, S.SoapHero],    // 11 s   golpe: vuelve el ritmo
  [345, 390, S.Schweppes],   // 11,5 s Schweppes
  [390, 465, S.RoomShot],    // 13 s   la habitación 3D, la lámpara se enciende en el golpe
  [465, 510, S.About],       // 15,5 s About
  [510, 600, S.Search],      // 17 s   buscador → clic en dizmar.xyz
  [600, 735, S.Home],        // 20 s   final: cielo + tomate + dirección (golpe final en 20 s)
];

export const TOTAL_FRAMES = 735;

export const Trailer: React.FC = () => {
  // Espera a que la letra Jacquard esté cargada antes de pintar ningún fotograma.
  const [handle] = useState(() => delayRender('Cargando Jacquard 24'));
  useEffect(() => {
    document.fonts.load('100px "Jacquard 24"').then(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {SHOTS.map(([from, to, Scene], i) => (
        <Sequence key={i} from={from} durationInFrames={to - from}>
          <Scene />
        </Sequence>
      ))}
      <Audio src={staticFile('music.wav')} />
    </AbsoluteFill>
  );
};
