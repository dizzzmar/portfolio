// PÁGINAS DE PROYECTO · vídeos: si el visitante pide menos movimiento, no arrancan solos (puede darle a play).
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.project-video video').forEach((v) => { v.autoplay = false; v.pause(); });
}
