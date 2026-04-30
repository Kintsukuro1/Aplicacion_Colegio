import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import SoporteTecnicoPage from './SoporteTecnicoPage';

const postMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    post: (...args) => postMock(...args),
  },
}));

describe('SoporteTecnicoPage', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('disables create ticket action without SUPPORT_CREATE_TICKET', () => {
    render(<SoporteTecnicoPage me={{ capabilities: [] }} />);

    expect(screen.getByText('Crear tickets')).toBeInTheDocument();
    expect(screen.getAllByText('Bloqueado').length).toBeGreaterThanOrEqual(1);

    const button = screen.getByRole('button', { name: 'Crear ticket' });
    expect(button).toBeDisabled();
  });

  it('submits create ticket when capability exists', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValueOnce({ message: 'Ticket creado correctamente.', id: 55 });

    render(<SoporteTecnicoPage me={{ capabilities: ['SUPPORT_CREATE_TICKET'] }} />);

    await user.type(screen.getByLabelText('Titulo'), 'Error login');
    await user.type(screen.getByLabelText('Descripcion'), 'No me deja entrar');
    await user.click(screen.getByRole('button', { name: 'Crear ticket' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/soporte/tickets/crear/', {
        titulo: 'Error login',
        descripcion: 'No me deja entrar',
        categoria: 'OTRO',
        prioridad: 'MEDIA',
      });
    });

    expect(screen.getByText('Ticket creado correctamente.')).toBeInTheDocument();
    expect(screen.getByLabelText('Ticket ID')).toHaveValue(55);
  });

  it('disables reset flow without reset capabilities', () => {
    render(<SoporteTecnicoPage me={{ capabilities: ['SUPPORT_CREATE_TICKET'] }} />);

    const submitButton = screen.getByRole('button', { name: 'Ejecutar flujo reset' });

    expect(submitButton).toBeDisabled();
    expect(postMock).not.toHaveBeenCalled();
  });
});
