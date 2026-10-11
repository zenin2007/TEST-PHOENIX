import React from 'react';
import type { TestRun, NavigationTab } from '../../../types';
import { Card } from '../../ui/Card';
import { StatusBadge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';

interface OverviewViewProps {
  runs: TestRun[];
  onSelectTab: (tab: NavigationTab) => void;
  onOpenQuickRun: () => void;
  onInspectRun: (run: TestRun) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  runs,
  onSelectTab,
  onOpenQuickRun,
  onInspectRun,
}) => {
  const total = runs.length;
  const selfHealed = runs.filter((r) => r.status === 'SELF-HEALED');
  const passes = runs.filter((r) => r.status === 'PASS');
  const failures = runs.filter((r) => r.status === 'FAIL');
  const reviews = runs.filter((r) => r.status === 'HUMAN REVIEW REQUIRED');

  const healthScore = total > 0 ? Math.round(((passes.length + selfHealed.length) / total) * 100) : null;
  const mostRecentHealed = selfHealed.length > 0 ? selfHealed[0] : null;
  const attentionItems = [...failures, ...reviews];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Platform Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFC 100%)',
          padding: '2rem 2.25rem',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div style={{ maxWidth: 680 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: '0.35rem' }}>
            Intent-Aware Test Automation
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '0.45rem' }}>
            UI changes. Intent stays the same.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
            TestPhoenix detects interface changes, understands original intent, reconstructs workflows dynamically,
            and validates that outcomes occurred before certifying recovery.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => onSelectTab('recovery')}>
            <span>🛡️</span> View Signature Recovery
          </Button>
          <Button variant="primary" onClick={onOpenQuickRun}>
            <span>▶</span> Run Test Now
          </Button>
        </div>
      </div>

      {/* The 3 Core Platform Answers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {/* 1. How healthy are my tests? */}
        <Card
          title="1. Test Health"
          subtitle="Passes & verified recoveries"
          style={{ borderTop: '4px solid var(--status-pass)' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', margin: '0.75rem 0' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {healthScore !== null ? `${healthScore}%` : 'N/A'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {total > 0 ? `across ${total} runs` : 'No runs executed yet'}
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1.25rem' }}>
            {healthScore !== null && healthScore >= 90
              ? 'Excellent stability. Tests surviving interface redesigns with certified outcomes.'
              : total === 0
              ? 'Execute a test scenario to record baseline health and telemetry.'
              : 'Attention needed. Investigate genuine defects or ambiguous UI matches below.'}
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-done">{passes.length} Passed</span>
            <span className="badge badge-done">{selfHealed.length} Self-Healed</span>
          </div>
        </Card>

        {/* 2. What was recently healed? */}
        <Card
          title="2. Recently Healed"
          subtitle="Most recent dynamic recovery"
          style={{ borderTop: '4px solid var(--primary)' }}
        >
          {mostRecentHealed ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {mostRecentHealed.scenario}
              </div>

              <div style={{ fontSize: '0.75rem', background: 'var(--bg-inset)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Mutated Selector:</span>{' '}
                <code>{mostRecentHealed.original_locator || '#btn'}</code>
                <div style={{ marginTop: '0.2rem' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Recovered:</span>{' '}
                  <code>{mostRecentHealed.replacement_selector}</code>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <span className="badge-healed" style={{ fontSize: '0.75rem' }}>
                  Score: {mostRecentHealed.candidate_score ? `${Math.round(mostRecentHealed.candidate_score * 100)}%` : 'Verified'}
                </span>
                <Button size="sm" variant="ghost" onClick={() => onInspectRun(mostRecentHealed)}>
                  Inspect Evidence →
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No recent self-healing events. Run a redesigned Version B scenario to observe automatic workflow reconstruction.
            </div>
          )}
        </Card>

        {/* 3. What needs attention? */}
        <Card
          title="3. Needs Attention"
          subtitle="Genuine failures & ambiguity"
          style={{ borderTop: attentionItems.length > 0 ? '4px solid var(--status-fail)' : '4px solid var(--border-color)' }}
        >
          {attentionItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-fail-text)' }}>
                  {attentionItems.length}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  item{attentionItems.length > 1 ? 's' : ''} flagged for review
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 90, overflowY: 'auto' }}>
                {attentionItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onInspectRun(item)}
                    style={{
                      fontSize: '0.775rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: 'var(--radius-xs)',
                      background: item.status === 'FAIL' ? 'var(--status-fail-bg)' : 'var(--status-review-bg)',
                      color: item.status === 'FAIL' ? 'var(--status-fail-text)' : 'var(--status-review-text)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{item.scenario}</span>
                    <span>#{item.id}</span>
                  </div>
                ))}
              </div>

              <Button size="sm" variant="secondary" onClick={() => onSelectTab('runs')}>
                Review Flagged Runs ({attentionItems.length})
              </Button>
            </div>
          ) : (
            <div style={{ padding: '1.5rem 0', color: 'var(--status-pass-text)', fontSize: '0.85rem', fontWeight: 500 }}>
              ✓ All runs verified safe. Zero unaddressed failures or ambiguous halts.
            </div>
          )}
        </Card>
      </div>

      {/* Recent Runs Table Card */}
      <Card
        title="Recent Test Runs"
        subtitle="Last 5 Playwright execution records"
        action={
          <Button size="sm" variant="secondary" onClick={() => onSelectTab('runs')}>
            View All Runs ({total}) →
          </Button>
        }
      >
        {runs.length === 0 ? (
          <EmptyState
            title="No test runs recorded yet"
            description="Launch your first automated Playwright scenario to collect telemetry and audit data."
            action={<Button variant="primary" onClick={onOpenQuickRun}>Run First Test</Button>}
          />
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Test ID</th>
                  <th>Intent</th>
                  <th>Scenario</th>
                  <th>Recovery</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 5).map((run) => (
                  <tr key={run.id} onClick={() => onInspectRun(run)}>
                    <td><code>#{run.id}</code></td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.original_intent || (run.scenario.includes('Store') ? 'Complete audio checkout' : 'Create new task')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{run.scenario}</td>
                    <td>
                      {run.replacement_selector ? (
                        <code>{run.replacement_selector}</code>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Direct match</span>
                      )}
                    </td>
                    <td>{run.execution_duration_ms ? `${run.execution_duration_ms}ms` : 'N/A'}</td>
                    <td><StatusBadge status={run.status} /></td>
                    <td>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onInspectRun(run); }}>
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
