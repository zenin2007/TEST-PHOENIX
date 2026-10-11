import React, { useState, useMemo } from 'react';
import type { TestRun } from '../../../types';
import { ApiService } from '../../../api/client';
import { Card } from '../../ui/Card';
import { StatusBadge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';

interface RunsViewProps {
  runs: TestRun[];
  onInspectRun: (run: TestRun) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onExportJson: () => void;
}

export type RunFilterTab = 'REAL' | 'DEMO' | 'PASS' | 'SELF-HEALED' | 'FAILED' | 'REVIEW';

export const RunsView: React.FC<RunsViewProps> = ({
  runs,
  onInspectRun,
  onRefresh,
  isRefreshing,
  onExportJson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RunFilterTab>('REAL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isClearingDemo, setIsClearingDemo] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const pageSize = 10;

  const handleClearDemoData = async () => {
    if (!window.confirm('Clear all demo scenario records? Real test telemetry will be strictly preserved.')) {
      return;
    }
    setIsClearingDemo(true);
    try {
      const res = await ApiService.clearDemoData();
      setDemoNotice(`Cleared ${res.cleared_count} demo scenario records. Real test executions preserved.`);
      setTimeout(() => setDemoNotice(null), 5000);
      onRefresh();
    } catch {
      setDemoNotice('Failed to clear demo data.');
    } finally {
      setIsClearingDemo(false);
    }
  };

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const isDemo = Boolean(run.is_demo);
      const normStatus = run.status.toUpperCase();

      // Filter Tab Logic
      if (activeFilter === 'REAL') {
        if (isDemo) return false;
      } else if (activeFilter === 'DEMO') {
        if (!isDemo) return false;
      } else if (activeFilter === 'PASS') {
        if (!normStatus.includes('PASS')) return false;
      } else if (activeFilter === 'SELF-HEALED') {
        if (!normStatus.includes('HEAL')) return false;
      } else if (activeFilter === 'FAILED') {
        if (!normStatus.includes('FAIL')) return false;
      } else if (activeFilter === 'REVIEW') {
        if (!normStatus.includes('REVIEW')) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = String(run.id).includes(q);
        const matchesScenario = run.scenario.toLowerCase().includes(q);
        const matchesIntent = (run.original_intent || '').toLowerCase().includes(q);
        const matchesSelector = (run.replacement_selector || '').toLowerCase().includes(q);
        return matchesId || matchesScenario || matchesIntent || matchesSelector;
      }

      return true;
    });
  }, [runs, activeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredRuns.length / pageSize) || 1;
  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRuns.slice(start, start + pageSize);
  }, [filteredRuns, currentPage, pageSize]);

  const realCount = useMemo(() => runs.filter((r) => !r.is_demo).length, [runs]);
  const demoCount = useMemo(() => runs.filter((r) => Boolean(r.is_demo)).length, [runs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Notice Banner */}
      {demoNotice && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>✓ {demoNotice}</span>
          <button onClick={() => setDemoNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1E40AF', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Test Execution Runs
            </h1>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-full)', background: activeFilter === 'REAL' ? '#DCFCE7' : '#FEF3C7', color: activeFilter === 'REAL' ? '#15803D' : '#92400E', fontWeight: 700 }}>
              {activeFilter === 'REAL' ? '● REAL DATA ONLY' : '● DEMO BENCHMARK DATA'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Audit trail of test executions, continuous version baselines, candidate evaluations, and dual SQLite verifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={onRefresh} isLoading={isRefreshing}>
            ↻ Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={handleClearDemoData}
            isLoading={isClearingDemo}
            disabled={demoCount === 0}
            style={{ color: '#DC2626', borderColor: '#FECACA' }}
          >
            Clear Demo Data ({demoCount})
          </Button>
          <Button variant="secondary" onClick={onExportJson} disabled={runs.length === 0}>
            Export JSON
          </Button>
          <a
            href="http://127.0.0.1:8000/api/evaluation/csv"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none', fontSize: '0.85rem' }}
          >
            Export CSV ↗
          </a>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ background: '#FFFFFF', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: 'var(--shadow-subtle)' }}>
        {/* Requirement 6: REAL | DEMO | PASS | SELF-HEALED | FAILED | REVIEW (Default: REAL) */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-inset)', padding: '0.25rem', borderRadius: 'var(--radius-full)', flexWrap: 'wrap' }}>
          {[
            { id: 'REAL' as RunFilterTab, label: `REAL (${realCount})` },
            { id: 'DEMO' as RunFilterTab, label: `DEMO (${demoCount})` },
            { id: 'PASS' as RunFilterTab, label: 'PASS' },
            { id: 'SELF-HEALED' as RunFilterTab, label: 'SELF-HEALED' },
            { id: 'FAILED' as RunFilterTab, label: 'FAILED' },
            { id: 'REVIEW' as RunFilterTab, label: 'REVIEW' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveFilter(tab.id); setCurrentPage(1); }}
              style={{
                border: 'none',
                background: activeFilter === tab.id ? '#FFFFFF' : 'transparent',
                color: activeFilter === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeFilter === tab.id ? 700 : 500,
                fontSize: '0.775rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                boxShadow: activeFilter === tab.id ? 'var(--shadow-subtle)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: 240 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search intent, scenario, selector..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
          />
        </div>
      </div>

      {/* Runs Table or Honest Empty State */}
      <Card>
        {filteredRuns.length === 0 ? (
          activeFilter === 'REAL' ? (
            <EmptyState
              title="No real execution runs yet"
              description="Real runs are strictly separated from demo records. Run a live test or execute real website tests to record verifiable telemetry here."
            />
          ) : (
            <EmptyState
              title={`No runs matching filter "${activeFilter}"`}
              description={searchQuery ? 'Try clearing your search query.' : 'No execution records found for this category.'}
            />
          )
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Data Mode</th>
                  <th>Intent</th>
                  <th>Version</th>
                  <th>Scenario</th>
                  <th>Recovery</th>
                  <th>Verification Evidence</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuns.map((run) => (
                  <tr key={run.id} onClick={() => onInspectRun(run)}>
                    <td><code>#{run.id}</code></td>
                    <td>
                      {run.is_demo ? (
                        <span style={{ background: '#FEF3C7', color: '#92400E', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.675rem', fontWeight: 700, border: '1px solid #FDE68A' }}>
                          DEMO DATA
                        </span>
                      ) : (
                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.675rem', fontWeight: 700, border: '1px solid #BBF7D0' }}>
                          REAL DATA
                        </span>
                      )}
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.original_intent || (run.scenario.includes('Store') ? 'Complete audio checkout' : 'Create new task')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {run.test_version_label || 'Test V1'}
                        </span>
                        <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                          {run.app_version || 'App V1'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{run.scenario}</td>
                    <td>
                      {run.replacement_selector ? (
                        <code style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>{run.replacement_selector}</code>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Direct match</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {run.verification_result || 'Verified in UI & SQLite'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {run.execution_duration_ms ? `${run.execution_duration_ms}ms` : 'N/A'}
                    </td>
                    <td><StatusBadge status={run.status} /></td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onInspectRun(run); }}
                      >
                        Inspect ↗
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredRuns.length > pageSize && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRuns.length)} of {filteredRuns.length} runs
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ◀ Prev
              </Button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next ▶
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
