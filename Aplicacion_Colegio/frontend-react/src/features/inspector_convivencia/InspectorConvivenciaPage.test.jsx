import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InspectorConvivenciaPage from './InspectorConvivenciaPage';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
    post: (...args) => postMock(...args),
  },
}));

describe('InspectorConvivenciaPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockImplementation((path) => {
      if (path === '/api/inspector/estudiantes/') {
        return Promise.resolve({ estudiantes: [{ id: 7, nombre_completo: 'Ana Perez' }] });
      }
      if (path === '/api/v1/profesor/clases/') {
        return Promise.resolve({ results: [{ id: 5, nombre: 'Matematica 7A' }] });
      }
      return Promise.resolve({});
    });
  });

  it('loads students on mount', async () => {
    render(<InspectorConvivenciaPage me={{ capabilities: ['DISCIPLINE_CREATE'] }} />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/inspector/estudiantes/');
      expect(getMock).toHaveBeenCalledWith('/api/v1/profesor/clases/');
    });

    expect(screen.getAllByText('Ana Perez').length).toBeGreaterThan(0);
  });

  it('submits annotation when capability exists', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValueOnce({ message: 'Anotacion registrada.' });

    render(<InspectorConvivenciaPage me={{ capabilities: ['DISCIPLINE_CREATE'] }} />);

    const studentSelects = await screen.findAllByLabelText('Estudiante');
    await user.selectOptions(studentSelects[0], '7');
    await user.type(screen.getByLabelText('Descripcion'), 'Conducta destacada');
    await user.click(screen.getByRole('button', { name: 'Registrar anotacion' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/inspector/anotaciones/crear/', {
        estudiante_id: 7,
        tipo: 'NEUTRA',
        categoria: 'OTRO',
        descripcion: 'Conducta destacada',
        gravedad: 1,
      });
    });
  });

  it('disables justificativo review action without capability', async () => {
    render(<InspectorConvivenciaPage me={{ capabilities: ['DISCIPLINE_CREATE'] }} />);

    const options = await screen.findAllByText('Ana Perez');
    expect(options.length).toBeGreaterThan(0);

    const submitButton = screen.getByRole('button', { name: 'Actualizar justificativo' });

    expect(submitButton).toBeDisabled();
    expect(postMock).not.toHaveBeenCalled();
  });
});
