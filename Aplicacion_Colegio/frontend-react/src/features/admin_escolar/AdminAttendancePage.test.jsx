import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminAttendancePage from './AdminAttendancePage';

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

function renderPage(me, initialUrl = '/admin/asistencias') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/admin/asistencias" element={<AdminAttendancePage me={me} />} />
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

describe('AdminAttendancePage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
    vi.restoreAllMocks();
  });

  it('creates attendance with CLASS_TAKE_ATTENDANCE capability', async () => {
    const user = userEvent.setup();

    getMock
      .mockResolvedValueOnce({ results: [{ id: 31, curso_nombre: '6A', asignatura_nombre: 'Historia' }] })
      .mockResolvedValue(paginated([]));

    postMock.mockResolvedValue({ id_asistencia: 77 });

    renderPage({ capabilities: ['CLASS_VIEW_ATTENDANCE', 'CLASS_TAKE_ATTENDANCE'] }, '/admin/asistencias?clase_id=31');

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/clases/');
    });

    await user.type(screen.getByLabelText('Estudiante ID'), '44');
    await user.type(screen.getAllByLabelText('Fecha')[1], '2026-03-07');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/v1/profesor/asistencias/', {
        clase: 31,
        estudiante: 44,
        fecha: '2026-03-07',
        estado: 'P',
        tipo_asistencia: null,
        observaciones: null,
      });
    });
  });

  it('updates and deletes attendance rows', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    getMock
      .mockResolvedValueOnce({ results: [{ id: 31, curso_nombre: '6A', asignatura_nombre: 'Historia' }] })
      .mockResolvedValue(
        paginated([
          {
            id_asistencia: 77,
            clase: 31,
            estudiante: 44,
            estudiante_nombre: 'Alumno Uno',
            fecha: '2026-03-07',
            estado: 'A',
            tipo_asistencia: 'Presencial',
            observaciones: 'Inicial',
          },
        ])
      );

    patchMock.mockResolvedValue({ id_asistencia: 77, estado: 'P' });
    deleteMock.mockResolvedValue(null);

    renderPage({ capabilities: ['CLASS_VIEW_ATTENDANCE', 'CLASS_TAKE_ATTENDANCE'] }, '/admin/asistencias?clase_id=31');

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/asistencias/?page=1&clase_id=31');
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.selectOptions(screen.getByLabelText('Estado'), 'P');
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/api/v1/profesor/asistencias/77/', {
        clase: 31,
        estudiante: 44,
        fecha: '2026-03-07',
        estado: 'P',
        tipo_asistencia: 'Presencial',
        observaciones: 'Inicial',
      });
    });

    const deleteButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/api/v1/profesor/asistencias/77/');
    });
  });

  it('shows read-only mode without CLASS_TAKE_ATTENDANCE', async () => {
    getMock
      .mockResolvedValueOnce({ results: [{ id: 31, curso_nombre: '6A', asignatura_nombre: 'Historia' }] })
      .mockResolvedValue(paginated([]));

    renderPage({ capabilities: ['CLASS_VIEW_ATTENDANCE'] }, '/admin/asistencias?clase_id=31');

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/asistencias/?page=1&clase_id=31');
    });

    expect(screen.getByText(/falta capability `CLASS_TAKE_ATTENDANCE`/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear' })).not.toBeInTheDocument();
  });
});
