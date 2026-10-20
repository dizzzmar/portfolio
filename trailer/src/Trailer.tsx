// Tráiler de lanzamiento de dizmar.xyz · 1920×1080 · 30 fps · 30 s.
// Montado sobre una música de 120 BPM: 1 pulso = 15 fotogramas. Todos los cortes caen en pulsos o medios pulsos.
// Para cambiar el orden o la duración de una escena, edita la lista SHOTS (desde, hasta, escena).
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile} from 'remotion';
import '@fontsource/jacquard-24';
import * as S from './scenes';
import {asset} from './lib';

// Ningún plano con imagen o vídeo dura menos de 1 s (salvo el glitch, que es una transición).
const SHOTS: [number, number, React.FC][] = [
  [0, 90, S.AsciiTomato],    // 0 s    tomate ASCII: primer plano → se aleja → se convierte en 3D
  [90, 150, S.TomatoSpin],   // 3 s    golpe: tomate 3D sobre rojo, acelerón en cada pulso
  [150, 195, S.SkyDive],     // 5 s    el cielo se acerca y se funde en blanco
  [195, 255, S.Creative],    // 6,5 s  "Creative ___"
  [255, 300, S.Pile],        // 8,5 s  los proyectos caen sobre la mesa
  [300, 360, S.LexusFilm],   // 10 s   Lexus Electrified
  [360, 375, () => <S.Glitch src={asset('projects/lexus-electrified/kv-building-1600.webp')} dur={15} />],
  [375, 420, S.SoapTitle],   // 12,5 s Soap & Glory
  [420, 450, S.SoapGrid],    // 14 s   parón de la música
  [450, 480, S.SoapHero],    // 15 s   golpe: vuelve el ritmo
  [480, 555, S.Schweppes],   // 16 s   Schweppes
  [555, 645, S.RoomShot],    // 18,5 s la habitación 3D, la lámpara se enciende en el golpe
  [645, 705, S.About],       // 21,5 s About
  [705, 795, S.Search],      // 23,5 s buscador → clic en dizmar.xyz
  [795, 900, S.Home],        // 26,5 s final: cielo + tomate + dirección (golpe final)
];

export const TOTAL_FRAMES = 900;

export const Trailer: React.FC<{music?: string}> = ({music = 'music.wav'}) => {
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
      <Audio src={staticFile(music)} />
    </AbsoluteFill>
  );
};
