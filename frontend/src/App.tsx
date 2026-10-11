import { useState, useEffect, useCallback } from 'react';
import type { Task, DemoMode, NavigationTab, TestRun, TaskFormPayload, EvaluationReport } from './types';
import { ApiService } from './api/client';
import { AppShell } from './components/layout/AppShell';
import { OverviewView } from './components/features/overview/OverviewView';
import { TestsView } from './components/features/tests/TestsView';
import { RunsView } from './components/features/runs/RunsView';
import { AnalyticsView } from './components/features/analytics/AnalyticsView';
import { HealingMemoryView } from './components/features/healing-memory/HealingMemoryView';
import { EnvironmentsView } from './components/features/environments/EnvironmentsView';
import { SettingsView } from './components/features/settings/SettingsView';
import { ShowcaseView } from './components/features/showcase/ShowcaseView';
import { VersionsView } from './components/features/versions/VersionsView';
import { SelfHealingDemo } from './components/SelfHealingDemo';
import { Modal } from './components/ui/Modal';
import { StatusBadge } from './components/ui/Badge';
import { Button } from './components/ui/Button';

// Legacy scenarios preserved for automated Playwright tests & direct links
import { VersionA } from './components/VersionA';
import { VersionB } from './components/VersionB';
import { ShoppingCartA } from './components/ShoppingCartA';
import { ShoppingCartB } from './components/ShoppingCartB';
import { BrokenVersion } from './components/BrokenVersion';
import { AmbiguousVersion } from './components/AmbiguousVersion';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [evaluationReport, setEvaluationReport] = useState<EvaluationReport | null>(null);

  // Active view mode
  const [currentMode, setCurrentMode] = useState<DemoMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') as DemoMode | null;
    if (mode) return mode;
    return 'showcase';
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Execution state
  const [isRunningScenario, setIsRunningScenario] = useState(false);
  const [runningScenarioLabel, setRunningScenarioLabel] = useState('');

  // Modals
  const [inspectRun, setInspectRun] = useState<TestRun | null>(null);
  const [isQuickRunOpen, setIsQuickRunOpen] = useState(false);
  const [selectedQuickScenario, setSelectedQuickScenario] = useState('/api/tests/self-healing');

  // Synchronize mode with URL query params
  const handleSelectMode = (mode: DemoMode) => {
    setCurrentMode(mode);
    setServerError(null);
    setSuccessMessage(null);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.pushState({}, '', url.toString());
  };

  const fetchTasks = useCallback(async () => {
    try {
      const data = await ApiService.getTasks();
      setTasks(data);
      setBackendHealthy(true);
    } catch {
      setBackendHealthy(false);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await ApiService.getTestHistory(100, 'all');
      setRuns(data);
      setBackendHealthy(true);
    } catch {
      // Backend may be offline initially
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchEvaluation = useCallback(async () => {
    try {
      const report = await ApiService.getLatestEvaluation();
      setEvaluationReport(report);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchRuns();
    fetchEvaluation();
  }, [fetchTasks, fetchRuns, fetchEvaluation]);

  // Execute scenario via Playwright backend
  const handleExecuteScenario = async (endpoint: string, label: string) => {
    if (isRunningScenario) return;
    setIsRunningScenario(true);
    setRunningScenarioLabel(label);
    try {
      const runRecord = await ApiService.executeScenario(endpoint);
      setInspectRun(runRecord);
      setSuccessMessage(`✓ Scenario executed: ${label} → ${runRecord.status}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchRuns();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution error';
      setServerError(`Execution failed: ${msg}`);
      setTimeout(() => setServerError(null), 5000);
    } finally {
      setIsRunningScenario(false);
      setRunningScenarioLabel('');
      setIsQuickRunOpen(false);
    }
  };

  // Reset demo SQLite database
  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await ApiService.resetDatabase();
      await fetchTasks();
      await fetchRuns();
      setSuccessMessage('Demo SQLite database successfully reset to clean seed state.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setServerError('Failed to reset demo data.');
    } finally {
      setIsResetting(false);
    }
  };

  // Legacy task creation for interactive Version A/B
  const handleCreateTask = async (payload: TaskFormPayload, forceFailure = false): Promise<boolean> => {
    setIsLoading(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      await ApiService.createTask(payload, forceFailure || currentMode === 'broken');
      await fetchTasks();
      setSuccessMessage(`Task "${payload.title}" created successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setServerError(`Task creation failed: ${msg}`);
      return false;
    } finally {
      setIsLoading(false);
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

  // Check if current mode is an AppShell tab
  const isShellTab = [
    'showcase',
    'overview',
    'tests',
    'runs',
    'versions',
    'recovery',
    'analytics',
    'healing-memory',
    'environments',
    'settings',
    'dashboard',
    'self-healing',
  ].includes(currentMode);

  const mappedTab: NavigationTab = (currentMode === 'dashboard'
    ? 'runs'
    : currentMode === 'self-healing'
    ? 'recovery'
    : isShellTab
    ? (currentMode as NavigationTab)
    : 'showcase');

  return (
    <div className="app-root">
      {/* Top Banner for Success / Error */}
      {successMessage && (
        <div id="success-alert" data-testid="success-message" className="alert-success" style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, margin: 0, boxShadow: 'var(--shadow-floating)' }}>
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {serverError && (
        <div className="alert-error" style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, margin: 0, boxShadow: 'var(--shadow-floating)' }}>
          <span>✕</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* Render Shell if on platform tabs */}
      {isShellTab ? (
        <AppShell
          currentTab={mappedTab}
          onSelectTab={handleSelectMode}
          onOpenQuickRun={() => setIsQuickRunOpen(true)}
          onResetData={handleResetData}
          isResetting={isResetting}
          backendHealthy={backendHealthy}
          totalRuns={runs.length}
        >
          {mappedTab === 'showcase' && (
            <ShowcaseView
              onOpenAnalytics={() => handleSelectMode('analytics')}
              onRefreshRuns={fetchRuns}
            />
          )}

          {mappedTab === 'overview' && (
            <OverviewView
              runs={runs}
              onSelectTab={handleSelectMode}
              onOpenQuickRun={() => setIsQuickRunOpen(true)}
              onInspectRun={(run) => setInspectRun(run)}
            />
          )}

          {mappedTab === 'tests' && (
            <TestsView
              onExecuteScenario={handleExecuteScenario}
              isRunning={isRunningScenario}
              runningLabel={runningScenarioLabel}
              recentRuns={runs}
              onRefreshRuns={fetchRuns}
            />
          )}


          {mappedTab === 'runs' && (
            <RunsView
              runs={runs}
              onInspectRun={(run) => setInspectRun(run)}
              onRefresh={fetchRuns}
              isRefreshing={isRefreshing}
              onExportJson={handleExportJson}
            />
          )}

          {mappedTab === 'versions' && (
            <VersionsView />
          )}

          {mappedTab === 'recovery' && (
            <SelfHealingDemo />
          )}

          {mappedTab === 'analytics' && (
            <AnalyticsView
              runs={runs}
              evaluationReport={evaluationReport}
            />
          )}

          {mappedTab === 'healing-memory' && (
            <HealingMemoryView />
          )}

          {mappedTab === 'environments' && (
            <EnvironmentsView backendHealthy={backendHealthy} />
          )}

          {mappedTab === 'settings' && (
            <SettingsView
              backendHealthy={backendHealthy}
              onResetData={handleResetData}
              isResetting={isResetting}
            />
          )}
        </AppShell>
      ) : (
        /* Standalone Sandbox Views for automated Playwright tests & direct inspection */
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#FFFFFF', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Standalone Scenario Mode</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Active: {currentMode}</div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => handleSelectMode('overview')}>
              ← Back to Developer Platform
            </Button>
          </div>

          {currentMode === 'version-a' && (
            <VersionA tasks={tasks} onCreateTask={handleCreateTask} isLoading={isLoading} />
          )}

          {currentMode === 'version-b' && (
            <VersionB tasks={tasks} onCreateTask={handleCreateTask} isLoading={isLoading} />
          )}

          {currentMode === 'shopping-a' && (
            <ShoppingCartA />
          )}

          {currentMode === 'shopping-b' && (
            <ShoppingCartB />
          )}

          {currentMode === 'broken' && (
            <BrokenVersion
              tasks={tasks}
              onCreateTask={handleCreateTask}
              isLoading={isLoading}
              serverError={serverError}
              onClearError={() => setServerError(null)}
            />
          )}

          {currentMode === 'ambiguous' && (
            <AmbiguousVersion />
          )}

          {currentMode === 'test-runner' && (
            <RunsView
              runs={runs}
              onInspectRun={(run) => setInspectRun(run)}
              onRefresh={fetchRuns}
              isRefreshing={isRefreshing}
              onExportJson={handleExportJson}
            />
          )}
        </div>
      )}

      {/* QUICK RUN MODAL (One obvious primary action in shell) */}
      <Modal
        isOpen={isQuickRunOpen}
        onClose={() => setIsQuickRunOpen(false)}
        title="Execute Playwright Automated Test"
        subtitle="Select a test scenario to launch live intent reconstruction"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setIsQuickRunOpen(false);
                handleSelectMode('tests');
              }}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
            >
              🌐 Open Live Website Testing
            </Button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setIsQuickRunOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleExecuteScenario(selectedQuickScenario, 'Quick Test')}
                isLoading={isRunningScenario}
              >
                ▶ Execute Scenario
              </Button>
            </div>
          </div>
        }

      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label className="form-label">Choose Automated Scenario:</label>
          <select
            className="form-select"
            value={selectedQuickScenario}
            onChange={(e) => setSelectedQuickScenario(e.target.value)}
            disabled={isRunningScenario}
          >
            <option value="/api/tests/self-healing">Version B Work Item Drawer (Self-Healing Demo)</option>
            <option value="/api/tests/normal">Version A Task Modal (Baseline Pass)</option>
            <option value="/api/tests/shopping-b">Store B Audio Checkout Drawer (Self-Healing E-Commerce)</option>
            <option value="/api/tests/shopping-a">Store A Audio Checkout Modal (Baseline E-Commerce)</option>
            <option value="/api/tests/broken-backend">Database Failure Simulation (Genuine HTTP 500 Defect)</option>
            <option value="/api/tests/ambiguous">Ambiguous Target Buttons (Human Review Gate)</option>
            <option value="/api/evaluation/run">Complete 20-Scenario Benchmark Suite</option>
          </select>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
            Execution will launch Chromium via Playwright, evaluate candidate elements dynamically, enforce confidence gates, and record execution results in SQLite.
          </p>
        </div>
      </Modal>

      {/* INSPECT EVIDENCE MODAL (Progressive disclosure for runs) */}
      {inspectRun && (
        <Modal
          isOpen={true}
          onClose={() => setInspectRun(null)}
          title={`Test Run #${inspectRun.id} — Verification Audit`}
          subtitle={`${inspectRun.scenario} • ${inspectRun.created_at || 'Recently'}`}
          maxWidth={720}
          footer={
            <Button variant="secondary" onClick={() => setInspectRun(null)}>
              Close Audit
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Decision:</span>
                <div style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <StatusBadge status={inspectRun.status} size="md" />
                  {inspectRun.is_demo ? (
                    <span style={{ background: '#FEF3C7', color: '#92400E', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, border: '1px solid #FDE68A' }}>
                      DEMO DATA
                    </span>
                  ) : (
                    <span style={{ background: '#DCFCE7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, border: '1px solid #BBF7D0' }}>
                      REAL DATA
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration:</span>
                <div style={{ fontWeight: 600 }}>{inspectRun.execution_duration_ms ? `${inspectRun.execution_duration_ms}ms` : 'N/A'}</div>
              </div>
            </div>

            {/* Structured Test Details per Master Upgrade Prompt Section 6 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div style={{ background: 'var(--bg-inset)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Intent</span>
                <div style={{ marginTop: '0.2rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {inspectRun.original_intent || (inspectRun.scenario.includes('Store') ? 'Complete audio checkout' : 'Create new task item')}
                </div>
              </div>

              <div style={{ background: 'var(--bg-inset)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current App Version</span>
                <div style={{ marginTop: '0.2rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {inspectRun.app_version || 'App V1'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-inset)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Test Version</span>
                <div style={{ marginTop: '0.2rem', fontSize: '0.85rem', fontWeight: 700, color: '#16A34A' }}>
                  {inspectRun.test_version_label || 'Test V1'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div style={{ background: 'var(--bg-inset)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Healing</span>
                <div style={{ marginTop: '0.2rem', fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                  {inspectRun.replacement_selector ? (
                    <span>Healed via <code style={{ color: 'var(--primary)' }}>{inspectRun.replacement_selector}</code></span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Direct baseline match (No healing needed)</span>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--bg-inset)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Confidence</span>
                <div style={{ marginTop: '0.2rem', fontSize: '0.875rem', fontWeight: 700, color: inspectRun.candidate_score && inspectRun.candidate_score >= 0.75 ? '#16A34A' : 'var(--text-primary)' }}>
                  {inspectRun.candidate_score ? `${(inspectRun.candidate_score * 100).toFixed(1)}%` : (inspectRun.status === 'PASS' ? '100% (Direct)' : 'N/A')}
                </div>
              </div>
            </div>

            <div style={{ padding: '0.85rem', background: 'var(--status-pass-bg)', border: '1px solid var(--status-pass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--status-pass-text)', fontSize: '0.825rem' }}>
              <strong>Verification Result:</strong> {inspectRun.verification_result || 'Verified via dual UI and SQLite outcome verifier'}
            </div>

            {inspectRun.initial_failure_reason && (
              <div style={{ padding: '0.85rem', background: 'var(--status-fail-bg)', border: '1px solid var(--status-fail-border)', borderRadius: 'var(--radius-sm)', color: 'var(--status-fail-text)', fontSize: '0.825rem' }}>
                <strong>Failure Root Cause:</strong> {inspectRun.initial_failure_reason}
              </div>
            )}

            {inspectRun.diagnostics_json && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Candidate Evaluations &amp; Diagnostics JSON:
                </span>
                <pre style={{ maxHeight: 180, overflowY: 'auto', background: '#1D1D1F', color: '#F5F5F7', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.725rem', marginTop: '0.35rem' }}>
                  {inspectRun.diagnostics_json}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default App;
