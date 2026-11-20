import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';

export default function AuthPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/projects" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await (mode === 'login' ? login(email, password) : register(email, password));
      navigate('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">
          {mode === 'login' ? 'Log in to see your projects and results.' : 'Start tracking your test cases in a minute.'}
        </p>

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {mode === 'register' && <small className="muted">At least 8 characters.</small>}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <p className="muted center">
          {mode === 'login' ? 'New here? ' : 'Already have an account? '}
          <button type="button" className="link-btn" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </button>
        </p>
        <p className="center">
          <Link to="/" className="muted">
            ← Back to home
          </Link>
        </p>
      </form>
    </div>
  );
}
