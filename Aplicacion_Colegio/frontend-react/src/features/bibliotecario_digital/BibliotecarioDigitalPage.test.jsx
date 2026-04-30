import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BibliotecarioDigitalPage from './BibliotecarioDigitalPage';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
    post: (...args) => postMock(...args),
  },
}));

describe('BibliotecarioDigitalPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();

    getMock.mockImplementation((path) => {
      if (path === '/api/bibliotecario/recursos/') {
        return Promise.resolve({ recursos: [{ id: 1, titulo: 'Libro Matematica', tipo: 'LIBRO' }] });
      }
      if (path === '/api/bibliotecario/usuarios/') {
        return Promise.resolve({ usuarios: [{ id: 4, nombre: 'Carlos Ruiz' }] });
      }
      return Promise.resolve({});
    });
  });

  it('loads resources and users', async () => {
    render(<BibliotecarioDigitalPage me={{ capabilities: ['LIBRARY_VIEW'] }} />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/bibliotecario/recursos/');
      expect(getMock).toHaveBeenCalledWith('/api/bibliotecario/usuarios/');
    });

    expect(screen.getByText(/Recursos \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Préstamos activos')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });

  it('shows loading state before the catalog is ready', () => {
    getMock.mockImplementation(() => new Promise(() => {}));

    render(<BibliotecarioDigitalPage me={{ capabilities: ['LIBRARY_VIEW'] }} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear recurso' })).not.toBeInTheDocument();
  });

  it('submits create resource with LIBRARY_CREATE', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValueOnce({ message: 'Recurso creado.' });

    render(<BibliotecarioDigitalPage me={{ capabilities: ['LIBRARY_CREATE'] }} />);

    await screen.findByText(/Recursos \(1\)/);

    await user.type(screen.getByLabelText('Titulo'), 'Guia de Historia');
    await user.click(screen.getByRole('button', { name: 'Crear recurso' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/bibliotecario/recursos/crear/', {
        titulo: 'Guia de Historia',
        descripcion: '',
        tipo: 'DOCUMENTO',
        url_externa: '',
        publicado: false,
        es_plan_lector: false,
      });
    });
  });

  it('disables loan action without LIBRARY_MANAGE_LOANS', async () => {
    render(<BibliotecarioDigitalPage me={{ capabilities: ['LIBRARY_VIEW'] }} />);

    await screen.findByText(/Recursos \(1\)/);
    const button = screen.getByRole('button', { name: 'Registrar prestamo' });
    expect(button).toBeDisabled();
  });

  it('shows backend error when create resource fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValueOnce({ payload: { error: 'No se pudo crear recurso' } });

    render(<BibliotecarioDigitalPage me={{ capabilities: ['LIBRARY_CREATE'] }} />);

    await screen.findByText(/Recursos \(1\)/);

    await user.type(screen.getByLabelText('Titulo'), 'Guia de Historia');
    await user.click(screen.getByRole('button', { name: 'Crear recurso' }));

    await waitFor(() => {
      expect(screen.getByText('No se pudo crear recurso')).toBeInTheDocument();
    });
  });

  it('shows saving state while creating resource', async () => {
    const user = userEvent.setup();
    postMock.mockReturnValueOnce(new Promise(() => {}));

    render(<BibliotecarioDigitalPage me={{ capabilities: ['LIBRARY_CREATE'] }} />);

    await screen.findByText(/Recursos \(1\)/);

    await user.type(screen.getByLabelText('Titulo'), 'Guia de Historia');
    await user.click(screen.getByRole('button', { name: 'Crear recurso' }));

    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  });

  it('submits toggle publish using resource selector', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValueOnce({ message: 'Publicacion actualizada.' });

    render(<BibliotecarioDigitalPage me={{ capabilities: ['LIBRARY_EDIT'] }} />);

    await screen.findByText(/Recursos \(1\)/);

    const resourceSelects = screen.getAllByLabelText('Recurso');
    await user.selectOptions(resourceSelects[0], '1');
    await user.click(screen.getByRole('button', { name: 'Toggle publicar' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/bibliotecario/recursos/1/publicar/', {});
    });
  });
});
