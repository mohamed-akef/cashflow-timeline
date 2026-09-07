import '@testing-library/jest-dom/vitest';

// Node 26 exposes an experimental `globalThis.localStorage` getter that shadows
// jsdom's and returns undefined (with an ExperimentalWarning). Vitest's jsdom
// environment also aliases `window` to `globalThis` itself (`global.window =
// global`), so `window.localStorage` resolves to that same shadowed getter,
// not jsdom's real implementation — reading it doesn't help. The actual jsdom
// Storage instance lives on the environment handle vitest stashes at
// `globalThis.jsdom`; pull it from there so the store singleton and component
// tests see a real, working Storage instead of Node's stub.
const jsdomWindow = (globalThis as { jsdom?: { window: { localStorage: Storage } } }).jsdom?.window;

Object.defineProperty(globalThis, 'localStorage', {
  value: jsdomWindow?.localStorage,
  configurable: true,
  writable: true,
});
