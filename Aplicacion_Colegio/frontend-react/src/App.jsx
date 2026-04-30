import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import GroupedSidebar from './components/GroupedSidebar';
import MobileBottomNav from './components/MobileBottomNav';
import NotificationBell from './components/NotificationBell';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { UpdateListener } from './components/UpdateListener';
import { apiClient } from './lib/apiClient';
import { clearTokens, getRefreshToken } from './lib/authStore';
import { canAccessRoute } from './lib/capabilities';


// Eager load only public/login pages if desired, but we can lazy load them too for max savings
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));

// Lazy load feature modules (Code Splitting)
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const TeacherClassesPage = lazy(() => import('./features/profesor/TeacherClassesPage'));
const TeacherAttendancePage = lazy(() => import('./features/profesor/TeacherAttendancePage'));
const TeacherEvaluationsPage = lazy(() => import('./features/profesor/TeacherEvaluationsPage'));
const TeacherGradesPage = lazy(() => import('./features/profesor/TeacherGradesPage'));
const StudentSelfPage = lazy(() => import('./features/estudiante/StudentSelfPage'));
const AdminStudentsPage = lazy(() => import('./features/admin_escolar/AdminStudentsPage'));
const AdminOverviewPage = lazy(() => import('./features/admin_escolar/AdminOverviewPage'));
const AdminCoursesPage = lazy(() => import('./features/admin_escolar/AdminCoursesPage'));
const AdminClassesPage = lazy(() => import('./features/admin_escolar/AdminClassesPage'));
const AdminEvaluationsPage = lazy(() => import('./features/admin_escolar/AdminEvaluationsPage'));
const AdminGradesPage = lazy(() => import('./features/admin_escolar/AdminGradesPage'));
const AdminAttendancePage = lazy(() => import('./features/admin_escolar/AdminAttendancePage'));
const AdminImportExportPage = lazy(() => import('./features/admin_escolar/AdminImportExportPage'));
const CalendarEventsPage = lazy(() => import('./features/calendar/CalendarEventsPage'));
const MeetingRequestsPage = lazy(() => import('./features/reuniones/MeetingRequestsPage'));
const ActiveSessionsPage = lazy(() => import('./features/security/ActiveSessionsPage'));
const PasswordHistoryPage = lazy(() => import('./features/security/PasswordHistoryPage'));
const AsesorFinancieroPage = lazy(() => import('./features/asesor_financiero/AsesorFinancieroPage'));
const InspectorConvivenciaPage = lazy(() => import('./features/inspector_convivencia/InspectorConvivenciaPage'));
const PsicologoOrientadorPage = lazy(() => import('./features/psicologo_orientador/PsicologoOrientadorPage'));
const SoporteTecnicoPage = lazy(() => import('./features/soporte_tecnico/SoporteTecnicoPage'));
const BibliotecarioDigitalPage = lazy(() => import('./features/bibliotecario_digital/BibliotecarioDigitalPage'));
const CoordinadorAcademicoPage = lazy(() => import('./features/coordinador_academico/CoordinadorAcademicoPage'));
const ApoderadoPage = lazy(() => import('./features/apoderado/ApoderadoPage'));
const PricingPage = lazy(() => import('./features/subscriptions/PricingPage'));
const PaymentHistoryPage = lazy(() => import('./features/subscriptions/PaymentHistoryPage'));
const TransferNoticesPage = lazy(() => import('./features/subscriptions/TransferNoticesPage'));
const LegacyProxy = lazy(() => import('./components/LegacyProxy'));

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
    anyOf: ['STUDENT_EDIT', 'STUDENT_CREATE', 'SYSTEM_CONFIGURE'],
    allOf: ['DASHBOARD_VIEW_SCHOOL'],
  },
  {
    path: 'admin-escolar/cursos',
    to: '/admin-escolar/cursos',
    label: 'Admin Cursos',
    component: AdminCoursesPage,
    anyOf: ['COURSE_EDIT', 'COURSE_CREATE', 'SYSTEM_CONFIGURE'],
    allOf: ['DASHBOARD_VIEW_SCHOOL'],
  },
  {
    path: 'admin-escolar/clases',
    to: '/admin-escolar/clases',
    label: 'Admin Clases',
    component: AdminClassesPage,
    anyOf: ['CLASS_EDIT', 'CLASS_CREATE', 'SYSTEM_CONFIGURE'],
    allOf: ['DASHBOARD_VIEW_SCHOOL'],
  },
  {
    path: 'admin-escolar/evaluaciones',
    to: '/admin-escolar/evaluaciones',
    label: 'Admin Evaluaciones',
    component: AdminEvaluationsPage,
    anyOf: ['GRADE_EDIT', 'GRADE_CREATE', 'SYSTEM_CONFIGURE'],
    allOf: ['DASHBOARD_VIEW_SCHOOL'],
  },
  {
    path: 'admin-escolar/calificaciones',
    to: '/admin-escolar/calificaciones',
    label: 'Admin Calificaciones',
    component: AdminGradesPage,
    anyOf: ['GRADE_EDIT', 'GRADE_CREATE', 'SYSTEM_CONFIGURE'],
    allOf: ['DASHBOARD_VIEW_SCHOOL'],
  },
  {
    path: 'admin-escolar/asistencias',
    to: '/admin-escolar/asistencias',
    label: 'Admin Asistencias',
    component: AdminAttendancePage,
    anyOf: ['CLASS_TAKE_ATTENDANCE', 'SYSTEM_CONFIGURE'],
    allOf: ['DASHBOARD_VIEW_SCHOOL'],
  },
  {
    path: 'admin-escolar/importacion-exportacion',
    to: '/admin-escolar/importacion-exportacion',
    label: 'Admin Import/Export',
    component: AdminImportExportPage,
    anyOf: ['SYSTEM_ADMIN', 'SYSTEM_CONFIGURE'],
    allOf: ['DASHBOARD_VIEW_SCHOOL'],
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
    allowedRoles: ['profesor'],
    anyOf: ['CLASS_VIEW'],
  },
  {
    path: 'profesor/asistencias',
    to: '/profesor/asistencias',
    label: 'Profesor Asistencias',
    component: TeacherAttendancePage,
    allowedRoles: ['profesor'],
    anyOf: ['CLASS_VIEW_ATTENDANCE', 'CLASS_TAKE_ATTENDANCE'],
  },
  {
    path: 'profesor/evaluaciones',
    to: '/profesor/evaluaciones',
    label: 'Profesor Evaluaciones',
    component: TeacherEvaluationsPage,
    allowedRoles: ['profesor'],
    anyOf: ['GRADE_VIEW', 'GRADE_CREATE', 'GRADE_EDIT', 'GRADE_DELETE'],
  },
  {
    path: 'profesor/calificaciones',
    to: '/profesor/calificaciones',
    label: 'Profesor Calificaciones',
    component: TeacherGradesPage,
    allowedRoles: ['profesor'],
    anyOf: ['GRADE_VIEW', 'GRADE_CREATE', 'GRADE_EDIT', 'GRADE_DELETE'],
  },
  {
    path: 'estudiante/panel',
    to: '/estudiante/panel',
    label: 'Estudiante Panel',
    component: StudentSelfPage,
    allowedRoles: ['estudiante'],
    anyOf: ['PORTAL_ESTUDIANTE'],
  },
  {
    path: 'asesor-financiero/panel',
    to: '/asesor-financiero/panel',
    label: 'Asesor Financiero',
    component: AsesorFinancieroPage,
    allowedRoles: ['asesor_financiero'],
    anyOf: ['FINANCE_VIEW', 'FINANCE_MANAGE_PAYMENTS'],
  },
  {
    path: 'inspector-convivencia/panel',
    to: '/inspector-convivencia/panel',
    label: 'Inspector Convivencia',
    component: InspectorConvivenciaPage,
    allowedRoles: ['inspector_convivencia'],
    anyOf: ['DISCIPLINE_VIEW', 'DISCIPLINE_CREATE', 'JUSTIFICATION_APPROVE'],
  },
  {
    path: 'psicologo-orientador/panel',
    to: '/psicologo-orientador/panel',
    label: 'Psicologo Orientador',
    component: PsicologoOrientadorPage,
    allowedRoles: ['psicologo_orientador'],
    anyOf: ['COUNSELING_VIEW', 'COUNSELING_CREATE', 'REFERRAL_CREATE', 'REFERRAL_EDIT'],
  },
  {
    path: 'soporte-tecnico/panel',
    to: '/soporte-tecnico/panel',
    label: 'Soporte Tecnico',
    component: SoporteTecnicoPage,
    allowedRoles: ['soporte_tecnico_escolar'],
    anyOf: ['SUPPORT_VIEW_TICKETS', 'SUPPORT_CREATE_TICKET', 'SUPPORT_RESOLVE_TICKET', 'SUPPORT_RESET_PASSWORD'],
  },
  {
    path: 'bibliotecario-digital/panel',
    to: '/bibliotecario-digital/panel',
    label: 'Bibliotecario Digital',
    component: BibliotecarioDigitalPage,
    allowedRoles: ['bibliotecario_digital'],
    anyOf: ['LIBRARY_VIEW', 'LIBRARY_CREATE', 'LIBRARY_MANAGE_LOANS'],
  },
  {
    path: 'coordinador-academico/panel',
    to: '/coordinador-academico/panel',
    label: 'Coordinador Academico',
    component: CoordinadorAcademicoPage,
    allowedRoles: ['coordinador_academico'],
    anyOf: ['PLANNING_VIEW', 'PLANNING_APPROVE'],
  },
  {
    path: 'apoderado/panel',
    to: '/apoderado/panel',
    label: 'Apoderado Panel',
    component: ApoderadoPage,
    allowedRoles: ['apoderado'],
    anyOf: ['PORTAL_APODERADO'],
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
  {
    path: 'pagos/transferencias',
    to: '/pagos/transferencias',
    label: 'Transferencias',
    component: TransferNoticesPage,
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

function PageLoader() {
  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '1rem', flexDirection: 'column' }}>
      <div style={{ height: '40px', width: '200px', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-md)' }} />
      <div style={{ height: '300px', width: '100%', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-lg)' }} />
    </div>
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
  return (
    <Suspense fallback={<PageLoader />}>
      <Component me={me} />
    </Suspense>
  );
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
    <>
      <UpdateListener />
      <ShellLayout me={me} visibleRoutes={visibleRoutes}>
        <Routes>
          {APP_ROUTES.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<GuardedPage me={me} route={route} />}
            />
          ))}
          <Route path="*" element={<LegacyProxy />} />
        </Routes>
      </ShellLayout>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<div className="page-loader">Cargando aplicación...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AuthorizedApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}
