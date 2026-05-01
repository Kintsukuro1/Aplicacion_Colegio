import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminStudentsPage from './AdminStudentsPage';

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const delMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
    post: (...args) => postMock(...args),
    patch: (...args) => patchMock(...args),
    del: (...args) => delMock(...args),
  },
}));

describe('AdminStudentsPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    delMock.mockReset();

    getMock.mockImplementation(async (path) => {
      // Handle paginated endpoint with search parameter
      if (path.includes('/api/v1/estudiantes/')) {
        return {
          count: 2,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              email: 'ana@example.com',
              rut: '11.111.111-1',
              nombre: 'Ana',
              apellido_paterno: 'Lagos',
              apellido_materno: 'Paz',
              is_active: true,
            },
            {
              id: 2,
              email: 'bruno@example.com',
              rut: '22.222.222-2',
              nombre: 'Bruno',
              apellido_paterno: 'Rojas',
              apellido_materno: 'Diaz',
              is_active: false,
            },
          ],
        };
      }

      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
    });
  });

  it('renders summary cards and supports row selection', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminStudentsPage me={{ capabilities: ['STUDENT_VIEW', 'STUDENT_EDIT'] }} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin Escolar: Estudiantes')).toBeInTheDocument();
      expect(screen.getByText('Gestión de estudiantes con búsqueda, edición y desactivación masiva.')).toBeInTheDocument();
      expect(screen.getByText('Estudiantes visibles')).toBeInTheDocument();
      expect(screen.getByText('Activos')).toBeInTheDocument();
      expect(screen.getByText('Inactivos')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Ana Lagos')).toBeInTheDocument();
      expect(screen.getByText('Bruno Rojas')).toBeInTheDocument();
      expect(getMock).toHaveBeenCalledWith(expect.stringContaining('/api/v1/estudiantes/'));
    });

    const rowCheckboxes = screen.getAllByRole('checkbox');
    await user.click(rowCheckboxes[1]);

    expect(screen.getByText('1 seleccionado(s) en la pagina actual.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desactivar Seleccionados' })).toBeEnabled();
  });
});