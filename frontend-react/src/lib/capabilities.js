export function hasCapability(me, capability) {
  if (!me || !Array.isArray(me.capabilities)) {
    return false;
  }
  return me.capabilities.includes(capability);
}

export function hasAnyCapability(me, capabilities = []) {
  return capabilities.some((cap) => hasCapability(me, cap));
}

export function hasAllCapabilities(me, capabilities = []) {
  return capabilities.every((cap) => hasCapability(me, cap));
}

export function isSystemAdmin(me) {
  return hasCapability(me, 'SYSTEM_ADMIN');
}

export function canAccessRoute(me, route) {
  if (!me) {
    return false;
  }

  if (isSystemAdmin(me)) {
    return true;
  }

  if (route.anyOf && route.anyOf.length > 0) {
    return hasAnyCapability(me, route.anyOf);
  }

  if (route.allOf && route.allOf.length > 0) {
    return hasAllCapabilities(me, route.allOf);
  }

  return true;
}
