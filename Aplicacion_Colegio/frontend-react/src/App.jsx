import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import GroupedSidebar from './components/GroupedSidebar';
import MobileBottomNav from './components/MobileBottomNav';
import NotificationBell from './components/NotificationBell';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import TeacherClassesPage from './features/profesor/TeacherClassesPage';
import TeacherAttendancePage from './features/profesor/TeacherAttendancePage';
import TeacherEvaluationsPage from './features/profesor/TeacherEvaluationsPage';
import TeacherGradesPage from './features/profesor/TeacherGradesPage';
import StudentSelfPage from './features/estudiante/StudentSelfPage';
import AdminStudentsPage from './features/admin_escolar/AdminStudentsPage';
import AdminOverviewPage from './features/admin_escolar/AdminOverviewPage';
import AdminCoursesPage from './features/admin_escolar/AdminCoursesPage';
import AdminClassesPage from './features/admin_escolar/AdminClassesPage';
import AdminEvaluationsPage from './features/admin_escolar/AdminEvaluationsPage';
import AdminGradesPage from './features/admin_escolar/AdminGradesPage';
import AdminAttendancePage from './features/admin_escolar/AdminAttendancePage';
import AdminImportExportPage from './features/admin_escolar/AdminImportExportPage';
import CalendarEventsPage from './features/calendar/CalendarEventsPage';
import MeetingRequestsPage from './features/reuniones/MeetingRequestsPage';
import ActiveSessionsPage from './features/security/ActiveSessionsPage';
import PasswordHistoryPage from './features/security/PasswordHistoryPage';
import AsesorFinancieroPage from './features/asesor_financiero/AsesorFinancieroPage';
import InspectorConvivenciaPage from './features/inspector_convivencia/InspectorConvivenciaPage';
import PsicologoOrientadorPage from './features/psicologo_orientador/PsicologoOrientadorPage';
import SoporteTecnicoPage from './features/soporte_tecnico/SoporteTecnicoPage';
import BibliotecarioDigitalPage from './features/bibliotecario_digital/BibliotecarioDigitalPage';
import CoordinadorAcademicoPage from './features/coordinador_academico/CoordinadorAcademicoPage';
import ApoderadoPage from './features/apoderado/ApoderadoPage';
import PricingPage from './features/subscriptions/PricingPage';
import PaymentHistoryPage from './features/subscriptions/PaymentHistoryPage';
import { apiClient } from './lib/apiClient';
import { clearTokens, getRefreshToken } from './lib/authStore';
import { canAccessRoute } from './lib/capabilities';

