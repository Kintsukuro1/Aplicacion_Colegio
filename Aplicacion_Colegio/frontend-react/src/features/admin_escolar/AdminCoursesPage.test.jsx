import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminCoursesPage from './AdminCoursesPage';

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

function renderPage(me, initialUrl = '/admin/cursos') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="/admin/cursos" element={<AdminCoursesPage me={me} />} />
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

describe('AdminCoursesPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
    vi.restoreAllMocks();
  });

  it('loads course list for users with COURSE_VIEW', async () => {
    getMock.mockResolvedValue(
      paginated([
        {
          id_curso: 10,
          nombre: '5A',
          activo: true,
          colegio_id: 123,
          nivel_id: 7,
          ciclo_academico_id: 2026,
        },
      ])
    );

    renderPage({ capabilities: ['COURSE_VIEW'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/cursos/?page=1');
    });

    expect(screen.getByText('5A')).toBeInTheDocument();
  });

  it('creates a new course when user has COURSE_CREATE', async () => {
    const user = userEvent.setup();

    getMock
      .mockResolvedValueOnce(
        paginated([
          {
            id_curso: 10,
            nombre: '5A',
            activo: true,
            colegio_id: 123,
            nivel_id: 7,
            ciclo_academico_id: 2026,
          },
        ])
      )
      .mockResolvedValueOnce(
        paginated([
          {
            id_curso: 10,
            nombre: '5A',
            activo: true,
            colegio_id: 123,
            nivel_id: 7,
            ciclo_academico_id: 2026,
          },
          {
            id_curso: 11,
            nombre: '6B',
            activo: true,
            colegio_id: 123,
            nivel_id: 7,
            ciclo_academico_id: 2026,
          },
        ])
      );

    postMock.mockResolvedValue({
      id_curso: 11,
      nombre: '6B',
      activo: true,
      colegio_id: 123,
      nivel_id: 7,
      ciclo_academico_id: 2026,
    });

    renderPage({ capabilities: ['COURSE_VIEW', 'COURSE_CREATE'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/cursos/?page=1');
    });

    await user.type(screen.getByLabelText('Nombre'), '6B');
    await user.type(screen.getByLabelText('Nivel ID'), '7');
    await user.type(screen.getByLabelText('Ciclo Academico ID (opcional)'), '2026');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/v1/cursos/', {
        nombre: '6B',
        activo: true,
        nivel_id: 7,
        ciclo_academico_id: 2026,
      });
    });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledTimes(2);
    });
  });

  it('updates a course when user has COURSE_EDIT', async () => {
    const user = userEvent.setup();
    getMock
      .mockResolvedValueOnce(
        paginated([
          {
            id_curso: 10,
            nombre: '5A',
            activo: true,
            colegio_id: 123,
            nivel_id: 7,
            ciclo_academico_id: 2026,
          },
        ])
      )
      .mockResolvedValueOnce(
        paginated([
          {
            id_curso: 10,
            nombre: '5A Editado',
            activo: true,
            colegio_id: 123,
            nivel_id: 7,
            ciclo_academico_id: 2026,
          },
        ])
      );

    patchMock.mockResolvedValue({
      id_curso: 10,
      nombre: '5A Editado',
    });

    renderPage({ capabilities: ['COURSE_VIEW', 'COURSE_EDIT'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/cursos/?page=1');
    });

    await user.click(screen.getByRole('button', { name: 'Editar' }));

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, '5A Editado');

    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/api/v1/cursos/10/', {
        nombre: '5A Editado',
        activo: true,
        nivel_id: 7,
        ciclo_academico_id: 2026,
      });
    });
  });

  it('deletes a course when user has COURSE_DELETE', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    getMock
      .mockResolvedValueOnce(
        paginated([
          {
            id_curso: 10,
            nombre: '5A',
            activo: true,
            colegio_id: 123,
            nivel_id: 7,
            ciclo_academico_id: 2026,
          },
        ])
      )
      .mockResolvedValueOnce(paginated([]));

    deleteMock.mockResolvedValue(null);

    renderPage({ capabilities: ['COURSE_VIEW', 'COURSE_DELETE'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/cursos/?page=1');
    });

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/api/v1/cursos/10/');
    });
  });

  it('shows restricted mode for read-only users', async () => {
    getMock.mockResolvedValue(paginated([]));

    renderPage({ capabilities: ['COURSE_VIEW'] });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/v1/cursos/?page=1');
    });

    expect(screen.getByText(/Modo restringido: falta capability `COURSE_CREATE`/)).toBeInTheDocument();
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
  });
});
