import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Project } from '../api';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setProjects(await api<Project[]>('/projects'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api<Project>('/projects', { method: 'POST', body: { name, description: description || undefined } });
      setName('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
    }
  }

  async function remove(p: Project) {
    if (!window.confirm(`Delete "${p.name}" and all its test cases and runs?`)) return;
    try {
      await api<void>(`/projects/${p.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete project');
    }
  }

  return (
    <div className="container page">
      <h1>Your projects</h1>

      <form className="card inline-form" onSubmit={create}>
        <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} aria-label="Project name" />
        <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} aria-label="Description" />
        <button className="btn btn-primary">Add project</button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="muted">Loading…</p>}
      {!loading && projects.length === 0 && (
        <div className="card empty">
          <h3>No projects yet</h3>
          <p className="muted">Create your first project above, then add test cases to it.</p>
        </div>
      )}

      <div className="grid-3">
        {projects.map((p) => (
          <div key={p.id} className="card project-card">
            <Link to={`/projects/${p.id}`} className="project-link">
              <h3>{p.name}</h3>
              <p className="muted">{p.description || 'No description'}</p>
            </Link>
            <div className="project-foot">
              <span className="pill">{p.test_case_count ?? 0} test cases</span>
              <button className="link-btn danger" onClick={() => void remove(p)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
