const FPS_THRESHOLD  = 30;   // por debajo → modo ahorro
const SAMPLE_FRAMES  = 60;   // cuántos frames medir antes de decidir
const LOW_PERF_CLASS = 'low-perf';

export function initPerfMonitor() {
  let frameCount = 0;
  let startTime  = performance.now();

  function tick(now) {
    frameCount++;

    if (frameCount >= SAMPLE_FRAMES) {
      const elapsed = now - startTime;
      const fps     = (frameCount / elapsed) * 1000;

      if (fps < FPS_THRESHOLD) {
        document.documentElement.classList.add(LOW_PERF_CLASS);
      }
      return; // dejar de medir
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
