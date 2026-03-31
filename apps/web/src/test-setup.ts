// Vitest global setup for jsdom environment.
// Provides stubs for browser APIs not implemented by jsdom.

// --- window.matchMedia --------------------------------------------------
// jsdom does not implement matchMedia. Provide a functional stub so that
// stores / composables can call it without throwing.
if (typeof window !== 'undefined' && !window.matchMedia) {
  const object = {
    // just mocking empty object
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => object,
      removeListener: () =>object,
      addEventListener: () => object,
      removeEventListener: () => object,
      dispatchEvent: () => false,
    }),
  });
}
