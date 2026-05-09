import '@testing-library/jest-dom/vitest';
import { vi, afterEach } from 'vitest';
import { getMock, postMock, patchMock, deleteMock, clearQueryClients } from './test-utils';

// Global mock for API client
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args) => getMock(...args),
    post: (...args) => postMock(...args),
    patch: (...args) => patchMock(...args),
    del: (...args) => deleteMock(...args),
  },
}));

// Global teardown for all tests
afterEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  patchMock.mockReset();
  deleteMock.mockReset();
  vi.clearAllMocks();
  clearQueryClients();
});
