import React, { useState } from 'react';
import type { DemoMode } from '../types';

interface LandingPageProps {
  onSelectMode: (mode: DemoMode) => void;
  onResetData: () => void;
  backendHealthy: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectMode,
  onResetData,
  backendHealthy,
}) => {
  const [activeVisualStep, setActiveVisualStep] = useState<number>(7);

  // Exact 8-step sequence requested in the prompt
  const flowSequence = [
    { num: '01', title: 'VERSION A', desc: 'Baseline UI & Test', state: 'normal' },
    { num: '02', title: 'TEST PASSES', desc: 'Baseline Passes', state: 'green' },
    { num: '03', title: 'UI CHANGES', desc: 'Interface Mutates', state: 'amber' },
    { num: '04', title: 'OLD SELECTOR FAILS', desc: 'Selector Missing', state: 'red' },
    { num: '05', title: 'INTENT ANALYZED', desc: 'Intent Extracted', state: 'blue' },
    { num: '06', title: 'WORKFLOW RECONSTRUCTED', desc: 'Candidate Scored', state: 'blue' },
    { num: '07', title: 'OUTCOME VERIFIED', desc: 'Dual Verification', state: 'blue' },
    { num: '08', title: '✓ SELF-HEALED', desc: 'Recovery Certified', state: 'green' },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-root">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-tag">
          <span>⚡</span>
          <span>Intent-Aware Self-Healing E2E Testing</span>
        </div>

        <h1 className="hero-headline">
          Your Tests Should Survive Change.
        </h1>

        <p className="hero-subtitle">
          TestPhoenix understands test intent, reconstructs workflows when interfaces change,
          and verifies that the application still behaves correctly.
        </p>

        <div className="hero-actions">
          <button
            id="run-test-hero-btn"
            className="btn-primary"
            style={{ padding: '0.8rem 1.85rem', fontSize: '0.95rem' }}
            onClick={() => onSelectMode('self-healing')}
          >
            Run a Test
          </button>
          <button
            id="see-how-it-works-btn"
            className="btn-secondary"
            style={{ padding: '0.8rem 1.85rem', fontSize: '0.95rem' }}
            onClick={() => scrollToSection('intent-vs-traditional')}
          >
            See How It Works ↓
          </button>
        </div>

        {/* Main Visual Sequence: VERSION A ➔ TEST PASSES ➔ UI CHANGES ➔ OLD SELECTOR FAILS ➔ INTENT ANALYZED ➔ WORKFLOW RECONSTRUCTED ➔ OUTCOME VERIFIED ➔ ✓ SELF-HEALED */}
        <div className="hero-visual-card">
          <div className="visual-header">
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)' }}>
                Core Product Flow
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>
                Intent → Execute → Detect Change → Analyze Intent → Reconstruct → Verify → Result
              </h3>
            </div>
            <span className="badge badge-in-progress">
              Live Lifecycle Model
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {flowSequence.map((step, idx) => {
              const isSelected = activeVisualStep === idx;
              let borderClass = 'var(--border-color)';
              let bgClass = 'var(--bg-subtle)';
              let textColor = 'var(--text-primary)';

              if (step.state === 'green') {
                borderClass = 'var(--status-pass)';
                bgClass = 'var(--status-pass-bg)';
                textColor = 'var(--status-pass-text)';
              } else if (step.state === 'red') {
                borderClass = 'var(--status-fail)';
                bgClass = 'var(--status-fail-bg)';
                textColor = 'var(--status-fail-text)';
              } else if (step.state === 'amber') {
                borderClass = 'var(--status-review)';
                bgClass = 'var(--status-review-bg)';
                textColor = 'var(--status-review-text)';
              } else if (isSelected || step.state === 'blue') {
                borderClass = 'var(--primary)';
                bgClass = 'rgba(0, 113, 227, 0.05)';
                textColor = 'var(--primary)';
              }

              return (
                <div
                  key={step.num}
                  onClick={() => setActiveVisualStep(idx)}
                  style={{
                    background: bgClass,
                    border: `1px solid ${borderClass}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.95rem 0.85rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {step.num}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: textColor, margin: '0.2rem 0' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1.25rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Stage Details:</strong> {flowSequence[activeVisualStep].num} — {flowSequence[activeVisualStep].title} ({flowSequence[activeVisualStep].desc})
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
              onClick={() => onSelectMode('self-healing')}
            >
              Test Live in Interactive Sandbox →
            </button>
          </div>
        </div>
      </section>

      {/* 2. INTENT VS TRADITIONAL TESTING (Section 2 of prompt) */}
      <section id="intent-vs-traditional" className="story-section">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-eyebrow">The Architectural Paradigm Shift</div>
          <h2 className="section-title">Intent-Driven vs. Traditional Testing</h2>
          <p className="section-desc" style={{ margin: '0 auto' }}>
            Traditional tests couple directly to fragile DOM implementation details. TestPhoenix binds directly to human intent.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
          {/* Traditional Card */}
          <div className="task-card" style={{ padding: '2.5rem', borderTop: '4px solid var(--status-fail)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--status-fail-text)' }}>
                Traditional Selector-Based Tests
              </span>
              <span className="badge badge-fail">BRITTLE</span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              Crashes on Harmless Design Changes
            </h3>

            <div style={{ background: '#1D1D1F', color: '#F5F5F7', padding: '1.25rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              <div style={{ color: '#86868B' }}>// Fixed CSS Selector Dependency</div>
              <div>click(<span style={{ color: '#FF3B30' }}>"#checkout-button"</span>)</div>
              <div style={{ color: '#86868B', textAlign: 'center', margin: '0.5rem 0' }}>↓</div>
              <div style={{ color: '#FF9F0A' }}>// Button renamed to "Proceed to Payment"</div>
              <div>Selector breaks (Timeout: 1500ms)</div>
              <div style={{ color: '#86868B', textAlign: 'center', margin: '0.5rem 0' }}>↓</div>
              <div style={{ color: '#FF3B30', fontWeight: 700 }}>✕ TEST FAILS (False Negative)</div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55 }}>
              Engineers waste hours triaging broken builds, updating selector strings, and maintaining fragile test suites after every design system update.
            </p>
          </div>

          {/* TestPhoenix Card */}
          <div className="task-card" style={{ padding: '2.5rem', borderTop: '4px solid var(--status-pass)', position: 'relative', boxShadow: 'var(--shadow-hover)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--status-pass-text)' }}>
                TestPhoenix Intent-Aware Engine
              </span>
              <span className="badge badge-done">SELF-HEALING</span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              Survives Redesigns, Reconstructs &amp; Verifies
            </h3>

            <div style={{ background: '#F0F6FF', color: '#1D1D1F', border: '1px solid rgba(0, 113, 227, 0.25)', padding: '1.25rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              <div style={{ color: 'var(--primary)', fontWeight: 600 }}>// Pure Semantic Workflow Intent</div>
              <div>"Complete checkout with a valid card."</div>
              <div style={{ color: 'var(--primary)', textAlign: 'center', margin: '0.5rem 0' }}>↓</div>
              <div>Understand intent &amp; inspect DOM tree</div>
              <div style={{ color: 'var(--primary)', textAlign: 'center', margin: '0.5rem 0' }}>↓</div>
              <div>Find candidate (<code style={{ color: 'var(--primary)' }}>#proceed-to-payment-btn</code> - 94%)</div>
              <div style={{ color: 'var(--primary)', textAlign: 'center', margin: '0.5rem 0' }}>↓</div>
              <div>Rebuild workflow &amp; verify outcome in SQLite</div>
              <div style={{ color: 'var(--primary)', textAlign: 'center', margin: '0.5rem 0' }}>↓</div>
              <div style={{ color: 'var(--status-pass-text)', fontWeight: 700 }}>✓ SELF-HEALED (Verified)</div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55 }}>
              Tests survive interface revamps seamlessly. Recovery plans are verified against actual backend state and cached in SQLite healing memory.
            </p>
          </div>
        </div>
      </section>

      {/* 3. FAILURE + HUMAN REVIEW (Section 7 of prompt) */}
      <section className="story-section">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-eyebrow">Safety Boundaries</div>
          <h2 className="section-title">The Three System Outcomes</h2>
          <p className="section-desc" style={{ margin: '0 auto' }}>
            TestPhoenix never blindly clicks elements. Strict safety gates govern every decision.
          </p>
        </div>

        <div className="triad-grid">
          {/* Outcome 1: Harmless UI Change */}
          <div className="triad-card border-green">
            <div>
              <span className="status-badge-healed" style={{ marginBottom: '1rem' }}>
                ✓ SELF-HEALED
              </span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.75rem 0 0.5rem 0' }}>
                Harmless UI Change
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                UI layout or identifiers mutated, but user workflow and backend APIs work normally.
                Candidate score ≥ 0.75 and margin ≥ 0.15. Expected outcome verified in UI &amp; database.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--status-pass-text)', fontWeight: 600 }}>
              Confidence ≥ 0.75 • Margin ≥ 0.15 • Verified
            </div>
          </div>

          {/* Outcome 2: Genuine Application Failure */}
          <div className="triad-card border-red">
            <div>
              <span className="status-badge-fail" style={{ marginBottom: '1rem' }}>
                ✕ GENUINE FAILURE
              </span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.75rem 0 0.5rem 0' }}>
                Genuine Application Failure
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Payment API returns 500, or expected confirmation is never received.
                Healing is actively suppressed to prevent masking real defects.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--status-fail-text)', fontWeight: 600 }}>
              Payment API 500 • Defect Unmasked • Preserved
            </div>
          </div>

          {/* Outcome 3: Ambiguous Recovery */}
          <div className="triad-card border-amber">
            <div>
              <span className="status-badge-review" style={{ marginBottom: '1rem' }}>
                ⚠️ HUMAN REVIEW REQUIRED
              </span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.75rem 0 0.5rem 0' }}>
                Ambiguous Recovery
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Multiple candidate buttons are equally plausible (score difference &lt; 0.15).
                System halts execution rather than guessing incorrectly.
              </p>
            </div>
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--status-review-text)', fontWeight: 600 }}>
              Multiple Targets • Score Margin &lt; 0.15 • Guarded
            </div>
          </div>
        </div>
      </section>

      {/* 4. RECOVERY ENGINE (Section 8 of prompt) */}
      <section id="how-it-works" className="story-section">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="section-eyebrow">Technical Architecture</div>
          <h2 className="section-title">The Recovery Engine Flow</h2>
          <p className="section-desc" style={{ margin: '0 auto' }}>
            A deterministic pipeline from test intent to outcome verification.
          </p>
        </div>

        <div className="arch-flow-container">
          <div className="arch-node-box">
            <div className="arch-node-title">1. Test Intent</div>
            <div className="arch-node-desc">Goal &amp; Semantics</div>
          </div>
          <div className="arch-arrow-icon">➔</div>

          <div className="arch-node-box">
            <div className="arch-node-title">2. Failure Detection</div>
            <div className="arch-node-desc">Classify Root Cause</div>
          </div>
          <div className="arch-arrow-icon">➔</div>

          <div className="arch-node-box">
            <div className="arch-node-title">3. Interface Analysis</div>
            <div className="arch-node-desc">DOM &amp; A11y Tree</div>
          </div>
          <div className="arch-arrow-icon">➔</div>

          <div className="arch-node-box">
            <div className="arch-node-title">4. Candidate Discovery</div>
            <div className="arch-node-desc">Extract Elements</div>
          </div>
          <div className="arch-arrow-icon">➔</div>

          <div className="arch-node-box">
            <div className="arch-node-title">5. Intent Matching</div>
            <div className="arch-node-desc">5-Factor Scoring</div>
          </div>
          <div className="arch-arrow-icon">➔</div>

          <div className="arch-node-box">
            <div className="arch-node-title">6. Reconstruction</div>
            <div className="arch-node-desc">Synthesize Action</div>
          </div>
          <div className="arch-arrow-icon">➔</div>

          <div className="arch-node-box">
            <div className="arch-node-title">7. Action Replay</div>
            <div className="arch-node-desc">Playwright Sync</div>
          </div>
          <div className="arch-arrow-icon">➔</div>

          <div className="arch-node-box" style={{ borderColor: 'var(--status-pass)', background: 'var(--status-pass-bg)' }}>
            <div className="arch-node-title" style={{ color: 'var(--status-pass-text)' }}>8. Verification</div>
            <div className="arch-node-desc" style={{ color: 'var(--status-pass-text)' }}>Outcome in DB</div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION / LAUNCHPAD */}
      <section className="story-section" style={{ textAlign: 'center', background: '#FFFFFF', padding: '3.5rem 2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '0.75rem' }}>
          Ready to See Self-Healing in Action?
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 620, margin: '0 auto 2rem auto' }}>
          Experience the interactive checkout demo, launch Playwright scenarios, and review verified telemetry.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            id="launch-demo-cta"
            className="btn-primary"
            style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}
            onClick={() => onSelectMode('self-healing')}
          >
            Launch Interactive Demo →
          </button>
          <button
            id="open-dashboard-cta"
            className="btn-secondary"
            style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}
            onClick={() => onSelectMode('dashboard')}
          >
            Open Dashboard
          </button>
        </div>
      </section>

      {/* 6. MINIMALIST APPLE FOOTER */}
      <footer className="footer-root">
        <div>
          <strong>TestPhoenix</strong> — Rise Above Every UI Change. Built for Smart India Hackathon.
        </div>
        <div className="footer-links">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: backendHealthy ? '#34C759' : '#FF9F0A', display: 'inline-block' }} />
            {backendHealthy ? 'API Online' : 'Connecting'}
          </span>
          <button
            onClick={onResetData}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline' }}
          >
            Reset SQLite DB
          </button>
          <a
            href="http://127.0.0.1:8000/api/evaluation/csv"
            className="footer-link"
          >
            Export CSV
          </a>
        </div>
      </footer>
    </div>
  );
};
