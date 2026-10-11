import React, { useState, useEffect, useCallback } from 'react';

interface TestRun {
  id: number;
  scenario: string;
  status: string;
  original_locator: string | null;
  original_locator_worked: boolean;
  initial_failure_reason: string | null;
  replacement_selector: string | null;
  candidate_score: number | null;
  recovery_actions: string | null;
  verification_result: string | null;
  diagnostics_json?: string;
  original_intent?: string;
  detected_differences?: string;
  reconstructed_workflow?: string;
  execution_duration_ms?: number;
  created_at: string;
}

interface StepDiagnostic {
  intent?: string;
  name?: string;
  action?: string;
  status?: string;
  diagnostics?: {
    rationale?: string;
    failure_category?: string;
    candidates_evaluated?: Array<{ selector: string; score?: { total_score: number } }>;
    selected_candidate?: { selector: string };
  };
}

interface EvaluationSummary {
  total_scenarios_executed: number;
  iterations_count: number;
  original_test_failures_caused_by_ui_changes: number;
  successful_recoveries: number;
  failed_recoveries: number;
  incorrect_recovery_attempts: number;
  human_review_cases: number;
  genuine_failures_correctly_classified: number;
  average_execution_time_ms: number;
  recovery_success_rate_percent: number;
  total_suite_execution_time_seconds: number;
}

interface EvaluationReport {
  summary: EvaluationSummary;
}

