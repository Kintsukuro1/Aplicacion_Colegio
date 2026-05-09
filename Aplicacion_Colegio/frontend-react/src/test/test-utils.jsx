import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { useAuthStore } from '../lib/store/useAuthStore';
import { ToastProvider } from '../components/Toast';

// Centralized mocks for the API client
export const getMock = vi.fn();
export const postMock = vi.fn();
export const patchMock = vi.fn();
export const deleteMock = vi.fn();

// Track all query clients to clear them after each test
const queryClients = [];

/**
 * Creates a fresh QueryClient for each test
 */
function createTestQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Turn off retries for tests
      },
    },
  });
  queryClients.push(client);
  return client;
}

export function clearQueryClients() {
  queryClients.forEach((client) => client.clear());
  queryClients.length = 0;
}

/**
 * Renders a React element wrapped in necessary providers for testing (Router + QueryClient).
 * @param {React.ReactElement} ui - The component to test
 * @param {Object} options
 * @param {string} [options.route='/'] - Initial route path
 * @param {string} [options.path='/'] - Route path definition for matching
 * @returns {import('@testing-library/react').RenderResult & { queryClient: QueryClient }}
 */
export function renderWithProviders(ui, { route = '/', path = '/' } = {}) {
  const queryClient = createTestQueryClient();
  const testUser = ui?.props?.me;

  if (testUser !== undefined) {
    useAuthStore.setState({
      user: testUser,
      isAuthenticated: Boolean(testUser),
    });
  }

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );

  return { ...rendered, queryClient };
}

/**
 * Helper to build a paginated API response payload.
 */
export function paginated(results) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
  };
}