const APP_ROUTES = [
  {
    path: 'dashboard',
    to: '/dashboard',
    label: 'Dashboard',
    component: DashboardPage,
    anyOf: ['DASHBOARD_VIEW_SELF', 'DASHBOARD_VIEW_SCHOOL', 'DASHBOARD_VIEW_ANALYTICS'],
  },
  {
    path: 'admin-escolar/panel',
    to: '/admin-escolar/panel',
    label: 'Admin Panel',
    component: AdminOverviewPage,
    anyOf: ['DASHBOARD_VIEW_SCHOOL', 'DASHBOARD_VIEW_ANALYTICS'],
  },
  {
    path: 'admin-escolar/estudiantes',
    to: '/admin-escolar/estudiantes',
    label: 'Admin Estudiantes',
    component: AdminStudentsPage,
    anyOf: ['STUDENT_VIEW', 'STUDENT_EDIT'],
  },
  {
    path: 'admin-escolar/cursos',
    to: '/admin-escolar/cursos',
    label: 'Admin Cursos',
    component: AdminCoursesPage,
    anyOf: ['COURSE_VIEW'],
  },
  {
    path: 'admin-escolar/clases',
    to: '/admin-escolar/clases',
    label: 'Admin Clases',
    component: AdminClassesPage,
    anyOf: ['CLASS_VIEW'],
  },
  {
    path: 'admin-escolar/evaluaciones',
    to: '/admin-escolar/evaluaciones',
    label: 'Admin Evaluaciones',
    component: AdminEvaluationsPage,
    anyOf: ['GRADE_VIEW', 'GRADE_CREATE', 'GRADE_EDIT', 'GRADE_DELETE'],
  },
  {
    path: 'admin-escolar/calificaciones',
    to: '/admin-escolar/calificaciones',
    label: 'Admin Calificaciones',
    component: AdminGradesPage,
    anyOf: ['GRADE_VIEW', 'GRADE_CREATE', 'GRADE_EDIT', 'GRADE_DELETE'],
  },
  {
    path: 'admin-escolar/asistencias',
    to: '/admin-escolar/asistencias',
    label: 'Admin Asistencias',
    component: AdminAttendancePage,
    anyOf: ['CLASS_VIEW_ATTENDANCE', 'CLASS_TAKE_ATTENDANCE'],
  },
  {
    path: 'admin-escolar/importacion-exportacion',
    to: '/admin-escolar/importacion-exportacion',
    label: 'Admin Import/Export',
    component: AdminImportExportPage,
    anyOf: ['SYSTEM_ADMIN', 'SYSTEM_CONFIGURE'],
  },
  {
    path: 'calendario/eventos',
    to: '/calendario/eventos',
    label: 'Calendario Escolar',
    component: CalendarEventsPage,
    anyOf: ['ANNOUNCEMENT_VIEW', 'ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT_EDIT', 'ANNOUNCEMENT_DELETE', 'SYSTEM_ADMIN'],
  },
  {
    path: 'reuniones/solicitudes',
    to: '/reuniones/solicitudes',
    label: 'Solicitudes Reunion',
    component: MeetingRequestsPage,
    anyOf: ['CLASS_VIEW', 'SYSTEM_CONFIGURE', 'SYSTEM_ADMIN'],
  },
  {
    path: 'seguridad/sesiones-activas',
    to: '/seguridad/sesiones-activas',
    label: 'Active Sessions',
    component: ActiveSessionsPage,
    anyOf: ['AUDIT_VIEW', 'SYSTEM_ADMIN'],
  },
  {
    path: 'seguridad/password-history',
    to: '/seguridad/password-history',
    label: 'Password History',
    component: PasswordHistoryPage,
    anyOf: ['AUDIT_VIEW', 'SYSTEM_ADMIN'],
  },
  {
    path: 'profesor/clases',
    to: '/profesor/clases',
    label: 'Profesor Clases',
    component: TeacherClassesPage,
    anyOf: ['CLASS_VIEW'],
  },
  {
    path: 'profesor/asistencias',
    to: '/profesor/asistencias',
    label: 'Profesor Asistencias',
    component: TeacherAttendancePage,
    anyOf: ['CLASS_VIEW_ATTENDANCE', 'CLASS_TAKE_ATTENDANCE'],
  },
  {
    path: 'profesor/evaluaciones',
    to: '/profesor/evaluaciones',
    label: 'Profesor Evaluaciones',
    component: TeacherEvaluationsPage,
    anyOf: ['GRADE_VIEW', 'GRADE_CREATE', 'GRADE_EDIT', 'GRADE_DELETE'],
  },
  {
    path: 'profesor/calificaciones',
    to: '/profesor/calificaciones',
    label: 'Profesor Calificaciones',
    component: TeacherGradesPage,
    anyOf: ['GRADE_VIEW', 'GRADE_CREATE', 'GRADE_EDIT', 'GRADE_DELETE'],
  },
  {
    path: 'estudiante/panel',
    to: '/estudiante/panel',
    label: 'Estudiante Panel',
    component: StudentSelfPage,
    allOf: ['DASHBOARD_VIEW_SELF', 'CLASS_VIEW', 'GRADE_VIEW', 'CLASS_VIEW_ATTENDANCE'],
  },
  {
    path: 'asesor-financiero/panel',
    to: '/asesor-financiero/panel',
    label: 'Asesor Financiero',
    component: AsesorFinancieroPage,
    anyOf: ['FINANCE_VIEW', 'FINANCE_MANAGE_PAYMENTS'],
  },
  {
    path: 'inspector-convivencia/panel',
    to: '/inspector-convivencia/panel',
    label: 'Inspector Convivencia',
    component: InspectorConvivenciaPage,
    anyOf: ['DISCIPLINE_VIEW', 'DISCIPLINE_CREATE', 'JUSTIFICATION_APPROVE'],
  },
  {
    path: 'psicologo-orientador/panel',
    to: '/psicologo-orientador/panel',
    label: 'Psicologo Orientador',
    component: PsicologoOrientadorPage,
    anyOf: ['COUNSELING_VIEW', 'COUNSELING_CREATE', 'REFERRAL_CREATE', 'REFERRAL_EDIT'],
  },
  {
    path: 'soporte-tecnico/panel',
    to: '/soporte-tecnico/panel',
    label: 'Soporte Tecnico',
    component: SoporteTecnicoPage,
    anyOf: ['SUPPORT_VIEW_TICKETS', 'SUPPORT_CREATE_TICKET', 'SUPPORT_RESOLVE_TICKET', 'SUPPORT_RESET_PASSWORD'],
  },
  {
    path: 'bibliotecario-digital/panel',
    to: '/bibliotecario-digital/panel',
    label: 'Bibliotecario Digital',
    component: BibliotecarioDigitalPage,
    anyOf: ['LIBRARY_VIEW', 'LIBRARY_CREATE', 'LIBRARY_MANAGE_LOANS'],
  },
  {
    path: 'coordinador-academico/panel',
    to: '/coordinador-academico/panel',
    label: 'Coordinador Academico',
    component: CoordinadorAcademicoPage,
    anyOf: ['PLANNING_VIEW', 'PLANNING_APPROVE'],
  },
  {
    path: 'apoderado/panel',
    to: '/apoderado/panel',
    label: 'Apoderado Panel',
    component: ApoderadoPage,
    anyOf: ['DASHBOARD_VIEW_SELF', 'STUDENT_VIEW', 'FINANCE_VIEW'],
  },
  {
    path: 'planes',
    to: '/planes',
    label: 'Planes',
    component: PricingPage,
    anyOf: ['FINANCE_MANAGE_PAYMENTS', 'SYSTEM_ADMIN'],
  },
  {
    path: 'pagos/historial',
    to: '/pagos/historial',
    label: 'Historial de Pagos',
    component: PaymentHistoryPage,
    anyOf: ['FINANCE_MANAGE_PAYMENTS', 'SYSTEM_ADMIN'],
  },
];

