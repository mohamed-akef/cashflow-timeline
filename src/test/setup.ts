import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest.config.ts runs with `globals: false`, so @testing-library/react's
// built-in `afterEach(cleanup)` auto-registration never fires (it only wires
// up when it finds a global `afterEach`). Without this, a test file that
// calls `render()` more than once — even across separate `it` blocks —
// accumulates DOM nodes from earlier tests and queries like `getByTestId`
// start matching multiple stale elements.
afterEach(cleanup);
