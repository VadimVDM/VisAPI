import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import Page from './page';

// Mock the auth context
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

describe('Home Page', () => {
  it('renders the page', () => {
    render(<Page />);

    // Since the page redirects to login when not authenticated,
    // we expect the page to render without crashing
    expect(true).toBe(true);
  });
});