function AccessDeniedPage() {
  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Acceso Denegado</h2>
          <p>No tienes capabilities para acceder a esta ruta.</p>
        </div>
      </header>
    </section>
  );
}

function ShellLayout({ children, me, visibleRoutes }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  async function onLogout() {
    try {
      const refresh = getRefreshToken();
      if (refresh) {
        await apiClient.post('/api/v1/auth/logout/', { refresh });
      }
    } catch {
      // Logout local debe continuar incluso si falla la revocacion remota.
    } finally {
      clearTokens();
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' sidebar-overlay-visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <GroupedSidebar
        me={me}
        visibleRoutes={visibleRoutes}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <main>
        <div className="main-topbar">
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={sidebarOpen}
            aria-controls="primary-sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <NotificationBell />
        </div>
        {children}
      </main>

      <MobileBottomNav visibleRoutes={visibleRoutes} />
    </div>
  );
}

function GuardedPage({ me, route }) {
  if (!canAccessRoute(me, route)) {
    return <AccessDeniedPage />;
  }

  const Component = route.component;
  return <Component me={me} />;
}

function AuthorizedApp() {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadMe() {
      setLoadingMe(true);
      try {
        const payload = await apiClient.get('/api/v1/me/');
        if (active) {
          setMe(payload);
        }
      } catch {
        if (active) {
          clearTokens();
        }
      } finally {
        if (active) {
          setLoadingMe(false);
        }
      }
    }

    loadMe();
    return () => {
      active = false;
    };
  }, []);

  const visibleRoutes = useMemo(() => {
    if (!me) {
      return [];
    }
    return APP_ROUTES.filter((route) => canAccessRoute(me, route));
  }, [me]);

  if (loadingMe) {
    return (
      <section>
        <p>Cargando sesion...</p>
      </section>
    );
  }

  if (!me) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ShellLayout me={me} visibleRoutes={visibleRoutes}>
      <Routes>
        {APP_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<GuardedPage me={me} route={route} />}
          />
        ))}
        <Route path="*" element={<Navigate to={visibleRoutes[0]?.to || '/dashboard'} replace />} />
      </Routes>
    </ShellLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AuthorizedApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </ToastProvider>
  );
}
