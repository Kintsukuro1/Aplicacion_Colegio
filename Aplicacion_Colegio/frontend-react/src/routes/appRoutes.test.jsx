import { describe, expect, it } from 'vitest';

import { APP_ROUTES } from './appRoutes';

describe('APP_ROUTES', () => {
  it('exposes a stable route contract', () => {
    expect(APP_ROUTES.length).toBeGreaterThan(0);

    const paths = new Set();

    APP_ROUTES.forEach((route) => {
      expect(route.path).toBeTruthy();
      expect(route.to).toBeTruthy();
      expect(route.label).toBeTruthy();
      expect(route.component).toBeTruthy();
      expect(paths.has(route.path)).toBe(false);
      paths.add(route.path);
    });
  });
});