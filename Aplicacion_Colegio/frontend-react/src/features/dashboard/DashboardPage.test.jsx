import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, getMock } from '../../test/test-utils';

import DashboardPage from './DashboardPage';

const fetchMock = vi.fn();

const demoPanelPayload = {
  counts: { tareas: 0, materiales: 0, bloques: 0 },
  tareas: [],
  materiales: [],
  horario: {},
};

function createDashboardPayload(scope) {
  if (scope === 'school') {
    return {
      contract_version: '1.0.0',
      scope: 'school',
      generated_at: '2026-03-07',
      available_scopes: ['school', 'self'],
      sections: {
        self: null,
        school: {
          today: '2026-03-07',
          students: 120,
          teachers: 18,
        },
        analytics: null,
      },
      charts: {},
    };
  }

  if (scope === 'analytics') {
    return {
      contract_version: '1.0.0',
      scope: 'analytics',
      generated_at: '2026-03-07',
      available_scopes: ['analytics'],
      sections: {
        self: null,
        school: null,
        analytics: { attendance_rate_today: 91 },
      },
      charts: {},
    };
  }

  if (scope === 'self') {
    return {
      contract_version: '1.0.0',
      scope: 'self',
      generated_at: '2026-03-07',
      available_scopes: ['self', 'school'],
      sections: {
        self: { my_classes: 2 },
        school: null,
        analytics: null,
      },
      charts: {},
    };
  }

  return {
    contract_version: '1.0.0',
    scope: 'auto',
    generated_at: '2026-03-07',
    available_scopes: ['auto', 'school', 'self'],
    sections: {
      self: null,
      school: {
        today: '2026-03-07',
        students: 120,
        teachers: 18,
      },
      analytics: null,
    },
    charts: {},
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(async (url) => {
      if (String(url).includes('/api/v1/dashboard/executive/?scope=analytics')) {
        return {
          ok: true,
          json: async () => ({
            scope: 'analytics',
            generated_at: '2026-03-07',
            kpis: {
              total_students: 342,
              total_teachers: 28,
              attendance_rate_today: 94.2,
              attendance_today_present: 323,
              attendance_today_total: 342,
              grades_below_threshold: 12,
            },
            alerts: [{ type: 'warning', icon: '⚠️', message: '12 estudiantes con notas bajo 4.0.' }],
            subscription_alert: { type: 'info', message: 'Plan vigente hasta fin de mes.' },
            usage_warnings: [{ type: 'danger', message: 'Se alcanzó el 90% del límite de almacenamiento.' }],
            recent_activity: [
              {
                type: 'evaluacion',
                icon: '📝',
                title: 'Evaluación creada',
                subject: 'Matemática',
                course: '2° Medio A',
                detail: 'Prueba parcial',
                timestamp: '2026-03-07T09:15:00',
              },
            ],
            charts: {},
          }),
        };
      }

      return {
        ok: false,
        json: async () => ({}),
      };
    });
    getMock.mockImplementation((path) => {
      if (path === '/api/v1/dashboard/resumen/?scope=school') {
        return Promise.resolve(createDashboardPayload('school'));
      }

      if (path === '/api/v1/dashboard/resumen/?scope=auto') {
        return Promise.resolve(createDashboardPayload('auto'));
      }

      if (path === '/api/v1/dashboard/resumen/?scope=analytics') {
        return Promise.resolve(createDashboardPayload('analytics'));
      }

      if (path === '/api/v1/dashboard/resumen/?scope=self') {
        return Promise.resolve(createDashboardPayload('self'));
      }

      if (path === '/api/v1/demo/panel/') {
        return Promise.resolve(demoPanelPayload);
      }

      return Promise.resolve({});
    });
  });

  it('loads dashboard summary and renders key metrics', async () => {

    renderWithProviders(<DashboardPage />, {
      route: '/dashboard?scope=school',
      path: '/dashboard'
    });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/dashboard/resumen/?scope=school');
    });

    expect(screen.getByText((content) => content.includes('Contrato 1.0.0'))).toBeInTheDocument();
    expect(screen.getByText('Estudiantes')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('renders executive alerts when the executive payload arrives', async () => {
    getMock
      .mockResolvedValueOnce({
        contract_version: '1.0.0',
        scope: 'analytics',
        generated_at: '2026-03-07',
        available_scopes: ['analytics'],
        sections: { self: null, school: null, analytics: { attendance_rate_today: 91 } },
      })
      .mockResolvedValueOnce({
        scope: 'analytics',
        generated_at: '2026-03-07',
        kpis: {
          total_students: 342,
          total_teachers: 28,
          attendance_rate_today: 94.2,
          attendance_today_present: 323,
          attendance_today_total: 342,
          grades_below_threshold: 12,
        },
        alerts: [{ type: 'warning', icon: '⚠️', message: '12 estudiantes con notas bajo 4.0.' }],
        subscription_alert: { type: 'info', message: 'Plan vigente hasta fin de mes.' },
        usage_warnings: [{ type: 'danger', message: 'Se alcanzó el 90% del límite de almacenamiento.' }],
        recent_activity: [
          {
            type: 'evaluacion',
            icon: '📝',
            title: 'Evaluación creada',
            subject: 'Matemática',
            course: '2° Medio A',
            detail: 'Prueba parcial',
            timestamp: '2026-03-07T09:15:00',
          },
        ],
        charts: {},
      });

    renderWithProviders(<DashboardPage />, {
      route: '/dashboard?scope=analytics',
      path: '/dashboard'
    });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/dashboard/resumen/?scope=analytics');
    });

    await waitFor(() => {
      expect(screen.getByText('Panel Ejecutivo')).toBeInTheDocument();
      expect(screen.getByText('Estudiantes')).toBeInTheDocument();
      expect(screen.getByText('342')).toBeInTheDocument();
      expect(screen.getByText('Actividad Reciente')).toBeInTheDocument();
      expect(screen.getByText('Matemática · 2° Medio A')).toBeInTheDocument();
      expect(screen.getByText((content, element) => element?.classList.contains('exec-activity-time') && content.includes('Prueba parcial'))).toBeInTheDocument();
      expect(screen.getByText('Plan vigente hasta fin de mes.')).toBeInTheDocument();
      expect(screen.getByText('Se alcanzó el 90% del límite de almacenamiento.')).toBeInTheDocument();
      expect(screen.getByText('12 estudiantes con notas bajo 4.0.')).toBeInTheDocument();
    });
  });

  it('shows backend error when dashboard request fails', async () => {
    getMock.mockImplementation((path) => {
      if (path === '/api/v1/dashboard/resumen/?scope=self') {
        return Promise.reject({ payload: { detail: 'No autorizado para dashboard' } });
      }
      return Promise.resolve({});
    });

    renderWithProviders(<DashboardPage />, {
      route: '/dashboard?scope=self',
      path: '/dashboard'
    });

    await waitFor(() => {
      expect(screen.getByText('No autorizado para dashboard')).toBeInTheDocument();
    });
  });

  it('renders a structured loading state while dashboard data is fetching', () => {
    getMock.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<DashboardPage />, {
      route: '/dashboard?scope=analytics',
      path: '/dashboard'
    });

    const statusElements = screen.getAllByRole('status');
    expect(statusElements[0]).toHaveAttribute('aria-busy', 'true');
  });

  it('updates query and reloads when scope changes', async () => {
    const user = userEvent.setup();
    getMock.mockImplementation((path) => {
      if (path === '/api/v1/dashboard/resumen/?scope=self') {
        return Promise.resolve({
          contract_version: '1.0.0',
          scope: 'self',
          generated_at: '2026-03-07',
          available_scopes: ['self', 'school'],
          sections: { self: { my_classes: 2 }, school: null, analytics: null },
        });
      }
      if (path === '/api/v1/dashboard/resumen/?scope=school') {
        return Promise.resolve({
          contract_version: '1.0.0',
          scope: 'school',
          generated_at: '2026-03-07',
          available_scopes: ['self', 'school'],
          sections: { self: null, school: { students: 100 }, analytics: null },
        });
      }
      if (path === '/api/v1/demo/panel/') {
        return Promise.resolve(demoPanelPayload);
      }
      return Promise.resolve({});
    });

    renderWithProviders(<DashboardPage />, {
      route: '/dashboard?scope=self',
      path: '/dashboard'
    });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/dashboard/resumen/?scope=self');
    });

    await user.click(screen.getByRole('button', { name: /Colegio/ }));

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/dashboard/resumen/?scope=school');
    });
  });

  it('shows the student evaluations section even when there are no upcoming items', async () => {
    getMock.mockImplementation(async (path) => {
      if (path === '/api/v1/demo/panel/') {
        return demoPanelPayload;
      }

      return {
        contract_version: '1.0.0',
        scope: 'self',
        generated_at: '2026-03-07',
        available_scopes: ['self'],
        sections: {
          self: { tareas_pendientes: 0, proximas_evaluaciones: [] },
          school: null,
          analytics: null,
        },
      };
    });

    renderWithProviders(<DashboardPage />, {
      route: '/dashboard?scope=self',
      path: '/dashboard'
    });

    await waitFor(() => {
      expect(screen.getByText('No tienes evaluaciones próximas registradas.')).toBeInTheDocument();
    });
  });
});
