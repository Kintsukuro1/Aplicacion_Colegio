import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, paginated, getMock, postMock, patchMock, deleteMock } from '../../test/test-utils';

import AdminCoursesPage from './AdminCoursesPage';

describe('AdminCoursesPage', () => {

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

    renderWithProviders(<AdminCoursesPage me={{ capabilities: ['COURSE_VIEW'] }} />, {
      route: '/admin/cursos',
      path: '/admin/cursos'
    });

    // Wait for data to load and render
    expect(await screen.findByText('5A')).toBeInTheDocument();
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

    renderWithProviders(<AdminCoursesPage me={{ capabilities: ['COURSE_VIEW', 'COURSE_CREATE'] }} />, {
      route: '/admin/cursos',
      path: '/admin/cursos'
    });

    // Wait for data to render
    expect(await screen.findByText('5A')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Nuevo Curso' }));

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

    renderWithProviders(<AdminCoursesPage me={{ capabilities: ['COURSE_VIEW', 'COURSE_EDIT'] }} />, {
      route: '/admin/cursos',
      path: '/admin/cursos'
    });

    // Wait for data to render
    expect(await screen.findByText('5A')).toBeInTheDocument();

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

    renderWithProviders(<AdminCoursesPage me={{ capabilities: ['COURSE_VIEW', 'COURSE_DELETE'] }} />, {
      route: '/admin/cursos',
      path: '/admin/cursos'
    });

    // Wait for data to render
    expect(await screen.findByText('5A')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/api/v1/cursos/10/');
    });
  });

  it('shows restricted mode for read-only users', async () => {
    getMock.mockResolvedValue(paginated([]));

    renderWithProviders(<AdminCoursesPage me={{ capabilities: ['COURSE_VIEW'] }} />, {
      route: '/admin/cursos',
      path: '/admin/cursos'
    });

    // Wait for data to load and table to render
    expect(await screen.findByText('Sin registros')).toBeInTheDocument();

    expect(screen.getByText(/Modo restringido: Solo lectura./)).toBeInTheDocument();
  });
});
