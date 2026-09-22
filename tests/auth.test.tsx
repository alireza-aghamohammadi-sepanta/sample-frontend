import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { client, TOKEN_KEY } from '../src/api/client';

describe('Authentication & Session Management', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // R1 AC-1: Registration success
  it('registers successfully, stores token, and navigates to home', async () => {
    window.history.pushState({}, 'Register', '/register');

    const fakeToken = 'mock-reg-token-xyz';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ access_token: fakeToken, token_type: 'bearer' }),
    });
    globalThis.fetch = fetchMock;

    render(<App />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign up|register/i });

    await userEvent.type(emailInput, 'newuser@example.com');
    await userEvent.type(passwordInput, 'validPassword123');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/signup$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'newuser@example.com',
            password: 'validPassword123',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_KEY)).toBe(fakeToken);
      expect(screen.getByText(/dashboard|welcome|home/i)).toBeInTheDocument();
    });
  });

  // R1 AC-2: Registration duplicate email error
  it('displays inline error message when registration fails with 409 duplicate email', async () => {
    window.history.pushState({}, 'Register', '/register');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Email already registered' }),
    });
    globalThis.fetch = fetchMock;

    render(<App />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /sign up|register/i });

    await userEvent.type(emailInput, 'existing@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  // R1 AC-3: Login success
  it('logs in successfully, stores token, and navigates to home', async () => {
    window.history.pushState({}, 'Login', '/login');

    const fakeToken = 'mock-login-token-123';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ access_token: fakeToken, token_type: 'bearer' }),
    });
    globalThis.fetch = fetchMock;

    render(<App />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /log in|sign in/i });

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'correctPassword123');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/auth\/login$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'user@example.com',
            password: 'correctPassword123',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_KEY)).toBe(fakeToken);
      expect(screen.getByText(/dashboard|welcome|home/i)).toBeInTheDocument();
    });
  });

  // R1 AC-4: Login invalid credential error
  it('displays inline error message when login fails with 401 invalid credentials', async () => {
    window.history.pushState({}, 'Login', '/login');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Invalid credentials' }),
    });
    globalThis.fetch = fetchMock;

    render(<App />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /log in|sign in/i });

    await userEvent.type(emailInput, 'user@example.com');
    await userEvent.type(passwordInput, 'wrongPassword');
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  // R1 AC-5: Logout clearing storage and redirecting
  it('clears storage and redirects to login on logout', async () => {
    const existingToken = 'logged-in-token';
    localStorage.setItem(TOKEN_KEY, existingToken);
    window.history.pushState({}, 'Home', '/');

    render(<App />);

    const logoutBtn = await screen.findByRole('button', { name: /log out|logout/i });
    await userEvent.click(logoutBtn);

    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(screen.getByRole('button', { name: /log in|sign in/i })).toBeInTheDocument();
    });
  });

  // R1 AC-6: 401 response interceptor clearing session and routing to login
  it('clears session and redirects to login with expiration notification on 401 interceptor response', async () => {
    const activeToken = 'expired-jwt-token';
    localStorage.setItem(TOKEN_KEY, activeToken);
    window.history.pushState({}, 'Home', '/');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Token has expired' }),
    });
    globalThis.fetch = fetchMock;

    render(<App />);

    // Trigger an authenticated request using client
    await act(async () => {
      await expect(client.get('/todos')).rejects.toThrow();
    });

    await waitFor(() => {
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(screen.getByText(/session expired|logged out/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in|sign in/i })).toBeInTheDocument();
    });
  });
});
