import {Composition} from 'remotion';
import {Trailer, TOTAL_FRAMES} from './Trailer';

// TrailerFast: los mismos fotogramas reproducidos a 33 fps → todo un 10 % más rápido (≈ 27 s), con la música a 132 BPM.
export const Root = () => (
  <>
    <Composition id="Trailer" component={Trailer} durationInFrames={TOTAL_FRAMES} fps={30} width={1920} height={1080} defaultProps={{music: 'music.wav'}} />
    <Composition id="TrailerFast" component={Trailer} durationInFrames={TOTAL_FRAMES} fps={33} width={1920} height={1080} defaultProps={{music: 'music-fast.wav'}} />
  </>
);
