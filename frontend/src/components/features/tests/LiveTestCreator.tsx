import React, { useState } from 'react';
import type { LiveTestRequest, LiveTestResponse } from '../../../types';
import { ApiService } from '../../../api/client';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { StatusBadge } from '../../ui/Badge';

interface LiveTestCreatorProps {
  onTestCompleted?: (result: LiveTestResponse) => void;
}

interface Preset {
  id: string;
  name: string;
  url: string;
  intent: string;
  expectedOutcome: string;
}

const PRESETS: Preset[] = [
  {
    id: 'demo-version-a',
    name: 'Controlled Storefront — Version A (Baseline)',
    url: 'http://127.0.0.1:8000/demo/checkout?version=a',
    intent: 'Proceed to checkout.',
    expectedOutcome: 'Checkout/payment page is displayed.',
  },
  {
    id: 'demo-version-b',
    name: 'Controlled Storefront — Version B (Self-Healing Demo)',
    url: 'http://127.0.0.1:8000/demo/checkout?version=b',
    intent: 'Proceed to checkout.',
    expectedOutcome: 'Checkout/payment page is displayed.',
  },
  {
    id: 'demo-broken',
    name: 'Controlled Storefront — HTTP 500 (Genuine Backend Failure)',
    url: 'http://127.0.0.1:8000/demo/checkout?version=broken',
    intent: 'Proceed to checkout.',
    expectedOutcome: 'Checkout/payment page is displayed.',
  },
  {
    id: 'demo-ambiguous',
    name: 'Controlled Storefront — Ambiguous (Human Review Required)',
    url: 'http://127.0.0.1:8000/demo/checkout?version=ambiguous',
    intent: 'Proceed to checkout.',
    expectedOutcome: 'Checkout/payment page is displayed.',
  },
  {
    id: 'example',
    name: 'Example Domain Verification',
    url: 'https://example.com',
    intent: 'Verify page heading, check paragraph copy, and inspect primary action links.',
    expectedOutcome: 'Page title is "Example Domain" and "More information..." anchor is discovered in DOM.',
  },
  {
    id: 'hn',
    name: 'Hacker News Frontpage Inspection',
    url: 'https://news.ycombinator.com',
    intent: 'Inspect top stories table, voting controls, and navigation links.',
    expectedOutcome: 'Frontpage stories are rendered with interactive rank anchors and comments.',
  },
  {
    id: 'local-audit',
    name: 'TestPhoenix Local Audit Portal',
    url: 'http://127.0.0.1:8000/results',
    intent: 'Inspect local telemetry dashboard header and benchmark metrics.',
    expectedOutcome: 'TestPhoenix audit portal loads cleanly with status tables intact.',
  },
];

