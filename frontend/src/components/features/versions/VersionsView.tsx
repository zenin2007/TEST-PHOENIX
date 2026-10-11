import React, { useState, useEffect, useCallback } from 'react';
import type { TestVersion } from '../../../types';
import { ApiService } from '../../../api/client';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';

export const VersionsView: React.FC = () => {
  const [versions, setVersions] = useState<TestVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string>('ALL');
  const [selectedVersion, setSelectedVersion] = useState<TestVersion | null>(null);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getTestVersions();
      setVersions(data);
    } catch {
      // Backend may be offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Unique test suite IDs
  const suiteIds = Array.from(new Set(versions.map((v) => v.test_id)));

  const filteredVersions = versions.filter(
    (v) => selectedSuite === 'ALL' || v.test_id === selectedSuite
  );

  // Group by test_id
  const groupedBySuite = filteredVersions.reduce<Record<string, TestVersion[]>>((acc, v) => {
    if (!acc[v.test_id]) acc[v.test_id] = [];
    acc[v.test_id].push(v);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Continuous Test Versioning
            </h1>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-full)', background: 'var(--accent-glow)', color: 'var(--primary)', fontWeight: 600 }}>
              Continuous Baseline Chain
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Every successful healing promotes a new Test Version that automatically becomes the active baseline for subsequent runs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Button variant="secondary" onClick={fetchVersions} isLoading={isLoading}>
            ↻ Refresh Versions
          </Button>
        </div>
      </div>

      {/* Lifecycle Diagram Explanation */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.04em' }}>
              Core Continuous Healing Lifecycle
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              App V1 ↔ Test V1 &nbsp;→&nbsp; (SELF-HEAL) &nbsp;→&nbsp; App V2 ↔ Test V2 [ACTIVE BASELINE] &nbsp;→&nbsp; (SELF-HEAL) &nbsp;→&nbsp; App V3 ↔ Test V3
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
              Previous versions remain immutable and archived in SQLite. Healing decisions use the latest active baseline rather than stale legacy mappings.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-inset)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Active Baselines: <strong style={{ color: 'var(--text-primary)' }}>{versions.filter(v => v.is_active_baseline).length}</strong>
              &nbsp;•&nbsp; Historical Versions: <strong style={{ color: 'var(--text-primary)' }}>{versions.filter(v => !v.is_active_baseline).length}</strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter by Suite */}
      {suiteIds.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter Test Suite:</span>
          <button
            onClick={() => setSelectedSuite('ALL')}
            style={{
              border: 'none',
              background: selectedSuite === 'ALL' ? 'var(--primary)' : 'var(--bg-card)',
              color: selectedSuite === 'ALL' ? '#FFFFFF' : 'var(--text-secondary)',
              padding: '0.3rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              borderStyle: 'solid',
              borderWidth: '1px',
              borderColor: selectedSuite === 'ALL' ? 'var(--primary)' : 'var(--border-color)',
            }}
          >
            All Suites ({versions.length})
          </button>
          {suiteIds.map((sid) => (
            <button
              key={sid}
              onClick={() => setSelectedSuite(sid)}
              style={{
                border: 'none',
                background: selectedSuite === sid ? 'var(--primary)' : 'var(--bg-card)',
                color: selectedSuite === sid ? '#FFFFFF' : 'var(--text-secondary)',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                borderStyle: 'solid',
                borderWidth: '1px',
                borderColor: selectedSuite === sid ? 'var(--primary)' : 'var(--border-color)',
              }}
            >
              <code>{sid}</code>
            </button>
          ))}
        </div>
      )}

      {/* Versions List */}
      {versions.length === 0 ? (
        <EmptyState
          title="No test versions recorded yet"
          description="Execute a test scenario or run self-healing to establish baseline Test V1 and auto-promoted versions."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(groupedBySuite).map(([suiteId, suiteVersions]) => {
            const sorted = [...suiteVersions].sort((a, b) => a.version_number - b.version_number);
            return (
              <Card key={suiteId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                      Workflow Lifecycle
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0.15rem 0 0 0', color: 'var(--text-primary)' }}>
                      <code>{suiteId}</code>
                    </h3>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {sorted.length} Version{sorted.length > 1 ? 's' : ''} in Chain
                  </div>
                </div>

                {/* Vertical Progression Chain */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                  {sorted.map((ver, idx) => {
                    const isLast = idx === sorted.length - 1;
                    return (
                      <React.Fragment key={ver.id}>
                        {/* Version Node Box */}
                        <div
                          onClick={() => setSelectedVersion(ver)}
                          style={{
                            background: ver.is_active_baseline ? '#F0FDF4' : 'var(--bg-inset)',
                            border: ver.is_active_baseline ? '1.5px solid #86EFAC' : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: ver.is_active_baseline ? '#16A34A' : '#94A3B8',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              V{ver.version_number}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                  {ver.version_label}
                                </span>
                                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                  {ver.app_version}
                                </span>
                                {ver.is_active_baseline ? (
                                  <span style={{ fontSize: '0.725rem', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-full)', background: '#DCFCE7', color: '#15803D', fontWeight: 700, border: '1px solid #BBF7D0' }}>
                                    ● ACTIVE BASELINE
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.725rem', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                                    ARCHIVED BASELINE
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                {ver.healing_summary || 'Initial baseline definition'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', textAlign: 'right' }}>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: ver.confidence && ver.confidence >= 0.75 ? '#16A34A' : 'var(--text-primary)' }}>
                                {ver.confidence ? `${(ver.confidence * 100).toFixed(1)}%` : '100%'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Parent Version</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {ver.parent_version_id ? `#${ver.parent_version_id}` : 'ROOT'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {ver.created_at ? new Date(ver.created_at).toLocaleTimeString() : 'N/A'}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedVersion(ver); }}>
                              Details ↗
                            </Button>
                          </div>
                        </div>

                        {/* Self-Heal Connector if not last */}
                        {!isLast && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.25rem 0' }}>
                            <div style={{ height: 1, width: 40, background: 'var(--border-color)' }} />
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.2rem 0.75rem',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--accent-glow)',
                                color: 'var(--primary)',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                border: '1px solid var(--accent-light)',
                              }}
                            >
                              <span>↓</span>
                              <span>SELF-HEALED</span>
                              <span>↓</span>
                            </div>
                            <div style={{ height: 1, width: 40, background: 'var(--border-color)' }} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Selected Version Detail Modal */}
      {selectedVersion && (
        <div
          onClick={() => setSelectedVersion(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              maxWidth: 640,
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-floating)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {selectedVersion.test_id}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
                  {selectedVersion.version_label} &bull; {selectedVersion.app_version}
                </h2>
              </div>
              <button
                onClick={() => setSelectedVersion(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: 'var(--bg-inset)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Baseline</span>
                <div style={{ fontWeight: 600, color: selectedVersion.is_active_baseline ? '#16A34A' : 'var(--text-secondary)' }}>
                  {selectedVersion.is_active_baseline ? 'YES (Active for next heal)' : 'NO (Historical Archive)'}
                </div>
              </div>
              <div style={{ background: 'var(--bg-inset)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confidence</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedVersion.confidence ? `${(selectedVersion.confidence * 100).toFixed(1)}%` : '100%'}
                </div>
              </div>
            </div>

            {selectedVersion.healing_summary && (
              <div style={{ background: 'var(--accent-glow)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-light)', fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--primary)' }}>Healing Event:</strong> {selectedVersion.healing_summary}
              </div>
            )}

            {selectedVersion.verification_result && (
              <div style={{ background: '#DCFCE7', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '0.85rem' }}>
                <strong>Verification:</strong> {selectedVersion.verification_result}
              </div>
            )}

            {selectedVersion.workflow_steps_json && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Workflow Steps JSON:
                </span>
                <pre style={{ maxHeight: 180, overflowY: 'auto', background: '#1D1D1F', color: '#F5F5F7', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                  {selectedVersion.workflow_steps_json}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setSelectedVersion(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
