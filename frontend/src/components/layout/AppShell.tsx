import React, { useState } from 'react';
import type { NavigationTab } from '../../types';
import { Sidebar } from './Sidebar';
import { Logo } from '../ui/Logo';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabLabels: Record<NavigationTab, string> = {
    showcase: 'Live Showcase Demo',
    overview: 'Platform Overview',
    tests: 'Test Suites & Scenarios',
    runs: 'Test Execution Runs',
    versions: 'Continuous Test Versioning & Baselines',
    recovery: 'Signature Self-Healing View',
    analytics: 'Analytics & Reliability Trends',
    'healing-memory': 'SQLite Healing Memory Cache',
    environments: 'Runtime Nodes & Target Environments',
    settings: 'Engine Settings & Verification Gates',
  };

  const navItems: Array<{ id: NavigationTab; label: string; icon: string }> = [
    { id: 'showcase', label: 'Showcase', icon: '✨' },
    { id: 'overview', label: 'Overview', icon: '⚡' },
    { id: 'tests', label: 'Tests', icon: '🧪' },
    { id: 'runs', label: 'Runs', icon: '▶' },
    { id: 'versions', label: 'Versions', icon: '🧬' },
    { id: 'recovery', label: 'Recovery', icon: '🛡️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'healing-memory', label: 'Memory', icon: '🧠' },
    { id: 'environments', label: 'Environments', icon: '🌐' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleMobileSelect = (tab: NavigationTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)', position: 'relative' }}>
      {/* Desktop / Tablet Collapsible Left Sidebar */}
      <div className="desktop-sidebar-wrapper">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onOpenQuickRun={onOpenQuickRun}
          backendHealthy={backendHealthy}
          totalRuns={totalRuns}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 90,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Mobile Slideout Drawer */}
      <div
        className="mobile-drawer"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          background: '#FFFFFF',
          zIndex: 100,
          boxShadow: 'var(--shadow-floating)',
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <Logo size={28} showText={true} />
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', padding: '0.25rem', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <button
            className="btn-primary"
            onClick={() => { setMobileMenuOpen(false); onOpenQuickRun(); }}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            ▶ Run Test
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMobileSelect(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: isActive ? 'rgba(0, 113, 227, 0.08)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            className="btn-secondary"
            onClick={() => { setMobileMenuOpen(false); onResetData(); }}
            disabled={isResetting}
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
          >
            {isResetting ? 'Resetting...' : '↺ Reset Database'}
          </button>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {backendHealthy ? '🟢 FastAPI Connected' : '🟠 Connecting API'}
          </div>
        </div>
      </div>

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
            padding: '0 1.25rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Left: Mobile Toggle + Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: 'var(--radius-xs)',
                display: 'none',
                color: 'var(--text-primary)',
                fontSize: '1.1rem',
              }}
            >
              ☰
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="header-brand-title" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TestPhoenix</span>
              <span className="header-brand-title" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {tabLabels[currentTab] || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Right Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              id="header-run-test-btn"
              className="btn-primary"
              onClick={onOpenQuickRun}
              style={{ fontSize: '0.8rem', padding: '0.42rem 0.95rem' }}
            >
              <span>▶</span> <span className="btn-label-responsive">Run Test</span>
            </button>

            <button
              id="reset-db-btn"
              className="btn-secondary desktop-header-action"
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
              className="btn-secondary desktop-header-action"
              style={{ fontSize: '0.8rem', padding: '0.42rem 0.9rem', textDecoration: 'none' }}
              title="Open full telemetry audit page"
            >
              Audit Portal ↗
            </a>
          </div>
        </header>

        {/* Viewport Content */}
        <main
          className="app-main-content"
          style={{
            flex: 1,
            padding: '2rem 2.25rem 4rem 2.25rem',
            maxWidth: 1360,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
