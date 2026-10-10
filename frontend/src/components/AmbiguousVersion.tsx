import React, { useState } from 'react';

export const AmbiguousVersion: React.FC = () => {
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  const handleSelectStream = (streamName: string) => {
    setSelectedStream(`Selected ${streamName}. Ambiguity safety gate verifies two equivalent candidate actions exist without arbitrary heuristics.`);
  };

  return (
    <div id="ambiguous-version-container" className="version-container">
      {/* Informative Banner */}
      <div className="mode-banner info-banner" style={{ borderLeft: '4px solid var(--status-review)' }}>
        <div>
          <strong>Scenario D — Ambiguous UI Challenge:</strong> This screen presents two equally plausible task creation actions. The engine must refuse to make an unverified guess and escalate to <code>HUMAN REVIEW REQUIRED</code>.
        </div>
        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
          Ambiguity Safety Gate
        </span>
      </div>

      {selectedStream && (
        <div className="alert-success" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{selectedStream}</span>
          <button
            onClick={() => setSelectedStream(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Multi-Stream Workspace (Ambiguous Controls)
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Notice: The canonical selector <code>#create-task-btn</code> does not exist here.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Panel 1 */}
        <div className="task-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary)' }}>
            Workstream Alpha
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.45 }}>
            Primary feature track for core platform components and shared architecture services.
          </p>
          <button
            id="btn-create-task-stream-alpha"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => handleSelectStream('Workstream Alpha')}
          >
            Create Task
          </button>
        </div>

        {/* Panel 2 (Equally plausible) */}
        <div className="task-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary)' }}>
            Workstream Beta
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.45 }}>
            Secondary track for integration test automation and continuous verification pipelines.
          </p>
          <button
            id="btn-create-task-stream-beta"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => handleSelectStream('Workstream Beta')}
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};
