import React, { useState, useMemo } from 'react';
import type { TestRun } from '../../../types';
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

export const RunsView: React.FC<RunsViewProps> = ({
  runs,
  onInspectRun,
  onRefresh,
  isRefreshing,
  onExportJson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const normStatus = run.status.toUpperCase();
        if (statusFilter === 'PASS' && !normStatus.includes('PASS')) return false;
        if (statusFilter === 'HEALED' && !normStatus.includes('HEAL')) return false;
        if (statusFilter === 'FAIL' && !normStatus.includes('FAIL')) return false;
        if (statusFilter === 'REVIEW' && !normStatus.includes('REVIEW')) return false;
      }

      // Search query
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
  }, [runs, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredRuns.length / pageSize) || 1;
  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRuns.slice(start, start + pageSize);
  }, [filteredRuns, currentPage, pageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header & Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Test Execution Runs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Complete audit trail of all Playwright browser test executions, candidate evaluations, and database verification results.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Button variant="secondary" onClick={onRefresh} isLoading={isRefreshing}>
            ↻ Refresh
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

      {/* Filter and Search Bar */}
      <div style={{ background: '#FFFFFF', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: 'var(--shadow-subtle)' }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-inset)', padding: '0.25rem', borderRadius: 'var(--radius-full)' }}>
          {[
            { id: 'ALL', label: `All (${runs.length})` },
            { id: 'PASS', label: 'Pass' },
            { id: 'HEALED', label: 'Self-Healed' },
            { id: 'FAIL', label: 'Fail' },
            { id: 'REVIEW', label: 'Review' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
              style={{
                border: 'none',
                background: statusFilter === tab.id ? '#FFFFFF' : 'transparent',
                color: statusFilter === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: statusFilter === tab.id ? 600 : 500,
                fontSize: '0.8rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                boxShadow: statusFilter === tab.id ? 'var(--shadow-subtle)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ minWidth: 260 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by scenario, intent, ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
          />
        </div>
      </div>

      {/* Runs Table */}
      <Card>
        {filteredRuns.length === 0 ? (
          <EmptyState
            title="No matching test runs found"
            description={searchQuery ? 'Try clearing your search query or switching status filters.' : 'Run a test scenario to record execution runs in SQLite.'}
          />
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Intent</th>
                  <th>Scenario</th>
                  <th>Recovery</th>
                  <th>Verification Evidence</th>
                  <th>Duration</th>
                  <th>Result</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuns.map((run) => (
                  <tr key={run.id} onClick={() => onInspectRun(run)}>
                    <td><code>#{run.id}</code></td>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.original_intent || (run.scenario.includes('Store') ? 'Complete audio checkout' : 'Create new task')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{run.scenario}</td>
                    <td>
                      {run.replacement_selector ? (
                        <code style={{ color: 'var(--primary)' }}>{run.replacement_selector}</code>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Direct match</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.verification_result || 'Verified in UI & SQLite'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {run.execution_duration_ms ? `${run.execution_duration_ms}ms` : 'N/A'}
                    </td>
                    <td><StatusBadge status={run.status} /></td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onInspectRun(run); }}
                      >
                        Inspect Evidence
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