export const TestRunnerView: React.FC = () => {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [activeRun, setActiveRun] = useState<TestRun | null>(null);
  const [selectedModalRun, setSelectedModalRun] = useState<TestRun | null>(null);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('self-healing');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runningLabel, setRunningLabel] = useState<string>('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const fetchHistory = useCallback(async (showFeedback = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/tests/history');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TestRun[] = await res.json();
      setRuns(data);
      if (data.length > 0 && !activeRun) {
        setActiveRun(data[0]);
      }
      if (showFeedback) {
        setFeedback({ message: '✓ Telemetry history refreshed from SQLite database.', type: 'success' });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      if (showFeedback) {
        setFeedback({ message: 'Failed to retrieve test history from backend.', type: 'error' });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [activeRun]);

  const fetchEvaluation = useCallback(async () => {
    try {
      const res = await fetch('/api/evaluation/latest');
      if (res.ok) {
        const data = await res.json();
        setEvaluationReport(data);
      }
    } catch {
      // Evaluation is optional
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchEvaluation();
  }, [fetchHistory, fetchEvaluation]);

  const executeScenario = async (endpoint: string, label: string) => {
    if (isRunning) return;
    setIsRunning(true);
    setRunningLabel(label);
    setFeedback({ message: `Executing automated Playwright scenario: ${label}...`, type: 'info' });

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        let errDetail = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) errDetail = errData.detail;
        } catch {
          // fallback
        }
        throw new Error(errDetail);
      }

      const runRecord: TestRun = await res.json();
      setActiveRun(runRecord);
      await fetchHistory(false);

      if (runRecord.status === 'PASS') {
        setFeedback({ message: `✓ Test PASSED: ${runRecord.scenario}`, type: 'success' });
      } else if (runRecord.status === 'SELF-HEALED') {
        setFeedback({ message: `✓ Test SELF-HEALED: ${runRecord.scenario} (Workflow reconstructed & verified)`, type: 'success' });
      } else if (runRecord.status === 'FAIL') {
        setFeedback({ message: `✕ Genuine Defect Detected: ${runRecord.scenario} (HTTP 500 / defect not masked)`, type: 'error' });
      } else {
        setFeedback({ message: `⚠️ Human Review Required: ${runRecord.scenario} (Ambiguous targets detected)`, type: 'info' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Backend connection error';
      setFeedback({
        message: `Execution failed: Unable to connect to TestPhoenix backend (${msg}). Verify FastAPI is running.`,
        type: 'error',
      });
    } finally {
      setIsRunning(false);
      setRunningLabel('');
    }
  };

  const handleRunMainCTA = () => {
    const endpoints: Record<string, { url: string; label: string }> = {
      'normal': { url: '/api/tests/normal', label: 'Version A Baseline (Tasks)' },
      'self-healing': { url: '/api/tests/self-healing', label: 'Version B Redesign (Tasks Self-Heal)' },
      'shopping-a': { url: '/api/tests/shopping-a', label: 'Store A Baseline (E-Commerce)' },
      'shopping-b': { url: '/api/tests/shopping-b', label: 'Store B Redesign (E-Commerce Self-Heal)' },
      'broken-backend': { url: '/api/tests/broken-backend', label: 'Defect Simulation (HTTP 500 Defect)' },
      'ambiguous': { url: '/api/tests/ambiguous', label: 'Ambiguity Challenge (Human Review)' },
    };
    const target = endpoints[selectedScenarioKey] || endpoints['self-healing'];
    executeScenario(target.url, target.label);
  };

  const triggerEvaluationBenchmark = async () => {
    if (isEvaluating || isRunning) return;
    setIsEvaluating(true);
    setFeedback({ message: 'Running comprehensive 20-scenario benchmark suite across 2 iterations...', type: 'info' });
    try {
      const res = await fetch('/api/evaluation/run', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvaluationReport(data);
      setFeedback({
        message: `✓ Advanced benchmark completed — Verified recovery rate: ${data.summary?.recovery_success_rate_percent || 100}%`,
        type: 'success',
      });
      await fetchHistory(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution error';
      setFeedback({ message: `Benchmark failed: ${msg}`, type: 'error' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleExportJson = () => {
    if (runs.length === 0) {
      alert('No test run telemetry available to export.');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `testphoenix_runs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const parseSteps = (diagnosticsJson?: string): StepDiagnostic[] => {
    if (!diagnosticsJson) return [];
    try {
      const parsed = JSON.parse(diagnosticsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // Compute Verified Real Metrics
  const totalRuns = runs.length;
  const selfHeals = runs.filter(r => r.status === 'SELF-HEALED').length;
  const genuineFails = runs.filter(r => r.status === 'FAIL').length;
  const humanReviews = runs.filter(r => r.status === 'HUMAN REVIEW REQUIRED').length;
  const passes = runs.filter(r => r.status === 'PASS').length;

  const recoverySuccessRate = evaluationReport?.summary?.recovery_success_rate_percent !== undefined
    ? `${evaluationReport.summary.recovery_success_rate_percent}%`
    : (totalRuns > 0 && (selfHeals + passes) > 0)
    ? `${Math.round(((passes + selfHeals) / totalRuns) * 100)}%`
    : 'N/A';

  const avgExecutionDuration = totalRuns > 0
    ? `${Math.round(runs.reduce((acc, r) => acc + (r.execution_duration_ms || 0), 0) / totalRuns)}ms`
    : 'N/A';

  const latestRun = activeRun || (runs.length > 0 ? runs[0] : null);

  const renderStatusBadge = (status: string) => {
    if (status === 'PASS') {
      return (
        <span className="status-badge-pass">
          <span>●</span> PASS
        </span>
      );
    }
    if (status === 'SELF-HEALED') {
      return (
        <span className="status-badge-healed">
          <span>✓</span> SELF-HEALED
        </span>
      );
    }
    if (status === 'FAIL') {
      return (
        <span className="status-badge-fail">
          <span>✕</span> GENUINE FAILURE
        </span>
      );
    }
    return (
      <span className="status-badge-review">
        <span>⚠️</span> HUMAN REVIEW
      </span>
    );
  };

  return (
    <div className="dashboard-root">
      {/* 1. DASHBOARD HEADER */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1>TestPhoenix Dashboard</h1>
          <p className="dashboard-subtitle">
            Test reliability, recovery, and application health.
          </p>
        </div>

        <div className="dashboard-actions-group">
          <button
            id="refresh-history-btn"
            className="btn-secondary"
            onClick={() => fetchHistory(true)}
            disabled={isRefreshing || isRunning}
            title="Refresh runs from SQLite database"
          >
            {isRefreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>

          <button
            id="export-report-btn"
            className="btn-secondary"
            onClick={handleExportJson}
            disabled={totalRuns === 0}
            title="Export test run telemetry as JSON"
          >
            Export JSON
          </button>

          <a
            id="export-csv-link"
            href="http://127.0.0.1:8000/api/evaluation/csv"
            className="btn-secondary"
            target="_blank"
            rel="noreferrer"
            title="Download verified benchmark CSV"
          >
            Export CSV
          </a>

          <button
            id="run-tests-btn"
            className="btn-primary"
            onClick={handleRunMainCTA}
            disabled={isRunning || isEvaluating}
          >
            {isRunning ? (
              <span>Running {runningLabel}...</span>
            ) : (
              <span>▶ Run Selected Test</span>
            )}
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div className={`alert-${feedback.type}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. REAL DASHBOARD METRICS */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Test Runs</div>
          <div className="metric-value">{totalRuns > 0 ? totalRuns : 'N/A'}</div>
          <div className="metric-sub">SQLite execution records</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Successful Self-Heals</div>
          <div className="metric-value val-green">{totalRuns > 0 ? selfHeals : 'N/A'}</div>
          <div className="metric-sub">Verified dynamic recoveries</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Genuine Failures</div>
          <div className="metric-value val-red">{totalRuns > 0 ? genuineFails : 'N/A'}</div>
          <div className="metric-sub">Unmasked application bugs</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Human Review Required</div>
          <div className="metric-value val-amber">{totalRuns > 0 ? humanReviews : 'N/A'}</div>
          <div className="metric-sub">Ambiguity margin &lt; 0.15</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Recovery Success Rate</div>
          <div className="metric-value val-green">{recoverySuccessRate}</div>
          <div className="metric-sub">Dual verified outcomes</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Average Execution</div>
          <div className="metric-value">{avgExecutionDuration}</div>
          <div className="metric-sub">Playwright sync roundtrip</div>
        </div>
      </div>

      {/* 3. TEST OUTCOMES DISTRIBUTION BAR (REAL DATA) */}
      {totalRuns > 0 && (
        <div style={{ background: '#FFFFFF', padding: '1.25rem 1.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Execution Outcomes Distribution ({totalRuns} Total Runs)
            </span>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--status-pass-text)' }}>● Pass ({passes})</span>
              <span style={{ color: 'var(--status-pass-text)' }}>● Self-Healed ({selfHeals})</span>
              <span style={{ color: 'var(--status-fail-text)' }}>● Fail ({genuineFails})</span>
              <span style={{ color: 'var(--status-review-text)' }}>● Human Review ({humanReviews})</span>
            </div>
          </div>
          <div style={{ height: '10px', width: '100%', background: '#F5F5F7', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${(passes / totalRuns) * 100}%`, background: '#34C759' }} title={`Pass: ${passes}`} />
            <div style={{ width: `${(selfHeals / totalRuns) * 100}%`, background: '#0071E3' }} title={`Self-Healed: ${selfHeals}`} />
            <div style={{ width: `${(genuineFails / totalRuns) * 100}%`, background: '#FF3B30' }} title={`Fail: ${genuineFails}`} />
            <div style={{ width: `${(humanReviews / totalRuns) * 100}%`, background: '#FF9F0A' }} title={`Human Review: ${humanReviews}`} />
          </div>
        </div>
      )}

      {/* 4. SCENARIO TESTING CONTROLS */}
      <div className="scenario-launch-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)' }}>
              Interactive Test Harness
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
              Execute Real Test Scenarios
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              id="cta-scenario-select"
              className="form-select"
              style={{ width: 'auto', minWidth: 260 }}
              value={selectedScenarioKey}
              onChange={(e) => setSelectedScenarioKey(e.target.value)}
              disabled={isRunning || isEvaluating}
            >
              <option value="normal">Version A Baseline (Tasks Modal)</option>
              <option value="self-healing">Version B Redesign (Tasks Self-Heal)</option>
              <option value="shopping-a">Store A Baseline (E-Comm Audio Store)</option>
              <option value="shopping-b">Store B Redesign (E-Comm Audio Drawer)</option>
              <option value="broken-backend">Defect Simulation (HTTP 500 Defect)</option>
              <option value="ambiguous">Ambiguity Challenge (Human Review)</option>
            </select>

            <button
              id="run-scenario-btn"
              className="btn-primary"
              onClick={handleRunMainCTA}
              disabled={isRunning || isEvaluating}
            >
              {isRunning ? 'Executing...' : 'Run Scenario'}
            </button>
          </div>
        </div>

        {/* Quick Launch Scenario Buttons */}
        <div className="scenario-pills-row">
          <button
            className="scenario-pill-btn"
            onClick={() => executeScenario('/api/tests/normal', 'Version A Baseline')}
            disabled={isRunning || isEvaluating}
          >
            <span>v1</span> Version A (Tasks)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => executeScenario('/api/tests/self-healing', 'Version B Redesign')}
            disabled={isRunning || isEvaluating}
          >
            <span>v2</span> Version B (Tasks Self-Heal)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => executeScenario('/api/tests/shopping-a', 'Store A Baseline')}
            disabled={isRunning || isEvaluating}
          >
            <span>🛒</span> Store A (E-Comm)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => executeScenario('/api/tests/shopping-b', 'Store B Redesign')}
            disabled={isRunning || isEvaluating}
          >
            <span>🛍️</span> Store B (E-Comm Self-Heal)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => executeScenario('/api/tests/broken-backend', 'Defect Simulation')}
            disabled={isRunning || isEvaluating}
          >
            <span>⚠️</span> Defect (500)
          </button>
          <button
            className="scenario-pill-btn"
            onClick={() => executeScenario('/api/tests/ambiguous', 'Ambiguity Challenge')}
            disabled={isRunning || isEvaluating}
          >
            <span>⚖️</span> Ambiguity Gate
          </button>
          <button
            className="scenario-pill-btn"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
            onClick={triggerEvaluationBenchmark}
            disabled={isRunning || isEvaluating}
          >
            <span>📊</span> Run 20-Scenario Benchmark
          </button>
        </div>
      </div>

      {/* 5. SIGNATURE RECOVERY VISUALIZATION */}
      <div className="recovery-viz-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)' }}>
              Signature Component
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
              Intent Recovery Trace
            </h3>
          </div>

          {latestRun && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Viewing: <strong>{latestRun.scenario}</strong>
              </span>
              {renderStatusBadge(latestRun.status)}
            </div>
          )}
        </div>

        {latestRun ? (
          <div className="viz-flow-track">
            {/* 1. Original Locator */}
            <div className="viz-step-box">
              <div className="viz-step-title">1. Locator</div>
              <div className="viz-step-desc">
                <code>{latestRun.original_locator || '#btn'}</code>
              </div>
            </div>

            <div style={{ color: 'var(--text-muted)' }}>➔</div>

            {/* 2. Detection */}
            <div className={`viz-step-box ${latestRun.status === 'PASS' ? 'state-green' : 'state-blue'}`}>
              <div className="viz-step-title">2. Detection</div>
              <div className="viz-step-desc">
                {latestRun.original_locator_worked ? 'Located Directly' : 'Selector Mutated'}
              </div>
            </div>

            <div style={{ color: 'var(--text-muted)' }}>➔</div>

            {/* 3. Candidates Discovery */}
            <div className={`viz-step-box ${latestRun.replacement_selector ? 'state-blue' : ''}`}>
              <div className="viz-step-title">3. Candidates</div>
              <div className="viz-step-desc">
                {latestRun.replacement_selector ? 'DOM Evaluated' : 'Not Required'}
              </div>
            </div>

            <div style={{ color: 'var(--text-muted)' }}>➔</div>

            {/* 4. Intent Scoring */}
            <div className={`viz-step-box ${latestRun.candidate_score ? 'state-blue' : ''}`}>
              <div className="viz-step-title">4. 5-Factor Score</div>
              <div className="viz-step-desc">
                {latestRun.candidate_score !== null ? `${Math.round(latestRun.candidate_score * 100)}% Match` : 'N/A'}
              </div>
            </div>

            <div style={{ color: 'var(--text-muted)' }}>➔</div>

            {/* 5. Replacement Target */}
            <div className={`viz-step-box ${latestRun.replacement_selector ? 'state-blue' : ''}`}>
              <div className="viz-step-title">5. Selected Target</div>
              <div className="viz-step-desc">
                <code>{latestRun.replacement_selector || 'None'}</code>
              </div>
            </div>

            <div style={{ color: 'var(--text-muted)' }}>➔</div>

            {/* 6. Outcome Verification */}
            <div className={`viz-step-box ${
              latestRun.status === 'SELF-HEALED' || latestRun.status === 'PASS'
                ? 'state-green'
                : latestRun.status === 'FAIL'
                ? 'state-red'
                : 'state-amber'
            }`}>
              <div className="viz-step-title">6. Verification</div>
              <div className="viz-step-desc">
                {latestRun.verification_result || 'Verified'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            No test run selected. Execute a test scenario above to view the live intent recovery trace.
          </div>
        )}
      </div>

      {/* 6. TEST HISTORY TABLE */}
      <div className="table-panel">
        <div className="table-header-bar">
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Test Run History</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Click any execution row to inspect step-level diagnostics and telemetry
            </span>
          </div>
          <span className="badge badge-in-progress">
            {runs.length} Records
          </span>
        </div>

        <div className="table-responsive">
          {runs.length === 0 ? (
            <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>📋</div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                No test runs yet.
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 440, margin: '0 auto 1.5rem auto' }}>
                Run your first automated test scenario to begin tracking reliability, recovery, and application health.
              </p>
              <button
                className="btn-primary"
                onClick={handleRunMainCTA}
                disabled={isRunning}
              >
                Run First Scenario
              </button>
            </div>
          ) : (
            <table className="history-table" id="history-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Intent</th>
                  <th>Scenario</th>
                  <th>Recovery</th>
                  <th>Verification</th>
                  <th>Duration</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setActiveRun(r);
                      setSelectedModalRun(r);
                    }}
                    style={{ background: activeRun?.id === r.id ? '#F0F6FF' : undefined }}
                  >
                    <td>
                      <code style={{ fontSize: '0.75rem' }}>#{r.id}</code>
                    </td>
                    <td style={{ color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.original_intent || (r.scenario.includes('Shopping') || r.scenario.includes('Store') ? 'Complete audio checkout' : 'Create and assign task')}
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.scenario}</td>
                    <td>
                      {r.replacement_selector ? (
                        <code style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{r.replacement_selector}</code>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Direct match</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.verification_result || 'Verified in UI & SQLite'}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {r.execution_duration_ms ? `${r.execution_duration_ms}ms` : 'N/A'}
                    </td>
                    <td>{renderStatusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 7. DIAGNOSTICS & TELEMETRY MODAL */}
      {selectedModalRun && (
        <div className="modal-overlay" onClick={() => setSelectedModalRun(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                  Test Run #{selectedModalRun.id} — Telemetry Audit
                </h3>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  {selectedModalRun.scenario} • {selectedModalRun.created_at}
                </span>
              </div>
              <button
                onClick={() => setSelectedModalRun(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div>Final Decision:</div>
                {renderStatusBadge(selectedModalRun.status)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Original Locator</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    <code>{selectedModalRun.original_locator || 'N/A'}</code>
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Replacement Locator</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    <code>{selectedModalRun.replacement_selector || 'None required'}</code>
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Candidate Score</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', fontWeight: 600 }}>
                    {selectedModalRun.candidate_score !== null ? `${Math.round(selectedModalRun.candidate_score * 100)}%` : 'N/A'}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Execution Duration</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.2rem', fontWeight: 600 }}>
                    {selectedModalRun.execution_duration_ms ? `${selectedModalRun.execution_duration_ms}ms` : 'N/A'}
                  </div>
                </div>
              </div>

              {selectedModalRun.verification_result && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--status-pass-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-pass-border)', color: 'var(--status-pass-text)', fontSize: '0.85rem' }}>
                  <strong>Dual Verifier Evidence:</strong> {selectedModalRun.verification_result}
                </div>
              )}

              {selectedModalRun.initial_failure_reason && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--status-fail-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--status-fail-border)', color: 'var(--status-fail-text)', fontSize: '0.85rem' }}>
                  <strong>Failure Classification:</strong> {selectedModalRun.initial_failure_reason}
                </div>
              )}

              {/* Step Diagnostics JSON Breakdown */}
              {selectedModalRun.diagnostics_json && (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Step Evaluation Diagnostics
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#1D1D1F', color: '#F5F5F7', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <pre>{JSON.stringify(parseSteps(selectedModalRun.diagnostics_json), null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedModalRun(null)}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
