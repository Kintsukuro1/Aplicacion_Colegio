import { NavLink } from 'react-router-dom';

/**
 * Barra de navegación inferior para dispositivos móviles.
 * Muestra las 5 secciones principales con iconos.
 * Solo visible en pantallas ≤ 768px (controlado por CSS).
 */

const BOTTOM_NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: 'Inicio' },
  { to: '/admin-escolar/estudiantes', icon: '👥', label: 'Alumnos' },
  { to: '/admin-escolar/asistencias', icon: '📋', label: 'Asistencia' },
  { to: '/calendario/eventos', icon: '📅', label: 'Calendario' },
  { to: '/admin-escolar/calificaciones', icon: '📝', label: 'Notas' },
];

export default function MobileBottomNav({ visibleRoutes }) {
  // Filter to only show items the user can access
  const visiblePaths = new Set(visibleRoutes.map((r) => r.to));

  const items = BOTTOM_NAV_ITEMS.filter((item) => visiblePaths.has(item.to));

  // If user can't see enough items, add fallback based on visible routes
  if (items.length < 3) {
    const existingTos = new Set(items.map((i) => i.to));
    for (const route of visibleRoutes) {
      if (!existingTos.has(route.to) && items.length < 5) {
        items.push({
          to: route.to,
          icon: '📌',
          label: route.label.split(' ').slice(0, 2).join(' '),
        });
        existingTos.add(route.to);
      }
    }
  }

  if (items.length === 0) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación principal móvil">
      {items.slice(0, 5).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
