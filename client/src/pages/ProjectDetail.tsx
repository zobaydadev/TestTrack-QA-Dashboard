import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, Project, RunSummary, Stats, Status, TestCase } from '../api';

type Tab = 'cases' | 'run' | 'history' | 'dashboard';

const COLORS = { pass: '#16a34a', fail: '#dc2626', blocked: '#d97706' };

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<Tab>('cases');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, c, r, s] = await Promise.all([
        api<Project>(`/projects/${id}`),
        api<TestCase[]>(`/projects/${id}/testcases`),
        api<RunSummary[]>(`/projects/${id}/runs`),
        api<Stats>(`/projects/${id}/stats`),
      ]);
      setProject(p);
      setCases(c);
      setRuns(r);
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load project');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <div className="container page">
        <p className="error" role="alert">
          {error}
        </p>
        <Link to="/projects">← Back to projects</Link>
      </div>
    );
  }
  if (!project) return <p className="container muted page">Loading…</p>;

  return (
    <div className="container page">
      <Link to="/projects" className="muted">
        ← All projects
      </Link>
      <h1>{project.name}</h1>
      {project.description && <p className="muted">{project.description}</p>}

      <div className="tabs" role="tablist">
        {(
          [
            ['cases', `Test cases (${cases.length})`],
            ['run', 'Record a run'],
            ['history', `History (${runs.length})`],
            ['dashboard', 'Dashboard'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'cases' && <CasesTab projectId={project.id} cases={cases} reload={load} />}
      {tab === 'run' && <RunTab projectId={project.id} cases={cases} onSaved={async () => { await load(); setTab('dashboard'); }} />}
      {tab === 'history' && <HistoryTab runs={runs} />}
      {tab === 'dashboard' && <DashboardTab stats={stats} />}
    </div>
  );
}

function CasesTab({ projectId, cases, reload }: { projectId: number; cases: TestCase[]; reload: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [error, setError] = useState('');

  async function add(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api<TestCase>(`/projects/${projectId}/testcases`, {
        method: 'POST',
        body: { title, steps: steps || undefined, expected: expected || undefined, priority },
      });
      setTitle('');
      setSteps('');
      setExpected('');
      setPriority('medium');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add test case');
    }
  }

  async function remove(c: TestCase) {
    if (!window.confirm(`Delete test case "${c.title}"?`)) return;
    await api<void>(`/testcases/${c.id}`, { method: 'DELETE' });
    await reload();
  }

  return (
    <>
      <form className="card form-grid" onSubmit={add}>
        <input placeholder="Test case title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} aria-label="Test case title" />
        <select value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')} aria-label="Priority">
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <textarea placeholder="Steps (optional)" value={steps} onChange={(e) => setSteps(e.target.value)} rows={2} aria-label="Steps" />
        <textarea placeholder="Expected result (optional)" value={expected} onChange={(e) => setExpected(e.target.value)} rows={2} aria-label="Expected result" />
        <button className="btn btn-primary">Add test case</button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {cases.length === 0 ? (
        <div className="card empty">
          <h3>No test cases yet</h3>
          <p className="muted">Add the first one above.</p>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Priority</th>
                <th>Expected result</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>
                    <span className={`pill prio-${c.priority}`}>{c.priority}</span>
                  </td>
                  <td className="muted">{c.expected || '—'}</td>
                  <td>
                    <button className="link-btn danger" onClick={() => void remove(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function RunTab({ projectId, cases, onSaved }: { projectId: number; cases: TestCase[]; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  if (cases.length === 0) {
    return (
      <div className="card empty">
        <h3>Nothing to run yet</h3>
        <p className="muted">Add test cases first, then come back to record a run.</p>
      </div>
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api(`/projects/${projectId}/runs`, {
        method: 'POST',
        body: {
          name,
          results: cases.map((c) => ({ testCaseId: c.id, status: status[c.id] ?? 'pass', notes: notes[c.id] || undefined })),
        },
      });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save run');
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <input placeholder="Run name, for example Release 1.0 regression" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} aria-label="Run name" />
      <div className="run-list">
        {cases.map((c) => (
          <div key={c.id} className="run-row">
            <span className="run-title">{c.title}</span>
            <select value={status[c.id] ?? 'pass'} onChange={(e) => setStatus({ ...status, [c.id]: e.target.value as Status })} aria-label={`Result for ${c.title}`}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="blocked">Blocked</option>
            </select>
            <input placeholder="Notes (optional)" value={notes[c.id] ?? ''} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} maxLength={1000} aria-label={`Notes for ${c.title}`} />
          </div>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary">Save run</button>
    </form>
  );
}

function HistoryTab({ runs }: { runs: RunSummary[] }) {
  if (runs.length === 0) {
    return (
      <div className="card empty">
        <h3>No runs recorded</h3>
        <p className="muted">Record your first run to see history here.</p>
      </div>
    );
  }
  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Run</th>
            <th>Date</th>
            <th>Pass</th>
            <th>Fail</th>
            <th>Blocked</th>
          </tr>
        </thead>
        <tbody>
          {[...runs].reverse().map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td className="muted">{new Date(r.created_at).toLocaleDateString()}</td>
              <td className="ok">{r.pass}</td>
              <td className="bad">{r.fail}</td>
              <td className="warn">{r.blocked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardTab({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const total = stats.results.pass + stats.results.fail + stats.results.blocked;
  if (total === 0) {
    return (
      <div className="card empty">
        <h3>No results yet</h3>
        <p className="muted">Record a run and the dashboard will fill in.</p>
      </div>
    );
  }
  const pie = [
    { name: 'Pass', value: stats.results.pass, color: COLORS.pass },
    { name: 'Fail', value: stats.results.fail, color: COLORS.fail },
    { name: 'Blocked', value: stats.results.blocked, color: COLORS.blocked },
  ].filter((p) => p.value > 0);

  return (
    <>
      <div className="grid-4 stat-cards">
        <div className="card stat">
          <small>Pass rate</small>
          <strong>{stats.passRate}%</strong>
        </div>
        <div className="card stat">
          <small>Test cases</small>
          <strong>{stats.testCases}</strong>
        </div>
        <div className="card stat">
          <small>Runs</small>
          <strong>{stats.runs}</strong>
        </div>
        <div className="card stat">
          <small>Results recorded</small>
          <strong>{total}</strong>
        </div>
      </div>
      <div className="grid-2">
        <div className="card chart">
          <h3>Overall results</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {pie.map((p) => (
                  <Cell key={p.name} fill={p.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card chart">
          <h3>Results per run</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byRun}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pass" stackId="a" fill={COLORS.pass} name="Pass" />
              <Bar dataKey="fail" stackId="a" fill={COLORS.fail} name="Fail" />
              <Bar dataKey="blocked" stackId="a" fill={COLORS.blocked} name="Blocked" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
