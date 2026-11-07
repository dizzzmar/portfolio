// Shared dialog fades. Cancellation resolves false so an old close cannot hide a reopened viewer.
const running = new WeakMap();
export function viewerTiming(element) {
  const style = getComputedStyle(element);
  const duration = parseFloat(style.getPropertyValue('--motion-viewer-time'));
  return {
    duration: Number.isFinite(duration) ? duration : 200,
    easing: style.getPropertyValue('--ease-out').trim() || 'ease-out',
  };
}
export async function fadeViewer(element, visible) {
  const previous = running.get(element);
  const opacity = previous ? getComputedStyle(element).opacity : visible ? 0 : 1;
  previous?.cancel();
  if (!element.animate) return true;
  const animation = element.animate([{ opacity }, { opacity: visible ? 1 : 0 }], viewerTiming(element));
  running.set(element, animation);
  try { await animation.finished; return true; }
  catch { return false; }
  finally { if (running.get(element) === animation) running.delete(element); }
}
