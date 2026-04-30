import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from './DashboardPage';

const getMock = vi.fn();

const demoPanelPayload = {
  counts: { tareas: 0, materiales: 0, bloques: 0 },
  tareas: [],
  materiales: [],
  horario: {},
};

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
  },
}));

function renderDashboard(initialUrl = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockImplementation((path) => {
      if (path === '/api/v1/demo/panel/') {
        return Promise.resolve(demoPanelPayload);
      }

      return Promise.resolve(null);
    });
  });

  it('loads dashboard summary and renders key metrics', async () => {
    getMock.mockResolvedValue({
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
    });

    renderDashboard('/dashboard?scope=school');

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

    renderDashboard('/dashboard?scope=analytics');

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
    getMock.mockRejectedValue({ payload: { detail: 'No autorizado para dashboard' } });

    renderDashboard('/dashboard?scope=self');

    await waitFor(() => {
      expect(screen.getByText('No autorizado para dashboard')).toBeInTheDocument();
    });
  });

  it('renders a structured loading state while dashboard data is fetching', () => {
    getMock.mockImplementation(() => new Promise(() => {}));

    renderDashboard('/dashboard?scope=analytics');

    expect(screen.getByRole('status')).toHaveTextContent('Cargando dashboard ejecutivo...');
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('updates query and reloads when scope changes', async () => {
    const user = userEvent.setup();
    getMock
      .mockResolvedValueOnce({
        contract_version: '1.0.0',
        scope: 'self',
        generated_at: '2026-03-07',
        available_scopes: ['self', 'school'],
        sections: { self: { my_classes: 2 }, school: null, analytics: null },
      })
      .mockResolvedValueOnce({
        contract_version: '1.0.0',
        scope: 'school',
        generated_at: '2026-03-07',
        available_scopes: ['self', 'school'],
        sections: { self: null, school: { students: 100 }, analytics: null },
      });

    renderDashboard('/dashboard?scope=self');

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

    renderDashboard('/dashboard?scope=self');

    await waitFor(() => {
      expect(screen.getByText('No tienes evaluaciones próximas registradas.')).toBeInTheDocument();
    });
  });
});