export const LiveTestCreator: React.FC<LiveTestCreatorProps> = ({ onTestCompleted }) => {
  const [testName, setTestName] = useState('Example Domain Live Inspection');
  const [websiteUrl, setWebsiteUrl] = useState('https://example.com');
  const [intent, setIntent] = useState('Verify page heading, check paragraph copy, and inspect primary action links.');
  const [expectedOutcome, setExpectedOutcome] = useState('Page title is "Example Domain" and "More information..." anchor is discovered in DOM.');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<LiveTestResponse | null>(null);
  const [showAllElements, setShowAllElements] = useState(false);

  const applyPreset = (preset: Preset) => {
    setTestName(preset.name);
    setWebsiteUrl(preset.url);
    setIntent(preset.intent);
    setExpectedOutcome(preset.expectedOutcome);
    setValidationError(null);
    setExecutionError(null);
  };

  const validateInputs = (): boolean => {
    const cleanUrl = websiteUrl.trim();
    if (!cleanUrl) {
      setValidationError('Website URL is required.');
      return false;
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setValidationError('URL must start with http:// or https://');
      return false;
    }
    if (!testName.trim()) {
      setValidationError('Test Name is required.');
      return false;
    }
    if (!intent.trim()) {
      setValidationError('Test Intent is required.');
      return false;
    }
    if (!expectedOutcome.trim()) {
      setValidationError('Expected Outcome is required.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleRunLiveTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    setExecutionError(null);
    setTestResult(null);
    setLoadingStep('Launching real Chromium browser session...');

    const stepTimer1 = setTimeout(() => {
      setLoadingStep(`Navigating to ${websiteUrl.trim()}...`);
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('Inspecting DOM elements and accessibility tree...');
    }, 3000);

    const stepTimer3 = setTimeout(() => {
      setLoadingStep('Capturing viewport evidence and compiling telemetry...');
    }, 4500);

    try {
      const payload: LiveTestRequest = {
        test_name: testName.trim(),
        website_url: websiteUrl.trim(),
        intent: intent.trim(),
        expected_outcome: expectedOutcome.trim(),
      };

      const result = await ApiService.runLiveTest(payload);
      setTestResult(result);
      if (result.status === 'FAIL' && result.error) {
        setExecutionError(result.error);
      }
      if (onTestCompleted) {
        onTestCompleted(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Live test execution failed';
      setExecutionError(msg);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Workflow Form Card */}
      <Card
        title="Create & Run Real Website Test"
        subtitle="Execute tests on live websites using the local Playwright browser engine — real navigation, DOM inspection, accessibility extraction, and screenshot capture."
        action={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn-secondary"
                onClick={() => applyPreset(p)}
                disabled={isLoading}
                style={{ fontSize: '0.725rem', padding: '0.25rem 0.55rem' }}
                title={`Load preset: ${p.name}`}
              >
                {p.id === 'example' ? '🌐 example.com' : p.id === 'hn' ? '📰 HackerNews' : '⚡ Audit Portal'}
              </button>
            ))}
          </div>
        }
      >
        <form onSubmit={handleRunLiveTest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label htmlFor="test-name-input" className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                Test Name <span style={{ color: 'var(--status-fail-text)' }}>*</span>
              </label>
              <input
                id="test-name-input"
                type="text"
                className="form-input"
                placeholder="e.g. Production Checkout Flow"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="website-url-input" className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                Website URL <span style={{ color: 'var(--status-fail-text)' }}>*</span>
              </label>
              <input
                id="website-url-input"
                type="url"
                className="form-input"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="intent-input" className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
              Natural-Language Test Intent <span style={{ color: 'var(--status-fail-text)' }}>*</span>
            </label>
            <textarea
              id="intent-input"
              className="form-input"
              rows={2}
              placeholder="e.g. Search for a product and open the first result."
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              disabled={isLoading}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label htmlFor="outcome-input" className="form-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
              Expected Outcome <span style={{ color: 'var(--status-fail-text)' }}>*</span>
            </label>
            <textarea
              id="outcome-input"
              className="form-input"
              rows={2}
              placeholder="e.g. Product details page is displayed."
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
              disabled={isLoading}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          {validationError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--status-fail-bg)',
                border: '1px solid var(--status-fail-border)',
                color: 'var(--status-fail-text)',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setTestName('');
                setWebsiteUrl('');
                setIntent('');
                setExpectedOutcome('');
                setValidationError(null);
                setExecutionError(null);
                setTestResult(null);
              }}
              disabled={isLoading}
            >
              Clear Form
            </Button>

            <Button
              id="run-live-test-btn"
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Running Real Browser...' : '▶ Run Real Test'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Loading State Banner */}
      {isLoading && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center', gap: '1rem' }}>
            <div
              className="spinner-subtle"
              style={{ width: 36, height: 36, borderWidth: 3, borderTopColor: 'var(--primary)' }}
            />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {loadingStep || 'Executing in Real Playwright Browser...'}
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: 520, margin: '0.35rem auto 0 auto' }}>
                TestPhoenix has launched a local Chromium instance via Playwright. Opening <code>{websiteUrl}</code>, waiting for page readiness, and inspecting live DOM and accessibility nodes.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Error State Banner */}
      {executionError && !isLoading && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--status-fail-bg)',
            border: '1px solid var(--status-fail-border)',
            color: 'var(--status-fail-text)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <span style={{ fontSize: '1.2rem' }}>✕</span>
            <span>Test Execution Failed</span>
          </div>
          <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.45 }}>{executionError}</p>
        </div>
      )}

      {/* Real Test Result Display */}
      {testResult && !isLoading && (
        <Card
          title={`Execution Result: ${testResult.test_name}`}
          subtitle={`Run ID: ${testResult.run_id} • Target: ${testResult.website_url}`}
          action={<StatusBadge status={testResult.status} size="md" />}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Saved to SQLite <code>test_runs</code> database</span>
              <span>Duration: <strong>{testResult.execution_duration_ms} ms</strong></span>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Metadata Summary Deck */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: 'var(--bg-inset)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Real Page Title</span>
                <div style={{ marginTop: '0.25rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {testResult.page_title || '(No title)'}
                </div>
              </div>

              <div style={{ background: 'var(--bg-inset)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Resolved URL</span>
                <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', wordBreak: 'break-all', color: 'var(--primary)', fontWeight: 500 }}>
                  <a href={testResult.actual_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    {testResult.actual_url} ↗
                  </a>
                </div>
              </div>

              <div style={{ background: 'var(--bg-inset)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Expected Outcome</span>
                <div style={{ marginTop: '0.25rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  {testResult.expected_outcome}
                </div>
              </div>
            </div>

            {/* Outcome Verification Evidence Banner */}
            {testResult.verification_evidence && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: testResult.status === 'SELF_HEALED'
                    ? 'rgba(94, 92, 230, 0.12)'
                    : testResult.status === 'PASSED'
                    ? 'var(--status-pass-bg)'
                    : testResult.status === 'HUMAN_REVIEW_REQUIRED'
                    ? 'var(--status-review-bg)'
                    : 'var(--status-fail-bg)',
                  border: `1px solid ${
                    testResult.status === 'SELF_HEALED'
                      ? '#5E5CE6'
                      : testResult.status === 'PASSED'
                      ? 'var(--status-pass-border)'
                      : testResult.status === 'HUMAN_REVIEW_REQUIRED'
                      ? 'var(--status-review-border)'
                      : 'var(--status-fail-border)'
                  }`,
                  color: testResult.status === 'SELF_HEALED'
                    ? '#AF52DE'
                    : testResult.status === 'PASSED'
                    ? 'var(--status-pass-text)'
                    : testResult.status === 'HUMAN_REVIEW_REQUIRED'
                    ? 'var(--status-review-text)'
                    : 'var(--status-fail-text)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>
                  {testResult.status === 'SELF_HEALED' ? '✨' : testResult.status === 'PASSED' ? '✓' : testResult.status === 'HUMAN_REVIEW_REQUIRED' ? '⚠️' : '✕'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                    {testResult.status === 'SELF_HEALED'
                      ? 'Outcome Verified (Self-Healed UI)'
                      : testResult.status === 'PASSED'
                      ? 'Outcome Verified (Canonical Execution)'
                      : testResult.status === 'HUMAN_REVIEW_REQUIRED'
                      ? 'Safety Gate Halted Execution (Human Review Required)'
                      : 'Verification Failure'}
                  </div>
                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.825rem', lineHeight: 1.45, opacity: 0.95 }}>
                    {testResult.verification_evidence}
                  </p>
                </div>
              </div>
            )}

            {/* DOM & Accessibility Metric Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {testResult.dom_summary.total_interactive_elements}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Interactive Elements</div>
              </div>

              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {testResult.dom_summary.buttons_count}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Buttons Found</div>
              </div>

              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#30D158' }}>
                  {testResult.dom_summary.inputs_count}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inputs / Textboxes</div>
              </div>

              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#BF5AF2' }}>
                  {testResult.dom_summary.links_count}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Anchor Links</div>
              </div>

              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#FF9F0A' }}>
                  {testResult.accessibility_summary.nodes_count}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accessibility Nodes</div>
              </div>
            </div>

            {/* Intent-to-Action Decomposition & Healing Telemetry */}
            {testResult.actions && testResult.actions.length > 0 && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Intent → Action Execution & Candidate Scoring ({testResult.actions.length} Steps)
                </span>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {testResult.actions.map((act, actIdx) => {
                    const isHealed = act.execution_result.includes('HEAL');
                    const isFail = act.execution_result === 'FAIL';
                    return (
                      <div
                        key={actIdx}
                        style={{
                          background: 'var(--bg-card)',
                          border: `1px solid ${isHealed ? '#5E5CE6' : isFail ? 'var(--status-fail-border)' : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-sm)',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              Step {actIdx + 1}:
                            </span>
                            <span
                              style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: 4,
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: 'var(--primary-subtle)',
                                color: 'var(--primary)',
                              }}
                            >
                              {act.action_type}
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              {act.intent}
                            </span>
                          </div>
                          <div>
                            <StatusBadge status={act.execution_result as any} size="sm" />
                          </div>
                        </div>

                        {/* Step Details */}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                          <div>
                            <strong>Canonical Target:</strong> <code>{act.original_locator || act.target_description}</code>
                          </div>
                          <div>
                            <strong>Original Result:</strong>{' '}
                            {act.original_locator_worked ? (
                              <span style={{ color: '#30D158', fontWeight: 600 }}>Succeeded cleanly</span>
                            ) : (
                              <span style={{ color: '#FF453A', fontWeight: 600 }}>Failed (UI Mutation / Relocation)</span>
                            )}
                          </div>
                          {act.safety_decision && (
                            <div>
                              <strong>Safety Decision:</strong>{' '}
                              <span style={{ fontWeight: 600, color: act.safety_decision === 'PASS' ? '#30D158' : '#FF9F0A' }}>
                                {act.safety_decision}
                              </span>
                            </div>
                          )}
                          {act.score !== undefined && act.score !== null && (
                            <div>
                              <strong>Selected Score:</strong>{' '}
                              <span style={{ fontWeight: 700, color: '#5E5CE6' }}>
                                {(act.score * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Self-Healing Recovery Details */}
                        {isHealed && act.recovered_action && (
                          <div
                            style={{
                              background: 'rgba(94, 92, 230, 0.08)',
                              border: '1px solid rgba(94, 92, 230, 0.3)',
                              borderRadius: 'var(--radius-xs)',
                              padding: '0.75rem',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#AF52DE' }}>
                              <span>⚡ Intent-Aware Self-Healing Reconstructed Action</span>
                            </div>
                            <div style={{ marginTop: '0.35rem', color: 'var(--text-primary)' }}>
                              Replaced missing <code>{act.original_locator}</code> with <code>{act.recovered_action}</code> based on 5-factor candidate analysis.
                            </div>

                            {/* 5-Factor Score Breakdown */}
                            {act.score_breakdown && (
                              <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.35rem' }}>
                                <div style={{ background: 'var(--bg-inset)', padding: '0.35rem 0.5rem', borderRadius: 4, textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Semantic Intent</div>
                                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>{(act.score_breakdown.semantic * 100).toFixed(0)}%</div>
                                </div>
                                <div style={{ background: 'var(--bg-inset)', padding: '0.35rem 0.5rem', borderRadius: 4, textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>A11y Role</div>
                                  <div style={{ fontWeight: 700, color: '#30D158', fontSize: '0.85rem' }}>{(act.score_breakdown.role * 100).toFixed(0)}%</div>
                                </div>
                                <div style={{ background: 'var(--bg-inset)', padding: '0.35rem 0.5rem', borderRadius: 4, textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Visible Text</div>
                                  <div style={{ fontWeight: 700, color: '#BF5AF2', fontSize: '0.85rem' }}>{(act.score_breakdown.text * 100).toFixed(0)}%</div>
                                </div>
                                <div style={{ background: 'var(--bg-inset)', padding: '0.35rem 0.5rem', borderRadius: 4, textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Context</div>
                                  <div style={{ fontWeight: 700, color: '#FF9F0A', fontSize: '0.85rem' }}>{(act.score_breakdown.context * 100).toFixed(0)}%</div>
                                </div>
                                <div style={{ background: 'var(--bg-inset)', padding: '0.35rem 0.5rem', borderRadius: 4, textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Structural</div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{(act.score_breakdown.structural * 100).toFixed(0)}%</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Candidate Ranking List */}
                        {act.candidates && act.candidates.length > 0 && (
                          <div style={{ marginTop: '0.25rem' }}>
                            <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                              Evaluated Candidates & 5-Factor Ranking ({act.candidates.length})
                            </div>
                            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                <thead>
                                  <tr style={{ background: 'var(--bg-inset)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Status</th>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Candidate Selector</th>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Accessible Name</th>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Role</th>
                                    <th style={{ padding: '0.35rem 0.5rem' }}>Score</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {act.candidates.map((cand, cIdx) => {
                                    const isWinner = cand.selector === act.selected_candidate;
                                    return (
                                      <tr key={cIdx} style={{ background: isWinner ? 'rgba(94, 92, 230, 0.06)' : undefined, borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td style={{ padding: '0.35rem 0.5rem', whiteSpace: 'nowrap' }}>
                                          {isWinner ? (
                                            <span style={{ color: '#5E5CE6', fontWeight: 700 }}>★ Selected</span>
                                          ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>#{cIdx + 1}</span>
                                          )}
                                        </td>
                                        <td style={{ padding: '0.35rem 0.5rem', fontFamily: 'monospace', color: isWinner ? '#5E5CE6' : 'var(--text-primary)' }}>
                                          {cand.selector}
                                        </td>
                                        <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-secondary)' }}>
                                          {cand.accessible_name || '—'}
                                        </td>
                                        <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)' }}>
                                          <code>{cand.role}</code>
                                        </td>
                                        <td style={{ padding: '0.35rem 0.5rem', fontWeight: 700, color: cand.score >= 0.75 ? '#30D158' : '#FF9F0A' }}>
                                          {(cand.score * 100).toFixed(1)}%
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Viewport Screenshot Card */}
            {testResult.screenshot_base64 && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Live Viewport Screenshot (1280x800)
                </span>
                <div
                  style={{
                    marginTop: '0.4rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: '#1D1D1F',
                  }}
                >
                  <div
                    style={{
                      background: '#2C2C2E',
                      padding: '0.4rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderBottom: '1px solid #3A3A3C',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF453A', display: 'inline-block' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF9F0A', display: 'inline-block' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#30D158', display: 'inline-block' }} />
                    <span style={{ fontSize: '0.7rem', color: '#98989D', marginLeft: '0.5rem' }}>{testResult.actual_url}</span>
                  </div>
                  <img
                    src={testResult.screenshot_base64}
                    alt={`Playwright viewport screenshot for ${testResult.test_name}`}
                    style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block', background: '#000' }}
                  />
                </div>
              </div>
            )}

            {/* Execution Events Timeline */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Chronological Execution Events ({testResult.events.length})
              </span>
              <div
                style={{
                  marginTop: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: 260,
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem',
                  background: 'var(--bg-inset)',
                }}
              >
                {testResult.events.map((ev, idx) => {
                  const isPass = ev.status === 'PASS';
                  const isFail = ev.status === 'FAIL';
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        fontSize: '0.785rem',
                        padding: '0.4rem 0.5rem',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: isPass ? '#30D158' : isFail ? '#FF453A' : 'var(--primary)', minWidth: 60 }}>
                        {isPass ? '✓ PASS' : isFail ? '✕ FAIL' : 'ℹ INFO'}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', minWidth: 140 }}>
                        {ev.action}
                      </span>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {ev.evidence || ev.error || ev.target}
                        </span>
                        {ev.url && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>URL: {ev.url}</span>}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {ev.timestamp.split('T')[1]?.slice(0, 8) || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sample Discovered Interactive Elements */}
            {testResult.dom_summary.sample_elements.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Sample Discovered Interactive Elements ({testResult.dom_summary.sample_elements.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllElements(!showAllElements)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    {showAllElements ? 'Show Fewer' : 'View Details'}
                  </button>
                </div>

                <div
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    overflowX: 'auto',
                    background: 'var(--bg-card)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.785rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-inset)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Selector</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Tag</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Role</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Accessible Name</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Visible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllElements
                        ? testResult.dom_summary.sample_elements
                        : testResult.dom_summary.sample_elements.slice(0, 8)
                      ).map((el, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.45rem 0.75rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {el.selector}
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-secondary)' }}>
                            <code>{el.tag_name}</code>
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-secondary)' }}>
                            {el.role}
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-primary)' }}>
                            {el.accessible_name || '—'}
                          </td>
                          <td style={{ padding: '0.45rem 0.75rem' }}>
                            {el.is_visible ? (
                              <span style={{ color: '#30D158', fontWeight: 600 }}>Yes</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
