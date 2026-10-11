import React, { useState } from 'react';
import type { NavigationTab } from '../../types';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenQuickRun: () => void;
  onResetData: () => void;
  isResetting: boolean;
  backendHealthy: boolean;
  totalRuns: number;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickRun,
  onResetData,
  isResetting,
  backendHealthy,
  totalRuns,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const tabLabels: Record<NavigationTab, string> = {
    overview: 'Platform Overview',
    tests: 'Test Suites & Scenarios',
    runs: 'Test Execution Runs',
    recovery: 'Signature Self-Healing View',
    analytics: 'Analytics & Reliability Trends',
    'healing-memory': 'SQLite Healing Memory Cache',
    settings: 'Engine Settings & Verification Gates',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Collapsible Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenQuickRun={onOpenQuickRun}
        backendHealthy={backendHealthy}
        totalRuns={totalRuns}
      />

      {/* Main Canvas Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: 56,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.75rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Breadcrumb / Current Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TestPhoenix</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {tabLabels[currentTab] || 'Dashboard'}
            </span>
          </div>

          {/* Right Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              id="header-run-test-btn"
              className="btn-primary"
              onClick={onOpenQuickRun}
              style={{ fontSize: '0.8rem', padding: '0.42rem 0.95rem' }}
            >
              <span>▶</span> Run Test
            </button>

            <button
              id="reset-db-btn"
              className="btn-secondary"
              onClick={onResetData}
              disabled={isResetting}
              style={{ fontSize: '0.8rem', padding: '0.42rem 0.9rem' }}
              title="Reset SQLite database to baseline initial seed state"
            >
              {isResetting ? 'Resetting...' : '↺ Reset DB'}
            </button>

            <a
              id="results-dashboard-link"
              href="http://127.0.0.1:8000/results"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.42rem 0.9rem', textDecoration: 'none' }}
              title="Open full telemetry audit page"
            >
              Audit Portal ↗
            </a>
          </div>
        </header>

        {/* Viewport Content */}
        <main style={{ flex: 1, padding: '2rem 2.25rem 4rem 2.25rem', maxWidth: 1360, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};
