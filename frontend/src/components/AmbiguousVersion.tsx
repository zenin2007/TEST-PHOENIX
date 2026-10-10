import React from 'react';

export const AmbiguousVersion: React.FC = () => {
  return (
    <div id="ambiguous-version-container" className="version-container">
      {/* Informative Banner */}
      <div className="mode-banner" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fde68a' }}>
        <div>
          <strong>Scenario D — Ambiguous UI Challenge:</strong> This screen presents two equally plausible task creation actions. The engine must refuse to make an unverified guess and escalate to <code>HUMAN REVIEW REQUIRED</code>.
        </div>
        <span className="badge" style={{ background: '#78350f', color: '#fde68a' }}>
          Ambiguity Safety Gate
        </span>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc' }}>
          Multi-Stream Workspace (Ambiguous Controls)
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Notice: The canonical selector <code>#create-task-btn</code> does not exist here.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Panel 1 */}
        <div className="task-card" style={{ padding: '1.75rem', border: '1px solid #475569' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: '#60a5fa' }}>
            Workstream Alpha
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Primary feature track for core platform components.
          </p>
          <button
            id="btn-create-task-stream-alpha"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => alert('Alpha stream selected')}
          >
            Create Task
          </button>
        </div>

        {/* Panel 2 (Equally plausible) */}
        <div className="task-card" style={{ padding: '1.75rem', border: '1px solid #475569' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: '#a78bfa' }}>
            Workstream Beta
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Secondary track for integration test automation.
          </p>
          <button
            id="btn-create-task-stream-beta"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => alert('Beta stream selected')}
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};
