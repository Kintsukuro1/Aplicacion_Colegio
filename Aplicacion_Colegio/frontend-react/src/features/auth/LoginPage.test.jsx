import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import LoginPage from './LoginPage';

const navigateMock = vi.fn();
const postMock = vi.fn();
const setTokensMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    post: (...args) => postMock(...args),
  },
}));

vi.mock('../../lib/authStore', () => ({
  setTokens: (...args) => setTokensMock(...args),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    postMock.mockReset();
    setTokensMock.mockReset();
  });

  it('stores tokens and redirects after successful login', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      access: 'access-token',
      refresh: 'refresh-token',
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Correo'), 'admin@test.cl');
    await user.type(screen.getByLabelText('Contrasena'), 'Test#123456');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/v1/auth/token/', {
        email: 'admin@test.cl',
        password: 'Test#123456',
      });
    });

    expect(setTokensMock).toHaveBeenCalledWith({ access: 'access-token', refresh: 'refresh-token' });
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows backend error when login fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValue({ payload: { detail: 'Credenciales invalidas' } });

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Correo'), 'admin@test.cl');
    await user.type(screen.getByLabelText('Contrasena'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales invalidas')).toBeInTheDocument();
    });

    expect(setTokensMock).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
