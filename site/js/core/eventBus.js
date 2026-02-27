
// Create a small in-memory event bus for page-local communication.
export function createEventBus() {
  const listeners = Object.create(null);
  // On.
  function on(eventName, handler) {
    if (!eventName || typeof handler !== 'function') return null;
    const name = String(eventName);
    (listeners[name] || (listeners[name] = [])).push(handler);
    return () => {
      const list = listeners[name];
      if (!list) return;
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    };
  }
  // Emit.
  function emit(eventName, payload) {
    if (!eventName) return;
    const name = String(eventName);
    const list = listeners[name];
    if (!list || list.length === 0) return;
    const snapshot = list.slice();
    const ev = { type: name, detail: payload || {} };
    snapshot.forEach((fn) => {
      try {
        fn(ev);
      } catch {
        // Ignore individual listener failures.
      }
    });
  }
  // Clear.
  function clear() {
    Object.keys(listeners).forEach((name) => {
      delete listeners[name];
    });
  }
  return { on, emit, clear };
}
