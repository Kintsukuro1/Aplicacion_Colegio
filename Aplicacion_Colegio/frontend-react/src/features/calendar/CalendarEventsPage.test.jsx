import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, getMock, postMock, patchMock, deleteMock } from '../../test/test-utils';
import { useAuthStore } from '../../lib/store/useAuthStore';

import CalendarEventsPage from './CalendarEventsPage';

describe('CalendarEventsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().setUser({ capabilities: ['ANNOUNCEMENT_VIEW', 'ANNOUNCEMENT_CREATE'] });

    getMock.mockImplementation(async (path) => {
      if (path === '/api/v1/calendario/?page=1') {
        return {
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id_evento: 1,
              titulo: 'Reunión de apoderados',
              tipo: 'reunion',
              tipo_display: 'Reunión',
              fecha_inicio: '2026-04-10',
              fecha_fin: '2026-04-10',
              visibilidad: 'apoderados',
              color: '#3B82F6',
            },
            {
              id_evento: 2,
              titulo: 'Evaluación interna',
              tipo: 'evaluacion',
              tipo_display: 'Evaluación',
              fecha_inicio: '2026-04-15',
              fecha_fin: '2026-04-15',
              visibilidad: 'profesores',
              color: '#10B981',
            },
          ],
        };
      }

      if (path === '/api/v1/calendario/?page=1&tipo=reunion&mes=4') {
        return {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id_evento: 1,
              titulo: 'Reunión de apoderados',
              tipo: 'reunion',
              tipo_display: 'Reunión',
              fecha_inicio: '2026-04-10',
              fecha_fin: '2026-04-10',
              visibilidad: 'apoderados',
              color: '#3B82F6',
            },
          ],
        };
      }

      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    });
  });

  afterEach(() => {
    useAuthStore.getState().setUser(null);
  });

  it('renders summary cards and reloads when filters are applied', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CalendarEventsPage />);

    await waitFor(() => {
      expect(screen.getByText('Calendario Escolar')).toBeInTheDocument();
      expect(screen.getByText('Listado de Eventos')).toBeInTheDocument();
      expect(screen.getByText('Eventos visibles')).toBeInTheDocument();
      expect(screen.getByText('Total filtrado')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Reunión de apoderados')).toBeInTheDocument();
      expect(screen.getByText('Evaluación interna')).toBeInTheDocument();
      expect(getMock).toHaveBeenCalledWith('/api/v1/calendario/?page=1');
    });

    await user.selectOptions(screen.getAllByLabelText('Tipo')[0], 'reunion');
    await user.clear(screen.getByLabelText('Mes'));
    await user.type(screen.getByLabelText('Mes'), '4');
    await user.click(screen.getByRole('button', { name: 'Aplicar Filtros' }));

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/calendario/?page=1&tipo=reunion&mes=4');
      expect(screen.getAllByText('Reunión de apoderados').length).toBeGreaterThanOrEqual(1);
    });
  });
});