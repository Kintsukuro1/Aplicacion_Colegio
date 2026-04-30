import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PsicologoOrientadorPage from './PsicologoOrientadorPage';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
    post: (...args) => postMock(...args),
  },
}));

describe('PsicologoOrientadorPage', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockResolvedValue({ estudiantes: [{ id: 11, nombre_completo: 'Nina Soto' }] });
  });

  it('loads students on mount', async () => {
    render(<PsicologoOrientadorPage me={{ capabilities: ['COUNSELING_CREATE'] }} />);

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/api/psicologo/estudiantes/');
    });
  });

  it('submits entrevista form with COUNSELING_CREATE', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValueOnce({ message: 'Entrevista creada.' });

    render(<PsicologoOrientadorPage me={{ capabilities: ['COUNSELING_CREATE'] }} />);

    const studentSelects = await screen.findAllByLabelText('Estudiante');
    await user.selectOptions(studentSelects[0], '11');
    await user.type(screen.getByLabelText('Fecha'), '2026-03-06');
    await user.type(screen.getByLabelText('Observaciones'), 'Seguimiento academico inicial');
    await user.click(screen.getByRole('button', { name: 'Registrar entrevista' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/psicologo/entrevistas/crear/', {
        estudiante_id: 11,
        fecha: '2026-03-06',
        motivo: 'ACADEMICO',
        observaciones: 'Seguimiento academico inicial',
        acuerdos: '',
        seguimiento_requerido: false,
      });
    });
  });

  it('disables update derivacion action without REFERRAL_EDIT', async () => {
    render(<PsicologoOrientadorPage me={{ capabilities: ['COUNSELING_CREATE'] }} />);

    await screen.findAllByText('Nina Soto');

    const button = screen.getByRole('button', { name: 'Actualizar derivacion' });
    expect(button).toBeDisabled();
  });

  it('shows backend error when entrevista submit fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValueOnce({ payload: { error: 'Error de validacion' } });

    render(<PsicologoOrientadorPage me={{ capabilities: ['COUNSELING_CREATE'] }} />);

    const studentSelects = await screen.findAllByLabelText('Estudiante');
    await user.selectOptions(studentSelects[0], '11');
    await user.type(screen.getByLabelText('Fecha'), '2026-03-06');
    await user.type(screen.getByLabelText('Observaciones'), 'Seguimiento academico inicial');
    await user.click(screen.getByRole('button', { name: 'Registrar entrevista' }));

    await waitFor(() => {
      expect(screen.getByText('Error de validacion')).toBeInTheDocument();
    });
  });

  it('shows saving state while entrevista request is in progress', async () => {
    const user = userEvent.setup();
    postMock.mockReturnValueOnce(new Promise(() => {}));

    render(<PsicologoOrientadorPage me={{ capabilities: ['COUNSELING_CREATE'] }} />);

    const studentSelects = await screen.findAllByLabelText('Estudiante');
    await user.selectOptions(studentSelects[0], '11');
    await user.type(screen.getByLabelText('Fecha'), '2026-03-06');
    await user.type(screen.getByLabelText('Observaciones'), 'Seguimiento academico inicial');
    await user.click(screen.getByRole('button', { name: 'Registrar entrevista' }));

    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  });
});
