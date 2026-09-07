import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs tests in jsdom', () => {
    expect(typeof document).toBe('object');
    expect(1 + 1).toBe(2);
  });
});
