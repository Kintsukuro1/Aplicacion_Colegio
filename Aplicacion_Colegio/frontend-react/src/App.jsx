import { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
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
import AsesorFinancieroPage from './features/asesor_financiero/AsesorFinancieroPage';
import InspectorConvivenciaPage from './features/inspector_convivencia/InspectorConvivenciaPage';
import PsicologoOrientadorPage from './features/psicologo_orientador/PsicologoOrientadorPage';
import SoporteTecnicoPage from './features/soporte_tecnico/SoporteTecnicoPage';
import BibliotecarioDigitalPage from './features/bibliotecario_digital/BibliotecarioDigitalPage';
import CoordinadorAcademicoPage from './features/coordinador_academico/CoordinadorAcademicoPage';
import ApoderadoPage from './features/apoderado/ApoderadoPage';
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
      <aside>
        <h1>Colegio React</h1>
        <p>{me ? `${me.full_name} (${me.role || 'Sin rol'})` : 'Cargando usuario...'}</p>
        <nav>
          {visibleRoutes.map((route) => (
            <NavLink key={route.path} to={route.to}>
              {route.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={onLogout}>Cerrar Sesion</button>
      </aside>
      <main>{children}</main>
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
  );
}
