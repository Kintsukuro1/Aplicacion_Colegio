import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CoordinadorAcademicoPage from './CoordinadorAcademicoPage';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
    post: (...args) => postMock(...args),
  },
}));

describe('CoordinadorAcademicoPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockResolvedValue({ planificaciones: [] });
  });

  it('shows loading state while plans are loading', () => {
    getMock.mockReturnValueOnce(new Promise(() => {}));

    render(<CoordinadorAcademicoPage me={{ capabilities: [] }} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('disables update button without PLANNING_APPROVE', async () => {
    render(<CoordinadorAcademicoPage me={{ capabilities: [] }} />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const button = screen.getByRole('button', { name: 'Actualizar' });
    expect(button).toBeDisabled();
  });

  it('submits planning status update with PLANNING_APPROVE', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValueOnce({ message: 'Planificacion aprobada correctamente' });

    render(<CoordinadorAcademicoPage me={{ capabilities: ['PLANNING_APPROVE'] }} />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Planificacion ID'), '9');
    await user.type(screen.getByLabelText('Observaciones'), 'Revision curricular ok');
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/coordinador/planificaciones/9/estado/', {
        estado: 'APROBADA',
        observaciones: 'Revision curricular ok',
      });
    });
  });

  it('shows backend error when update fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValueOnce({ payload: { detail: 'No se pudo actualizar' } });

    render(<CoordinadorAcademicoPage me={{ capabilities: ['PLANNING_APPROVE'] }} />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Planificacion ID'), '9');
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => {
      expect(screen.getByText('No se pudo actualizar')).toBeInTheDocument();
    });
  });

  it('shows saving state while planning update is in progress', async () => {
    const user = userEvent.setup();
    postMock.mockReturnValueOnce(new Promise(() => {}));

    render(<CoordinadorAcademicoPage me={{ capabilities: ['PLANNING_APPROVE'] }} />);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Planificacion ID'), '9');
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  });
});
