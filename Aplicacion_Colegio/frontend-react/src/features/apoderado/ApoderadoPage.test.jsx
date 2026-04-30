import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ApoderadoPage from './ApoderadoPage';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
    post: (...args) => postMock(...args),
  },
}));

describe('ApoderadoPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();

    getMock.mockImplementation((path) => {
      if (path === '/api/apoderado/justificativos/') {
        return Promise.resolve({ justificativos: [{ id_justificativo: 2, fecha_ausencia: '2026-03-01', estado: 'PENDIENTE' }] });
      }
      if (path === '/api/apoderado/firmas/') {
        return Promise.resolve({ pendientes: [{ id: 10 }], firmados: [{ id: 20 }] });
      }
      return Promise.resolve({});
    });
  });

  it('loads justificativos and firmas counters', async () => {
    render(<ApoderadoPage />);

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/apoderado/justificativos/');
      expect(getMock).toHaveBeenCalledWith('/api/apoderado/firmas/');
    });

    expect(screen.getByText(/Justificativos \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Pendientes: 1')).toBeInTheDocument();
    expect(screen.getByText('Firmados: 1')).toBeInTheDocument();
    expect(screen.getByText('Pendientes de firma')).toBeInTheDocument();
  });

  it('submits sign document form', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValueOnce({ message: 'Documento firmado correctamente.' });

    render(<ApoderadoPage />);

    await screen.findByText(/Justificativos \(1\)/);

    await user.type(screen.getByLabelText('Titulo'), 'Autorizacion salida');
    await user.type(screen.getByLabelText('Contenido'), 'Autorizo salida anticipada');
    await user.type(screen.getByLabelText('Estudiante ID (opcional)'), '44');
    await user.click(screen.getByRole('button', { name: 'Firmar' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/apoderado/firmas/firmar/', {
        tipo_documento: 'AUTORIZACION',
        titulo: 'Autorizacion salida',
        contenido: 'Autorizo salida anticipada',
        estudiante_id: 44,
      });
    });

    expect(screen.getByText('Documento firmado correctamente.')).toBeInTheDocument();
  });

  it('shows loading state while panel data is being resolved', async () => {
    getMock.mockImplementation(() => new Promise(() => {}));

    render(<ApoderadoPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Firmar' })).not.toBeInTheDocument();
  });

  it('shows backend error when signing fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValueOnce({ payload: { detail: 'Firma rechazada por backend' } });

    render(<ApoderadoPage />);

    await screen.findByText(/Justificativos \(1\)/);

    await user.type(screen.getByLabelText('Titulo'), 'Autorizacion salida');
    await user.click(screen.getByRole('button', { name: 'Firmar' }));

    await waitFor(() => {
      expect(screen.getByText('Firma rechazada por backend')).toBeInTheDocument();
    });
  });
});
