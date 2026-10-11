import React, { useState, useEffect, useCallback } from 'react';
import type { HealingMemoryRecord } from '../../../types';
import { ApiService } from '../../../api/client';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';

export const HealingMemoryView: React.FC = () => {
  const [memories, setMemories] = useState<HealingMemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchMemory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getHealingMemory();
      setMemories(data);
    } catch (_) {
      setMemories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const handleClearMemory = async () => {
    if (!window.confirm('Clear all learned self-healing locator cache from SQLite? Future runs will re-encounter selector drift and re-evaluate live.')) {
      return;
    }
    try {
      await ApiService.clearHealingMemory();
      setFeedback('✓ Healing memory cache cleared successfully.');
      setTimeout(() => setFeedback(null), 3000);
      await fetchMemory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      alert(`Failed to clear cache: ${msg}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            SQLite Healing Memory Cache
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Persistent SQLite cache storing verified dynamic locator recoveries. Avoids redundant re-discovery timeouts on subsequent runs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={fetchMemory} isLoading={isLoading}>
            ↻ Refresh Cache
          </Button>
          <Button variant="danger" onClick={handleClearMemory} disabled={memories.length === 0}>
            Clear Memory Cache
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="alert-success" style={{ margin: 0 }}>
          {feedback}
        </div>
      )}

      {/* Memory Table */}
      <Card title={`Active Healing Mappings (${memories.length})`}>
        {memories.length === 0 ? (
          <EmptyState
            icon="🧠"
            title="Healing memory cache is currently empty"
            description="When a Playwright test encounters an interface change and recovers successfully, the verified locator mapping is stored here for accelerated future executions."
          />
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Original Intent</th>
                  <th>Obsolete Selector</th>
                  <th>Recovered Target</th>
                  <th>Confidence</th>
                  <th>Dual Verified</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                {memories.map((m, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{m.original_intent}</td>
                    <td><code>{m.original_locator}</code></td>
                    <td><code style={{ color: 'var(--primary)' }}>{m.recovered_locator}</code></td>
                    <td>
                      <span className="badge-healed" style={{ fontSize: '0.75rem' }}>
                        {Math.round(m.confidence * 100)}%
                      </span>
                    </td>
                    <td>
                      <span className="badge-pass" style={{ fontSize: '0.75rem' }}>
                        ✓ UI &amp; SQLite
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {m.timestamp || 'Recently'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
