import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardPage from './DashboardPage';

const getMock = vi.fn();

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

    expect(screen.getByText('Version contrato:')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Metricas School')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('shows backend error when dashboard request fails', async () => {
    getMock.mockRejectedValue({ payload: { detail: 'No autorizado para dashboard' } });

    renderDashboard('/dashboard?scope=self');

    await waitFor(() => {
      expect(screen.getByText('No autorizado para dashboard')).toBeInTheDocument();
    });
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

    await user.selectOptions(screen.getByLabelText('Scope'), 'school');

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/dashboard/resumen/?scope=school');
    });
  });
});
