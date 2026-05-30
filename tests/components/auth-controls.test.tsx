import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthControls } from '@/components/auth/auth-controls';
import { useAuthStore } from '@/stores/auth-store';
import type { AppUser } from '@/types';

const DEFAULT_STATE = useAuthStore.getState();

function buildUser(): AppUser {
  return {
    id: 'user-1',
    username: 'alex',
    email: 'alex@example.com',
    provider: 'local',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('AuthControls', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: false });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState({
      user: DEFAULT_STATE.user,
      loading: DEFAULT_STATE.loading,
    });
  });

  it('shows a loading skeleton while auth state is loading', () => {
    useAuthStore.setState({ loading: true, user: null });
    const { container } = render(<AuthControls />);

    const skeleton = container.querySelector('div.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows login link when no user is signed in', () => {
    useAuthStore.setState({ loading: false, user: null });
    render(<AuthControls />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/login');
  });

  it('shows account link when a user is signed in', () => {
    useAuthStore.setState({ loading: false, user: buildUser() });
    render(<AuthControls />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/account');
  });
});
