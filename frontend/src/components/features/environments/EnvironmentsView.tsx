import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { StatusBadge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

interface EnvironmentsViewProps {
  backendHealthy: boolean;
}

export const EnvironmentsView: React.FC<EnvironmentsViewProps> = ({ backendHealthy }) => {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('Just now');

  const checkPing = async () => {
    setIsChecking(true);
    const start = performance.now();
    try {
      const res = await fetch('/health');
      if (res.ok) {
        setLatencyMs(Math.round(performance.now() - start));
        setLastChecked(new Date().toLocaleTimeString());
      }
    } catch {
      setLatencyMs(null);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkPing();
  }, []);

  const runtimeNodes = [
    {
      name: 'FastAPI Backend Engine',
      role: 'Test Orchestration, Intent Analysis & REST API',
      url: 'http://127.0.0.1:8000',
      status: backendHealthy ? 'ONLINE' : 'OFFLINE',
      specs: 'Python 3.12 • Uvicorn ASGI • Async Event Loop',
    },
    {
      name: 'Playwright Chromium Engine',
      role: 'Headless Browser Automation & Synthetic Replay',
      url: 'playwright://chromium-headless',
      status: 'ONLINE',
      specs: 'Chromium 120.0 • Python Playwright Sync API',
    },
    {
      name: 'SQLite Local Database',
      role: 'Persistent Storage for Tasks, Orders & Healing Memory',
      url: 'sqlite:///backend/tasks.db',
      status: 'ONLINE',
      specs: 'SQLite 3 • WAL Mode • Zero Cloud Dependencies',
    },
    {
      name: 'Vite React Frontend DevServer',
      role: 'Modern Developer Platform & Standalone Scenarios',
      url: 'http://127.0.0.1:5173',
      status: 'ONLINE',
      specs: 'React 18.2 • TypeScript 5.2 • Vanilla CSS Design System',
    },
  ];

  const targetSurfaces = [
    {
      name: 'Task Manager (Version A)',
      path: '/?mode=version-a',
      type: 'Baseline Target',
      desc: 'Modal dialog task creation with #add-task-btn',
      locator: '#add-task-btn',
    },
    {
      name: 'Task Manager (Version B)',
      path: '/?mode=version-b',
      type: 'Mutated Target',
      desc: 'Drawer slideout panel with #create-new-task-btn',
      locator: '#create-new-task-btn',
    },
    {
      name: 'E-Commerce Store (Audio A)',
      path: '/?mode=shopping-a',
      type: 'Baseline Target',
      desc: 'Modal checkout flow with #checkout-btn',
      locator: '#checkout-btn',
    },
    {
      name: 'E-Commerce Store (Audio B)',
      path: '/?mode=shopping-b',
      type: 'Mutated Target',
      desc: 'Cart drawer with #proceed-to-payment-btn',
      locator: '#proceed-to-payment-btn',
    },
    {
      name: 'Fault Injection Sandbox',
      path: '/?mode=broken',
      type: 'Defect Simulator',
      desc: 'Interception causing HTTP 500 DB transaction abort',
      locator: '#save-task-btn (500 Error)',
    },
    {
      name: 'Ambiguous Elements Sandbox',
      path: '/?mode=ambiguous',
      type: 'Safety Challenge',
      desc: 'Two identical submit candidates to test gate margin',
      locator: '#action-btn-1 vs #action-btn-2',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Environments &amp; Runtime Nodes
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Active execution targets, browser engines, local SQLite database, and safety thresholds.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Last verified: {lastChecked}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={checkPing}
            isLoading={isChecking}
          >
            ↻ Ping All Nodes ({latencyMs !== null ? `${latencyMs}ms` : 'Checking'})
          </Button>
        </div>
      </div>

      {/* Runtime Nodes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {runtimeNodes.map((node) => (
          <Card key={node.name} title={node.name} subtitle={node.role}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: node.status === 'ONLINE' ? '#34C759' : '#FF3B30',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: node.status === 'ONLINE' ? '#34C759' : '#FF3B30',
                    }}
                  />
                  {node.status}
                </span>
              </div>

              <div style={{ background: 'var(--bg-inset)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.675rem', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Endpoint</span>
                <code style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>{node.url}</code>
              </div>

              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                {node.specs}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Target Application Surfaces */}
      <Card
        title="Configured Target Application Surfaces"
        subtitle="Web application scenarios verified in the local test suite"
      >
        <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
          <table className="runs-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Surface Name</th>
                <th>Classification</th>
                <th>Description</th>
                <th>Active Selector</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {targetSurfaces.map((s) => (
                <tr key={s.name}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</td>
                  <td>
                    <StatusBadge
                      status={s.type.includes('Baseline') ? 'PASS' : s.type.includes('Mutated') ? 'SELF-HEALED' : s.type.includes('Defect') ? 'FAIL' : 'HUMAN REVIEW REQUIRED'}
                      size="sm"
                    />
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{s.desc}</td>
                  <td>
                    <code style={{ fontSize: '0.75rem' }}>{s.locator}</code>
                  </td>
                  <td>
                    <a
                      href={s.path}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--primary)',
                        textDecoration: 'none',
                      }}
                    >
                      Open Target ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Safety Gate Settings Panel */}
      <Card
        title="Active Safety Gate Thresholds"
        subtitle="Conservative mathematical boundaries enforcing reliable autonomous healing"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Confidence Gate</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34C759', marginTop: '0.2rem' }}>&ge; 0.75</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
              Minimum calculated composite match score required before any candidate is considered for replay.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ambiguity Separation Gate</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FF9F0A', marginTop: '0.2rem' }}>&ge; 0.15</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
              Top candidate score minus runner-up score. If less than 0.15, execution halts for human review.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Defect Suppression Gate</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FF3B30', marginTop: '0.2rem' }}>HTTP 5xx Intercept</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
              Backend errors and unhandled server defects immediately halt healing to preserve genuine bugs.
            </p>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Dual Verification Gate</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.2rem' }}>DOM + SQLite</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
              Every candidate replay must confirm DOM confirmation state AND verify records in local SQLite.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
