import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CoordinadorAcademicoPage from './CoordinadorAcademicoPage';

const postMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    post: (...args) => postMock(...args),
  },
}));

describe('CoordinadorAcademicoPage', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('disables update button without PLANNING_APPROVE', () => {
    render(<CoordinadorAcademicoPage me={{ capabilities: [] }} />);

    const button = screen.getByRole('button', { name: 'Actualizar' });
    expect(button).toBeDisabled();
  });

  it('submits planning status update with PLANNING_APPROVE', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValueOnce({ message: 'Planificacion aprobada correctamente' });

    render(<CoordinadorAcademicoPage me={{ capabilities: ['PLANNING_APPROVE'] }} />);

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

    await user.type(screen.getByLabelText('Planificacion ID'), '9');
    await user.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  });
});
