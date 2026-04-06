import { describe, expect, it } from 'vitest';

import {
  canAccessRoute,
  hasAllCapabilities,
  hasAnyCapability,
  hasCapability,
  isSystemAdmin,
} from './capabilities';

describe('capabilities helpers', () => {
  const me = {
    capabilities: ['STUDENT_VIEW', 'GRADE_VIEW', 'CLASS_VIEW_ATTENDANCE'],
  };

  it('hasCapability returns true when capability exists', () => {
    expect(hasCapability(me, 'STUDENT_VIEW')).toBe(true);
  });

  it('hasCapability returns false without capabilities array', () => {
    expect(hasCapability({}, 'STUDENT_VIEW')).toBe(false);
    expect(hasCapability(null, 'STUDENT_VIEW')).toBe(false);
  });

  it('hasAnyCapability works with mixed capability list', () => {
    expect(hasAnyCapability(me, ['GRADE_EDIT', 'GRADE_VIEW'])).toBe(true);
    expect(hasAnyCapability(me, ['GRADE_EDIT', 'GRADE_DELETE'])).toBe(false);
  });

  it('hasAllCapabilities validates full set', () => {
    expect(hasAllCapabilities(me, ['STUDENT_VIEW', 'GRADE_VIEW'])).toBe(true);
    expect(hasAllCapabilities(me, ['STUDENT_VIEW', 'GRADE_EDIT'])).toBe(false);
  });

  it('isSystemAdmin detects override capability', () => {
    expect(isSystemAdmin({ capabilities: ['SYSTEM_ADMIN'] })).toBe(true);
    expect(isSystemAdmin(me)).toBe(false);
  });
});

describe('canAccessRoute', () => {
  const baseUser = { capabilities: ['STUDENT_VIEW', 'GRADE_VIEW'] };

  it('denies when user is missing', () => {
    expect(canAccessRoute(null, { anyOf: ['STUDENT_VIEW'] })).toBe(false);
  });

  it('allows route with anyOf when one capability exists', () => {
    expect(canAccessRoute(baseUser, { anyOf: ['GRADE_EDIT', 'GRADE_VIEW'] })).toBe(true);
  });

  it('denies route with anyOf when no capability exists', () => {
    expect(canAccessRoute(baseUser, { anyOf: ['GRADE_EDIT', 'GRADE_DELETE'] })).toBe(false);
  });

  it('allows route with allOf only when all capabilities exist', () => {
    expect(canAccessRoute(baseUser, { allOf: ['STUDENT_VIEW', 'GRADE_VIEW'] })).toBe(true);
    expect(canAccessRoute(baseUser, { allOf: ['STUDENT_VIEW', 'GRADE_EDIT'] })).toBe(false);
  });

  it('gives SYSTEM_ADMIN full route access', () => {
    const admin = { capabilities: ['SYSTEM_ADMIN'] };
    expect(canAccessRoute(admin, { anyOf: ['NON_EXISTENT_CAP'] })).toBe(true);
    expect(canAccessRoute(admin, { allOf: ['ALSO_MISSING'] })).toBe(true);
  });
});
