import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminClassesPage from './AdminClassesPage';

const getMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
  },
}));

describe('AdminClassesPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockImplementation(async (path) => {
      if (path === '/api/v1/profesor/clases/?page=1') {
        return {
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              curso_nombre: '7° Básico A',
              asignatura_nombre: 'Matemática',
              profesor_id: 12,
              total_estudiantes: 30,
              activo: true,
            },
            {
              id: 2,
              curso_nombre: '7° Básico B',
              asignatura_nombre: 'Lenguaje',
              profesor_id: 14,
              total_estudiantes: 28,
              activo: false,
            },
          ],
        };
      }

      return { count: 0, next: null, previous: null, results: [] };
    });
  });

  it('renders summary cards and class rows', async () => {
    render(
      <MemoryRouter>
        <AdminClassesPage me={{ capabilities: ['CLASS_VIEW'] }} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/clases/?page=1');
    });

    await waitFor(() => {
      expect(screen.getByText('Admin Escolar: Clases')).toBeInTheDocument();
      expect(screen.getByText('Listado de Clases')).toBeInTheDocument();
      expect(screen.getByText('Clases visibles')).toBeInTheDocument();
      expect(screen.getByText('Total paginado')).toBeInTheDocument();
      expect(screen.getByText('7° Básico A')).toBeInTheDocument();
      expect(screen.getByText('7° Básico B')).toBeInTheDocument();
    });
  });
});
