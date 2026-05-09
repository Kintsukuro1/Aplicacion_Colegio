import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, getMock, patchMock, postMock, paginated } from '../../test/test-utils';

import AdminEvaluationsPage from './AdminEvaluationsPage';

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('AdminEvaluationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with deferred loading and displays evaluations', async () => {
    const listDeferred = createDeferred();

    getMock.mockImplementation((url) => {
      if (url.includes('/api/v1/profesor/evaluaciones/')) {
        return listDeferred.promise;
      }
      return {};
    });

    renderWithProviders(<AdminEvaluationsPage me={{ capabilities: ['GRADE_EDIT'] }} />);

    // Verify title and loading state
    expect(screen.getByText('Administración de Evaluaciones')).toBeInTheDocument();
    
    // While loading, rows are hidden or skeletons show
    const skeletons = screen.getAllByRole('status', { hidden: true });
    expect(skeletons.length).toBeGreaterThan(0);

    // Resolve API response
    await act(async () => {
      listDeferred.resolve(
        paginated([
          { id: 10, nombre: 'Prueba Parcial', clase_nombre: 'Lenguaje 5A', tipo_evaluacion: 'PRUEBA', activa: true, ponderacion: 20 },
        ])
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Prueba Parcial')).toBeInTheDocument();
      expect(screen.getByText('Lenguaje 5A')).toBeInTheDocument();
    });
  });

  it('allows toggling active status if GRADE_EDIT is present', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(
      paginated([{ id: 10, nombre: 'Prueba Parcial', clase_nombre: 'Lenguaje 5A', tipo_evaluacion: 'PRUEBA', activa: true, ponderacion: 20 }])
    );
    patchMock.mockResolvedValue({ id: 10, activa: false });

    renderWithProviders(<AdminEvaluationsPage me={{ capabilities: ['GRADE_EDIT'] }} />);

    await screen.findByText('Prueba Parcial');
    
    // Find toggle
    const toggleButton = screen.getByRole('button', { name: /Desactivar evaluación/i });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/api/v1/profesor/evaluaciones/10/', { activa: false });
    });
  });
});
