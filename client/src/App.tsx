import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './auth';
import AuthPage from './pages/AuthPage';
import Landing from './pages/Landing';
import ProjectDetail from './pages/ProjectDetail';
import Projects from './pages/Projects';

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="TestTrack home">
      <span className="logo-mark">✓</span>
      <span>TestTrack</span>
    </Link>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Logo />
        <nav className="nav-links">
          {user ? (
            <>
              <NavLink to="/projects">Projects</NavLink>
              <span className="nav-user">{user.email}</span>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/login?mode=register" className="btn btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="container muted">Loading…</p>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthPage />} />
          <Route
            path="/projects"
            element={
              <Protected>
                <Projects />
              </Protected>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <Protected>
                <ProjectDetail />
              </Protected>
            }
          />
          <Route path="*" element={<p className="container muted">Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
