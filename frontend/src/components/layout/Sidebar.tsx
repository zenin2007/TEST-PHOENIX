import React from 'react';
import type { NavigationTab } from '../../types';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenQuickRun: () => void;
  backendHealthy: boolean;
  totalRuns: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenQuickRun,
  backendHealthy,
  totalRuns,
}) => {
  const navItems: Array<{ id: NavigationTab; label: string; icon: string; badge?: string | number }> = [
    { id: 'overview', label: 'Overview', icon: '⚡' },
    { id: 'tests', label: 'Tests', icon: '🧪' },
    { id: 'runs', label: 'Runs', icon: '▶', badge: totalRuns > 0 ? totalRuns : undefined },
    { id: 'recovery', label: 'Recovery', icon: '🛡️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'healing-memory', label: 'Healing Memory', icon: '🧠' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside
      className="app-sidebar"
      style={{
        width: isCollapsed ? 72 : 240,
        transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        background: '#FFFFFF',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: isCollapsed ? '1rem 0.5rem' : '1.25rem 1rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      <div>
        {/* Brand & Collapse Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            marginBottom: '1.75rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            onClick={() => onSelectTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div className="brand-icon" style={{ width: 30, height: 30, fontSize: '0.9rem' }}>
              ⚡
            </div>
            {!isCollapsed && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  TestPhoenix
                </div>
                <div style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>
                  Self-Healing Engine
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                padding: '0.2rem',
                borderRadius: '4px',
              }}
            >
              ◀
            </button>
          )}
        </div>

        {/* Primary Action Button: RUN TEST */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <button
            id="sidebar-run-test-btn"
            className="btn-primary"
            onClick={onOpenQuickRun}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: isCollapsed ? '0.65rem 0' : '0.65rem 1rem',
              fontSize: '0.85rem',
            }}
            title="Execute automated Playwright test scenario"
          >
            <span>▶</span>
            {!isCollapsed && <span style={{ fontWeight: 600 }}>Run Test</span>}
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Sidebar Navigation" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: isActive ? 'rgba(0, 113, 227, 0.08)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
                title={item.label}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge !== undefined && (
                  <span
                    style={{
                      background: isActive ? 'var(--primary)' : 'var(--bg-inset)',
                      color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                      fontSize: '0.675rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer in Sidebar */}
      <div>
        {isCollapsed && (
          <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}
            >
              ▶
            </button>
          </div>
        )}

        <div
          style={{
            padding: isCollapsed ? '0.5rem 0' : '0.75rem',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            textAlign: isCollapsed ? 'center' : 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '0.45rem' }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: backendHealthy ? '#34C759' : '#FF9F0A',
                display: 'inline-block',
              }}
            />
            {!isCollapsed && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {backendHealthy ? 'FastAPI Online' : 'Connecting API'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <div style={{ fontSize: '0.685rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Port 8000 • SQLite DB Active
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
