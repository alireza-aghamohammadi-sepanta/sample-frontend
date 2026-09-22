import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
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
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      await register({ email: email.trim(), password });
      navigate('/');
    } catch (err: any) {
      setFormError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
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
          {loading ? 'Registering...' : 'Sign Up'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
