import React, { useState } from 'react';
import type { DemoMode } from '../types';
import { Logo } from './ui/Logo';

interface NavbarProps {
  currentMode: DemoMode;
  onSelectMode: (mode: DemoMode) => void;
  onResetData: () => void;
  isResetting: boolean;
  backendHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onSelectMode,
  onResetData,
  isResetting,
  backendHealthy,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (mode: DemoMode) => {
    onSelectMode(mode);
    setMobileMenuOpen(false);
  };

  return (
    <header className="top-nav">
      <div className="nav-container">
        {/* Brand */}
        <div
          className="brand"
          onClick={() => handleNav('overview')}
          title="Return to TestPhoenix Overview"
          style={{ cursor: 'pointer' }}
        >
          <Logo size={28} showText={true} subtitle="Rise Above Every UI Change" />
        </div>

        {/* Center Navigation Tabs (Apple Segmented Style) */}
        <nav className="nav-tabs" aria-label="Application Navigation">
          <button
            id="tab-overview"
            className={`nav-tab ${currentMode === 'overview' ? 'active' : ''}`}
            onClick={() => handleNav('overview')}
          >
            Overview
          </button>
          <button
            id="tab-self-healing"
            className={`nav-tab ${currentMode === 'self-healing' ? 'active' : ''}`}
            onClick={() => handleNav('self-healing')}
          >
            Demo
          </button>
          <button
            id="tab-test-runner"
            className={`nav-tab ${currentMode === 'test-runner' || currentMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNav('test-runner')}
          >
            Dashboard
          </button>
          <button
            id="tab-version-a"
            className={`nav-tab ${currentMode === 'version-a' ? 'active' : ''}`}
            onClick={() => handleNav('version-a')}
          >
            Tasks A
          </button>
          <button
            id="tab-version-b"
            className={`nav-tab ${currentMode === 'version-b' ? 'active' : ''}`}
            onClick={() => handleNav('version-b')}
          >
            Tasks B
          </button>
          <button
            id="tab-shopping-a"
            className={`nav-tab ${currentMode === 'shopping-a' ? 'active' : ''}`}
            onClick={() => handleNav('shopping-a')}
          >
            Store A
          </button>
          <button
            id="tab-shopping-b"
            className={`nav-tab ${currentMode === 'shopping-b' ? 'active' : ''}`}
            onClick={() => handleNav('shopping-b')}
          >
            Store B
          </button>
          <button
            id="tab-broken"
            className={`nav-tab ${currentMode === 'broken' ? 'active' : ''}`}
            onClick={() => handleNav('broken')}
          >
            Defect
          </button>
          <button
            id="tab-ambiguous"
            className={`nav-tab ${currentMode === 'ambiguous' ? 'active' : ''}`}
            onClick={() => handleNav('ambiguous')}
          >
            Ambiguity
          </button>
        </nav>

        {/* Right Actions */}
        <div className="nav-actions">
          <span
            id="backend-status-badge"
            className={`badge ${backendHealthy ? 'badge-done' : 'badge-todo'}`}
            title="FastAPI Backend Health"
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: backendHealthy ? '#34C759' : '#FF9F0A',
                display: 'inline-block',
                marginRight: 4,
              }}
            />
            {backendHealthy ? 'API ONLINE' : 'CONNECTING...'}
          </span>

          <a
            id="results-dashboard-link"
            href="http://127.0.0.1:8000/results"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
          >
            Results ↗
          </a>

          <button
            id="reset-db-btn"
            className="btn-secondary"
            onClick={onResetData}
            disabled={isResetting}
            title="Reset SQLite database to baseline seed state"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
          >
            {isResetting ? 'Resetting...' : '↺ Reset DB'}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="btn-secondary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', padding: '0.45rem 0.75rem', fontSize: '0.9rem' }}
            id="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{ padding: '1rem', background: '#FFFFFF', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => handleNav('overview')}>Overview</button>
          <button className="btn-secondary" onClick={() => handleNav('test-runner')}>Dashboard</button>
          <button className="btn-secondary" onClick={() => handleNav('version-a')}>Tasks Version A</button>
          <button className="btn-secondary" onClick={() => handleNav('version-b')}>Tasks Version B</button>
          <button className="btn-secondary" onClick={() => handleNav('shopping-a')}>Store A</button>
          <button className="btn-secondary" onClick={() => handleNav('shopping-b')}>Store B</button>
          <button className="btn-secondary" onClick={() => handleNav('broken')}>Defect (500)</button>
          <button className="btn-secondary" onClick={() => handleNav('ambiguous')}>Ambiguity Gate</button>
        </div>
      )}
    </header>
  );
};
