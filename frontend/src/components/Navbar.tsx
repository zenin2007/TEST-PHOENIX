import React from 'react';
import type { DemoMode } from '../types';

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
  return (
    <header className="top-nav">
      <div className="nav-container">
        <div className="brand">
          <div className="brand-icon">⚡</div>
          <div>
            <span>TestPhoenix</span>
            <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)', fontWeight: 400 }}>
              Self-Healing Test Automation
            </span>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="Demo Versions">
          <button
            id="tab-version-a"
            className={`nav-tab ${currentMode === 'version-a' ? 'active' : ''}`}
            onClick={() => onSelectMode('version-a')}
          >
            <span>v1</span> Version A (Original)
          </button>
          <button
            id="tab-version-b"
            className={`nav-tab ${currentMode === 'version-b' ? 'active version-b' : ''}`}
            onClick={() => onSelectMode('version-b')}
          >
            <span>v2</span> Version B (Redesign)
          </button>
          <button
            id="tab-broken"
            className={`nav-tab ${currentMode === 'broken' ? 'active broken' : ''}`}
            onClick={() => onSelectMode('broken')}
          >
            <span>⚠️</span> Broken (Backend 500)
          </button>
        </nav>

        <div className="nav-actions">
          <span
            id="backend-status-badge"
            className={`badge ${backendHealthy ? 'badge-done' : 'badge-todo'}`}
            title="Backend API status"
          >
            {backendHealthy ? 'API Online' : 'API Connecting...'}
          </span>
          <button
            id="reset-db-btn"
            className="btn-secondary"
            onClick={onResetData}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        </div>
      </div>
    </header>
  );
};
