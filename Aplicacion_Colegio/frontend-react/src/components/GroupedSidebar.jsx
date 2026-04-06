import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

const STORAGE_KEY = 'sidebar-collapsed-groups';

/**
 * Sidebar con agrupación por módulo, estado persistente en localStorage.
 */

const SIDEBAR_GROUPS = [
  {
    label: 'General',
    icon: '📊',
    keys: ['dashboard'],
  },
  {
    label: 'Gestión Escolar',
    icon: '📋',
    keys: [
      'admin-escolar/panel',
      'admin-escolar/estudiantes',
      'admin-escolar/cursos',
      'admin-escolar/clases',
      'admin-escolar/evaluaciones',
      'admin-escolar/calificaciones',
      'admin-escolar/asistencias',
      'admin-escolar/importacion-exportacion',
    ],
  },
  {
    label: 'Profesor',
    icon: '👨‍🏫',
    keys: [
      'profesor/clases',
      'profesor/asistencias',
      'profesor/evaluaciones',
      'profesor/calificaciones',
    ],
  },
  {
    label: 'Estudiante',
    icon: '🎓',
    keys: ['estudiante/panel'],
  },
  {
    label: 'Apoderado',
    icon: '👨‍👩‍👧',
    keys: ['apoderado/panel'],
  },
  {
    label: 'Roles Especiales',
    icon: '🔧',
    keys: [
      'asesor-financiero/panel',
      'inspector-convivencia/panel',
      'psicologo-orientador/panel',
      'soporte-tecnico/panel',
      'bibliotecario-digital/panel',
      'coordinador-academico/panel',
    ],
  },
  {
    label: 'Calendario y Reuniones',
    icon: '📅',
    keys: [
      'calendario/eventos',
      'reuniones/solicitudes',
    ],
  },
  {
    label: 'Seguridad',
    icon: '🔒',
    keys: [
      'seguridad/sesiones-activas',
      'seguridad/password-history',
    ],
  },
];

function loadCollapsed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsed(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export default function GroupedSidebar({ visibleRoutes, me, onLogout }) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  useEffect(() => {
    saveCollapsed(collapsed);
  }, [collapsed]);

  function toggleGroup(label) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  // Build visible routes Set for fast lookup
  const visiblePathSet = new Set(visibleRoutes.map((r) => r.path));

  // Filter groups to only those with visible routes
  const filledGroups = SIDEBAR_GROUPS
    .map((group) => {
      const routes = group.keys
        .filter((key) => visiblePathSet.has(key))
        .map((key) => visibleRoutes.find((r) => r.path === key))
        .filter(Boolean);
      return { ...group, routes };
    })
    .filter((g) => g.routes.length > 0);

  return (
    <aside className="sidebar-grouped">
      <div className="sidebar-header">
        <h1>Colegio SaaS</h1>
        {me ? (
          <p className="sidebar-user">
            {me.full_name}
            <small>{me.role || 'Sin rol'}</small>
          </p>
        ) : (
          <p className="sidebar-user">Cargando...</p>
        )}
      </div>

      <nav className="sidebar-nav">
        {filledGroups.map((group) => {
          const isCollapsed = collapsed[group.label] ?? false;
          // Auto-expand if single item
          const singleItem = group.routes.length === 1;
          const showItems = singleItem || !isCollapsed;

          return (
            <div key={group.label} className="sidebar-group">
              {!singleItem ? (
                <button
                  type="button"
                  className="sidebar-group-toggle"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={showItems}
                >
                  <span className="sidebar-group-icon">{group.icon}</span>
                  <span className="sidebar-group-label">{group.label}</span>
                  <span className={`sidebar-chevron ${showItems ? 'open' : ''}`}>›</span>
                </button>
              ) : null}

              {showItems ? (
                <div className="sidebar-group-items">
                  {group.routes.map((route) => (
                    <NavLink
                      key={route.path}
                      to={route.to}
                      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                      {singleItem ? (
                        <>
                          <span className="sidebar-group-icon">{group.icon}</span>
                          {route.label}
                        </>
                      ) : (
                        route.label
                      )}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <button type="button" className="sidebar-logout" onClick={onLogout}>
        Cerrar Sesión
      </button>
    </aside>
  );
}
