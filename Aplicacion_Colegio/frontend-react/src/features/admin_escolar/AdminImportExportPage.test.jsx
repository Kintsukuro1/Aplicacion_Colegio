import { screen, waitFor, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, getMock } from '../../test/test-utils';
import { useAuthStore } from '../../lib/store/useAuthStore';

import AdminImportExportPage from './AdminImportExportPage';

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('AdminImportExportPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().setUser({ capabilities: ['SYSTEM_ADMIN'] });
  });

  afterEach(() => {
    useAuthStore.getState().setUser(null);
  });

  it('renders deferred loading and dashboard data', async () => {
    const dashboardDeferred = createDeferred();

    getMock.mockImplementation((url) => {
      if (url.includes('/api/v1/importacion/dashboard/')) {
        return dashboardDeferred.promise;
      }
      if (url.includes('/api/v1/profesor/clases/')) {
        return { results: [] };
      }
      return {};
    });

    const { container } = renderWithProviders(<AdminImportExportPage />);

    // Page title and section titles are immediately visible
    expect(screen.getByText('Admin Escolar: Importacion y Exportacion')).toBeInTheDocument();
    
    // Skeleton should be shown
    expect(container.querySelectorAll('.summary-skeleton').length).toBeGreaterThan(0);

    // Resolve API data
    await act(async () => {
      dashboardDeferred.resolve({
        total_estudiantes: 450,
        total_profesores: 30,
        total_apoderados: 120,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Estudiantes')).toBeInTheDocument();
      expect(screen.getByText('450')).toBeInTheDocument();
      expect(screen.getByText('Profesores')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  it('shows read-only permissions notice for configuration-only users', () => {
    useAuthStore.getState().setUser({ capabilities: ['SYSTEM_CONFIGURE'] });

    getMock.mockImplementation((url) => {
      if (url.includes('/api/v1/importacion/dashboard/')) {
        return Promise.resolve({ total_estudiantes: 1, total_profesores: 2, total_apoderados: 3 });
      }
      if (url.includes('/api/v1/profesor/clases/')) {
        return Promise.resolve({ results: [] });
      }
      return Promise.resolve({});
    });

    renderWithProviders(<AdminImportExportPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Vista de consulta');
    expect(screen.getByText('La importacion masiva solo esta disponible para administradores del sistema.')).toBeInTheDocument();
    expect(screen.getByText('Las exportaciones masivas requieren rol de administrador del sistema.')).toBeInTheDocument();
  });
});
