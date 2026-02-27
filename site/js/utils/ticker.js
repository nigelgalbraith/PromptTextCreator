
const DEFAULT_TICK_MS = 2500;

// Send a temporary ticker message when a controller is available.
export function notifyTicker(tickerController, text, ms = DEFAULT_TICK_MS) {
  if (!tickerController || typeof tickerController.showTemporary !== 'function') return;
  if (!text) return;
  tickerController.showTemporary(text, ms);
}
