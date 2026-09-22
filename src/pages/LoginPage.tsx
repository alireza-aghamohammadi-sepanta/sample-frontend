import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, expirationMessage, setExpirationMessage } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }
    if (!password) {
      setFormError('Password is required');
      return;
    }

    try {
      setLoading(true);
      setExpirationMessage(null);
      await login({ email: email.trim(), password });
      navigate('/');
    } catch (err: any) {
      setFormError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Log In</h2>
      {expirationMessage && (
        <div
          role="alert"
          className="expiration-message"
          style={{ color: '#b45309', backgroundColor: '#fef3c7', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px' }}
        >
          {expirationMessage}
        </div>
      )}
      {formError && (
        <div
          role="alert"
          className="error-message"
          style={{ color: '#b91c1c', backgroundColor: '#fee2e2', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px' }}
        >
          {formError}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem' }}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.5rem 1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        Don't have an account? <Link to="/register">Sign Up</Link>
      </p>
    </div>
  );
};

export default LoginPage;
