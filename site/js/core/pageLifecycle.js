
// Create a page-scoped lifecycle manager.
export function createPageLifecycle() {
  const destroyFns = [];
  return {
    add(destroyFn) {
      if (typeof destroyFn === 'function') {
        destroyFns.push(destroyFn);
      }
    },
    destroy() {
      for (const fn of destroyFns) {
        try {
          fn();
        } catch {
          // Ignore destroy errors to ensure full cleanup.
        }
      }
      destroyFns.length = 0;
    },
  };
}
