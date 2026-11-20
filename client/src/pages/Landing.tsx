import { Link } from 'react-router-dom';

const features = [
  {
    icon: '📁',
    title: 'Organise by project',
    text: 'Keep every product or release in its own project, with its own test cases and history.',
  },
  {
    icon: '✍️',
    title: 'Write clear test cases',
    text: 'Capture title, steps, expected result and priority, so anyone on the team can run them.',
  },
  {
    icon: '▶️',
    title: 'Record test runs',
    text: 'Mark each case as pass, fail or blocked, add notes, and save the whole run in one go.',
  },
  {
    icon: '📊',
    title: 'See the trend',
    text: 'The dashboard shows pass rate and results per run, so you can tell if quality is improving.',
  },
];

const steps = [
  { n: '1', title: 'Create a project', text: 'Name it after your product or release.' },
  { n: '2', title: 'Add test cases', text: 'Describe what to check and what should happen.' },
  { n: '3', title: 'Run and record', text: 'Execute the cases and save pass, fail or blocked.' },
  { n: '4', title: 'Review the dashboard', text: 'Spot failures and follow the pass rate over time.' },
];

const facts = [
  { value: '15', label: 'REST API endpoints' },
  { value: '18', label: 'automated API tests in CI' },
  { value: 'JWT', label: 'secured sign-in' },
  { value: 'SQL', label: 'PostgreSQL data model' },
];

const stack = ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'JWT', 'Docker', 'GitHub Actions'];

function DashboardPreview() {
  return (
    <div className="preview card" aria-label="Dashboard preview with sample data">
      <div className="preview-head">
        <strong>Release 1.0 regression</strong>
        <span className="pill">Sample data</span>
      </div>
      <div className="preview-body">
        <div className="donut" role="img" aria-label="Pass rate 72 percent">
          <div className="donut-hole">
            <strong>72%</strong>
            <small>pass rate</small>
          </div>
        </div>
        <ul className="legend">
          <li>
            <i className="dot pass" /> Pass <b>18</b>
          </li>
          <li>
            <i className="dot fail" /> Fail <b>5</b>
          </li>
          <li>
            <i className="dot blocked" /> Blocked <b>2</b>
          </li>
        </ul>
      </div>
      <div className="bars" role="img" aria-label="Pass rate per run rising across five runs">
        {[45, 55, 62, 68, 72].map((h, i) => (
          <div key={i} className="bar-col">
            <div className="bar" style={{ height: `${h}%` }} />
            <small>Run {i + 1}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Test management, made simple</span>
            <h1>
              Know exactly where your <span className="grad">quality</span> stands.
            </h1>
            <p className="lead">
              TestTrack keeps your test cases, test runs and results in one place, and turns them into a clear
              pass/fail dashboard your whole team can read.
            </p>
            <div className="cta">
              <Link to="/login?mode=register" className="btn btn-primary btn-lg">
                Get started
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Log in
              </Link>
            </div>
            <p className="muted small">Create an account and add your first project in a minute.</p>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section className="facts">
        <div className="container facts-grid">
          {facts.map((f) => (
            <div key={f.label} className="fact">
              <strong>{f.value}</strong>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Everything you need to track quality</h2>
          <p className="section-sub">Four simple building blocks, from first test case to release decision.</p>
          <div className="grid-4">
            {features.map((f) => (
              <div key={f.title} className="card feature">
                <div className="icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <div className="grid-4">
            {steps.map((s) => (
              <div key={s.n} className="step">
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container center">
          <h2 className="section-title">Built with</h2>
          <p className="section-sub">A full-stack project with a typed React front end, a REST API and a relational database.</p>
          <div className="chips">
            {stack.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container center">
          <h2>Ready to see your results at a glance?</h2>
          <Link to="/login?mode=register" className="btn btn-light btn-lg">
            Create your account
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <span>© 2026 TestTrack</span>
          <a href="https://github.com/zobaydadev" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </>
  );
}
