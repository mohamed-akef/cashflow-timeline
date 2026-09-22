import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

/** The site lives under this prefix on GitHub Pages; an unprefixed path silently breaks install. */
const BASE = '/cashflow-timeline/';

describe('installable app files', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));

  it('scopes the app to the Pages sub-path', () => {
    expect(manifest.start_url).toBe(BASE);
    expect(manifest.scope).toBe(BASE);
    expect(manifest.display).toBe('standalone');
  });

  it('lists icons that exist, at the size they claim', () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith(BASE)).toBe(true);
      const file = `public/${icon.src.slice(BASE.length)}`;
      expect(existsSync(file), file).toBe(true);
      // PNG IHDR: width and height are big-endian u32 at bytes 16 and 20.
      const png = readFileSync(file);
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });

  it('is wired into the page head', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain(`href="${BASE}manifest.webmanifest"`);
    expect(html).toContain(`href="${BASE}icon-180.png"`);
    expect(html).toContain('name="theme-color"');
    expect(existsSync('public/sw.js')).toBe(true);
  });
});
