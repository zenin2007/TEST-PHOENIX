import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface SettingsViewProps {
  backendHealthy: boolean;
  onResetData: () => void;
  isResetting: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  backendHealthy,
  onResetData,
  isResetting,
}) => {
  const [confidenceGate] = useState(0.75);
  const [ambiguityMargin] = useState(0.15);
  const [dualVerification] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: 880 }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Engine Settings &amp; Verification Gates
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Configurable parameters governing autonomous self-healing, mathematical candidate scoring, and safety gates.
        </p>
      </div>

      {/* Safety Gate Settings */}
      <Card title="Autonomous Safety Gates" subtitle="Preventing reckless clicks and ensuring explainability">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Confidence Score Gate</div>
              <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Candidates scoring below this threshold are rejected immediately with <code>LOCATOR_NOT_FOUND</code>.
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', background: 'var(--bg-inset)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
              &ge; {confidenceGate}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ambiguity Margin Gate</div>
              <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                When the score gap between #1 candidate and #2 candidate is smaller than this margin, engine flags <code>HUMAN_REVIEW_REQUIRED</code>.
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)', background: 'var(--bg-inset)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
              &ge; {ambiguityMargin}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mandatory Dual Verification</div>
              <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Verifies postconditions in both the front-end UI DOM and SQLite database state before granting <code>SELF-HEALED</code>.
              </div>
            </div>
            <span className="badge-pass">
              {dualVerification ? 'Active Enforced' : 'Disabled'}
            </span>
          </div>
        </div>
      </Card>

      {/* 5-Factor Scoring Weights */}
      <Card title="5-Factor Candidate Scoring Formula" subtitle="Mathematical heuristic weighting">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
          <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>40%</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem' }}>Semantic Intent</div>
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>20%</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem' }}>Accessibility Role</div>
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>15%</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem' }}>Visible Text</div>
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>15%</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem' }}>Context Clues</div>
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>10%</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.2rem' }}>DOM Structure</div>
          </div>
        </div>
      </Card>

      {/* Database & Environment */}
      <Card title="Database &amp; Environment" subtitle="Local storage and connectivity">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>FastAPI Backend Health</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: http://127.0.0.1:8000</div>
            </div>
            <span className={backendHealthy ? 'badge-pass' : 'badge-fail'}>
              {backendHealthy ? 'Online (HTTP 200)' : 'Offline / Connecting'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Reset SQLite Seed State</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Re-seeds tasks and orders to deterministic baseline for repeatable testing.</div>
            </div>
            <Button variant="secondary" onClick={onResetData} isLoading={isResetting}>
              ↺ Reset Database
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
