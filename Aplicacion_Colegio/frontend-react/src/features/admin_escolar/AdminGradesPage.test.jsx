import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminGradesPage from './AdminGradesPage';

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
    post: (...args) => postMock(...args),
    patch: (...args) => patchMock(...args),
    del: (...args) => deleteMock(...args),
  },
}));

function renderPage(me, initialUrl = '/admin/calificaciones') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/admin/calificaciones" element={<AdminGradesPage me={me} />} />
      </Routes>
    </MemoryRouter>
  );
}

function paginated(results) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  };
}

describe('AdminGradesPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
    vi.restoreAllMocks();
  });

  it('creates grade with GRADE_CREATE capability', async () => {
    const user = userEvent.setup();

    getMock.mockResolvedValue(paginated([]));
    postMock.mockResolvedValue({ id_calificacion: 55 });

    renderPage({ capabilities: ['GRADE_VIEW', 'GRADE_CREATE'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/calificaciones/?page=1');
    });

    await user.type(screen.getByLabelText('Evaluacion ID'), '10');
    await user.type(screen.getByLabelText('Estudiante ID'), '21');
    await user.type(screen.getByLabelText('Nota'), '6.2');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/v1/profesor/calificaciones/', {
        evaluacion: 10,
        estudiante: 21,
        nota: 6.2,
      });
    });
  });

  it('updates grade with GRADE_EDIT capability', async () => {
    const user = userEvent.setup();

    getMock.mockResolvedValue(
      paginated([
        {
          id_calificacion: 55,
          evaluacion: 10,
          estudiante: 21,
          estudiante_nombre: 'Alumno Test',
          nota: 5.8,
        },
      ])
    );

    patchMock.mockResolvedValue({ id_calificacion: 55, nota: 6.0 });

    renderPage({ capabilities: ['GRADE_VIEW', 'GRADE_EDIT'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/calificaciones/?page=1');
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));

    const scoreInput = screen.getByLabelText('Nota');
    await user.clear(scoreInput);
    await user.type(scoreInput, '6.0');
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/api/v1/profesor/calificaciones/55/', {
        evaluacion: 10,
        estudiante: 21,
        nota: 6,
      });
    });
  });

  it('deletes grade with GRADE_DELETE capability', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    getMock.mockResolvedValue(
      paginated([
        {
          id_calificacion: 55,
          evaluacion: 10,
          estudiante: 21,
          estudiante_nombre: 'Alumno Test',
          nota: 5.8,
        },
      ])
    );

    deleteMock.mockResolvedValue(null);

    renderPage({ capabilities: ['GRADE_VIEW', 'GRADE_DELETE'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/calificaciones/?page=1');
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/api/v1/profesor/calificaciones/55/');
    });
  });

  it('read-only user sees restrictions', async () => {
    getMock.mockResolvedValue(paginated([]));

    renderPage({ capabilities: ['GRADE_VIEW'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/calificaciones/?page=1');
    });

    expect(screen.getByText(/falta capability `GRADE_CREATE` para crear/)).toBeInTheDocument();
    expect(screen.getByText(/falta capability `GRADE_DELETE` para eliminacion masiva/)).toBeInTheDocument();
  });
});
