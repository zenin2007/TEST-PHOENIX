import React, { useState } from 'react';
import type { ScenarioDefinition, TestRun } from '../../../types';
import { Card } from '../../ui/Card';
import { StatusBadge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { LiveTestCreator } from './LiveTestCreator';

interface TestsViewProps {
  onExecuteScenario: (endpoint: string, label: string) => void;
  isRunning: boolean;
  runningLabel: string;
  recentRuns: TestRun[];
  onRefreshRuns?: () => void;
}

export const TestsView: React.FC<TestsViewProps> = ({
  onExecuteScenario,
  isRunning,
  runningLabel,
  recentRuns,
  onRefreshRuns,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'scenarios'>('live');

  const scenarios: ScenarioDefinition[] = [
    {
      id: 'task-a',
      name: 'Version A: Task Creator (Baseline)',
      domain: 'Task Management',
      intent: 'Open modal and create new development task',
      baselineSelector: '#create-task-btn',
      redesignSelector: '#create-task-btn',
      expectedStatus: 'PASS',
      endpoint: '/api/tests/normal',
      description: 'Standard baseline dialog execution with conventional input IDs and submit triggers.',
    },
    {
      id: 'task-b',
      name: 'Version B: Work Item Drawer (Redesign)',
      domain: 'Task Management',
      intent: 'Open modal and create new development task',
      baselineSelector: '#create-task-btn',
      redesignSelector: '#new-work-item-btn',
      expectedStatus: 'SELF-HEALED',
      endpoint: '/api/tests/self-healing',
      description: 'Slideout drawer overhaul with modified trigger ID, renamed field labels, and button redesign.',
    },
    {
      id: 'store-a',
      name: 'Store A: Audio Pro Storefront (Baseline)',
      domain: 'E-Commerce',
      intent: 'Add wireless headphones to cart and complete checkout',
      baselineSelector: '#add-to-cart-btn',
      redesignSelector: '#add-to-cart-btn',
      expectedStatus: 'PASS',
      endpoint: '/api/tests/shopping-a',
      description: 'Canonical shopping cart flow with standard checkout modal and form inputs.',
    },
    {
      id: 'store-b',
      name: 'Store B: Sound Experience (Redesign)',
      domain: 'E-Commerce',
      intent: 'Add wireless headphones to cart and complete checkout',
      baselineSelector: '#add-to-cart-btn',
      redesignSelector: '#purchase-audio-item',
      expectedStatus: 'SELF-HEALED',
      endpoint: '/api/tests/shopping-b',
      description: 'Hero layout with slideout bag drawer, renamed recipient input, and payment trigger mutation.',
    },
    {
      id: 'defect-500',
      name: 'Simulated Database Failure (HTTP 500)',
      domain: 'Edge Scenarios',
      intent: 'Create task with corrupted transaction context',
      baselineSelector: '#create-task-btn',
      redesignSelector: '#create-task-btn',
      expectedStatus: 'FAIL',
      endpoint: '/api/tests/broken-backend',
      description: 'Simulates genuine server database crash; validates that UI self-healing is strictly suppressed.',
    },
    {
      id: 'ambiguity-gate',
      name: 'Ambiguous Target Challenge',
      domain: 'Edge Scenarios',
      intent: 'Click ambiguous action with competing buttons',
      baselineSelector: '#submit-btn',
      redesignSelector: '#btn-opt1 vs #btn-opt2',
      expectedStatus: 'HUMAN REVIEW REQUIRED',
      endpoint: '/api/tests/ambiguous',
      description: 'Evaluates multiple identical buttons; tests the safety gate halt when margin is below 0.15.',
    },
  ];

  const getLatestRunForScenario = (name: string) => {
    return recentRuns.find((r) => r.scenario.toLowerCase().includes(name.toLowerCase().slice(0, 10)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Test Suites &amp; Live Browser Engine
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Run real website tests with local Playwright Chromium execution or run predefined benchmark resilience suites.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--bg-inset)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              style={{
                border: 'none',
                background: activeTab === 'live' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'live' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'live' ? 600 : 500,
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                fontSize: '0.825rem',
                boxShadow: activeTab === 'live' ? 'var(--shadow-card)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              🌐 Real Website Testing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scenarios')}
              style={{
                border: 'none',
                background: activeTab === 'scenarios' ? 'var(--bg-card)' : 'transparent',
                color: activeTab === 'scenarios' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'scenarios' ? 600 : 500,
                padding: '0.45rem 0.95rem',
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                fontSize: '0.825rem',
                boxShadow: activeTab === 'scenarios' ? 'var(--shadow-card)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              📋 Benchmark Scenarios
            </button>
          </div>

          {activeTab === 'scenarios' && (
            <Button
              variant="secondary"
              onClick={() => onExecuteScenario('/api/evaluation/run', 'Full 20-Scenario Benchmark')}
              disabled={isRunning}
            >
              <span>📊</span> Run Full Benchmark
            </Button>
          )}
        </div>
      </div>

      {/* View Switcher Body */}
      {activeTab === 'live' ? (
        <LiveTestCreator onTestCompleted={() => onRefreshRuns && onRefreshRuns()} />
      ) : (
        /* Scenario Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.5rem' }}>
          {scenarios.map((sc) => {
            const latest = getLatestRunForScenario(sc.name);
            const isCurrentlyRunning = isRunning && runningLabel.includes(sc.name.slice(0, 8));

            return (
              <Card
                key={sc.id}
                title={sc.name}
                subtitle={sc.domain}
                action={<StatusBadge status={latest ? latest.status : sc.expectedStatus} />}
                footer={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {latest ? `Last run: ${latest.created_at || 'Recently'}` : 'Not run recently'}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onExecuteScenario(sc.endpoint, sc.name)}
                      disabled={isRunning}
                      isLoading={isCurrentlyRunning}
                    >
                      ▶ Run Scenario
                    </Button>
                  </div>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.45, margin: 0 }}>
                    {sc.description}
                  </p>

                  <div style={{ background: 'var(--bg-inset)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.785rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Intent:</span> <strong>{sc.intent}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Original:</span> <code>{sc.baselineSelector}</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Target:</span> <code>{sc.redesignSelector}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
