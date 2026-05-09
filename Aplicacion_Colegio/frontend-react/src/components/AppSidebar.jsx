/**
 * AppSidebar.jsx — Sidebar Global Mejorado (Fase 5)
 * 
 * Reemplaza GroupedSidebar con componentes reutilizables
 * Integra SidebarMenu de Fase 5 con navegación dinámica
 * 
 * Uso en App.jsx:
 * <AppSidebar 
 *   visibleRoutes={visibleRoutes}
 *   onLogout={onLogout}
 *   isOpen={sidebarOpen}
 *   onClose={closeSidebar}
 * />
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarMenu } from '@/components/ui';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function AppSidebar({ visibleRoutes = [], onLogout = () => {}, isOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [expandedMenus, setExpandedMenus] = useState({});

  // Mapeo de roles a emojis e iconos
  const roleIcons = {
    admin: '👨‍💼',
    profesor: '👨‍🏫',
    estudiante: '👨‍🎓',
    apoderado: '👨‍👩‍👧',
    asesor_financiero: '💰',
    inspector_convivencia: '🛡️',
    psicologo_orientador: '🧠',
    soporte_tecnico_escolar: '🔧',
    bibliotecario_digital: '📚',
    coordinador_academico: '📋',
  };

  const getRoleDisplay = (role) => {
    const icon = roleIcons[role] || '👤';
    const label = role
      ?.split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Usuario';
    return { icon, label };
  };

  // Agrupar rutas por módulo
  const menuItems = useMemo(() => {
    if (!visibleRoutes.length) return [];

    // Crear estructura de menú jerárquico
    const grouped = {};

    visibleRoutes.forEach((route) => {
      const pathParts = route.path.split('/');
      const module = pathParts[0] || 'dashboard';

      if (!grouped[module]) {
        grouped[module] = {
          id: module,
          label: getModuleLabel(module),
          icon: getModuleIcon(module),
          children: [],
          route,
        };
      }

      // Si hay más niveles, agregarlos como children
      if (pathParts.length > 1) {
        grouped[module].children.push({
          id: route.path,
          label: route.label,
          route,
        });
      }
    });

    return Object.values(grouped).sort((a, b) => {
      // Dashboard primero
      if (a.id === 'dashboard') return -1;
      if (b.id === 'dashboard') return 1;
      return a.label.localeCompare(b.label);
    });
  }, [visibleRoutes]);

  const handleMenuSelect = (itemId) => {
    // Si tiene children y está en el menú, expandir/contraer
    const item = menuItems.find((m) => m.id === itemId);
    if (item?.children?.length > 0) {
      setExpandedMenus((prev) => ({
        ...prev,
        [itemId]: !prev[itemId],
      }));
    } else {
      // Si no tiene children, navegar directamente
      const route = item?.route || visibleRoutes.find((r) => r.path === itemId);
      if (route) {
        navigate(route.to);
        onClose(); // Cerrar sidebar en mobile
      }
    }
  };

  const { icon: roleIcon, label: roleLabel } = getRoleDisplay(user?.role);

  return (
    <aside
      id="primary-sidebar"
      className={`app-sidebar ${isOpen ? 'app-sidebar-visible' : ''}`}
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="sidebar-content">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <h1>🎓 Colegio</h1>
          </div>
        </div>

        {/* Menú Dinámico */}
        <nav className="sidebar-menu">
          <SidebarMenu
            items={menuItems.map((item) => ({
              ...item,
              children: item.children?.map((child) => ({
                id: child.id,
                label: child.label,
              })) || [],
            }))}
            activeItem={null} // Puede actualizarse basado en location.pathname si es necesario
            onSelect={handleMenuSelect}
          />
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{roleIcon}</div>
            <div className="user-info">
              <p className="user-name">{user?.name || 'Usuario'}</p>
              <p className="user-role">{roleLabel}</p>
            </div>
          </div>
          <button onClick={onLogout} className="logout-btn">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
}

/**
 * Funciones auxiliares para obtener labels e iconos de módulos
 */
function getModuleLabel(module) {
  const labels = {
    dashboard: 'Dashboard',
    'admin-escolar': 'Administración',
    profesor: 'Profesor',
    estudiante: 'Estudiante',
    apoderado: 'Apoderado',
    'asesor-financiero': 'Asesor Financiero',
    'inspector-convivencia': 'Inspector',
    'psicologo-orientador': 'Psicólogo',
    'soporte-tecnico': 'Soporte',
    'bibliotecario-digital': 'Biblioteca',
    'coordinador-academico': 'Coordinador',
    calendario: 'Calendario',
    reuniones: 'Reuniones',
    seguridad: 'Seguridad',
    pagos: 'Pagos',
    planes: 'Planes',
  };
  return labels[module] || module.replace(/-/g, ' ').toUpperCase();
}

function getModuleIcon(module) {
  const icons = {
    dashboard: '📊',
    'admin-escolar': '⚙️',
    profesor: '👨‍🏫',
    estudiante: '👨‍🎓',
    apoderado: '👨‍👩‍👧',
    'asesor-financiero': '💰',
    'inspector-convivencia': '🛡️',
    'psicologo-orientador': '🧠',
    'soporte-tecnico': '🔧',
    'bibliotecario-digital': '📚',
    'coordinador-academico': '📋',
    calendario: '📅',
    reuniones: '👥',
    seguridad: '🔐',
    pagos: '💳',
    planes: '📄',
  };
  return icons[module] || '📌';
}

export default AppSidebar;
