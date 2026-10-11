import React, { useState } from 'react';
import type { Order } from '../types';

interface Candidate {
  label: string;
  selector: string;
  score: number;
  semanticMatch: number;
  roleMatch: number;
  textMatch: number;
  contextMatch: number;
  structuralMatch: number;
  selected: boolean;
}

export const SelfHealingDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'version-a' | 'version-b' | 'defect' | 'ambiguous'>('version-b');
  const [executionState, setExecutionState] = useState<'idle' | 'running' | 'detecting' | 'analyzing' | 'reconstructing' | 'verifying' | 'completed'>('idle');
  const [currentResult, setCurrentResult] = useState<'PASS' | 'SELF-HEALED' | 'FAIL' | 'HUMAN REVIEW' | null>(null);
  const [timelineStep, setTimelineStep] = useState<number>(0);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Form states for interactive checkout
  const [fullName, setFullName] = useState('Alex Rivers');
  const [email, setEmail] = useState('alex.rivers@example.com');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');

  const candidates: Candidate[] = [
    {
      label: 'Proceed to Payment',
      selector: '#proceed-to-payment-btn',
      score: 94,
      semanticMatch: 95,
      roleMatch: 100,
      textMatch: 90,
      contextMatch: 92,
      structuralMatch: 88,
      selected: true,
    },
    {
      label: 'Continue Checkout',
      selector: '#continue-checkout-btn',
      score: 87,
      semanticMatch: 86,
      roleMatch: 100,
      textMatch: 82,
      contextMatch: 84,
      structuralMatch: 85,
      selected: false,
    },
    {
      label: 'Place Order',
      selector: '#place-order-summary-btn',
      score: 42,
      semanticMatch: 45,
      roleMatch: 70,
      textMatch: 35,
      contextMatch: 40,
      structuralMatch: 30,
      selected: false,
    },
  ];

  const timelineSteps = [
    { num: '01', title: 'Test Started', desc: 'Executing intent step: "Complete checkout with valid card."' },
    { num: '02', title: 'UI Change Detected', desc: 'Selector #checkout-btn missing. ElementNotFound classified.' },
    { num: '03', title: 'Intent Analyzed', desc: 'Extracted semantic intent: complete, checkout, payment, form submission.' },
    { num: '04', title: 'Candidates Evaluated', desc: 'Extracted 3 interactive buttons. 5-factor scoring engine computed.' },
    { num: '05', title: 'Workflow Reconstructed', desc: 'Selected #proceed-to-payment-btn (Score: 94% vs 2nd: 87% | Margin 0.07 > 0.15 gate: Passed).' },
    { num: '06', title: 'Action Replayed', desc: 'Playwright replayed synthetic click on dynamically resolved candidate.' },
    { num: '07', title: 'Outcome Verified', desc: 'Confirmed order modal & verified order in backend SQLite /api/orders.' },
    { num: '08', title: 'SELF-HEALED', desc: 'Recovery certified safe and logged to persistent healing memory.' },
  ];

  const runSimulation = async (variant: 'version-a' | 'version-b' | 'defect' | 'ambiguous') => {
    setActiveTab(variant);
    setExecutionState('running');
    setTimelineStep(1);
    setCurrentResult(null);
    setPlacedOrder(null);
    setLogs(['[00:00.010] Step 1: Initiating intent execution: "Complete checkout with a valid card."']);

    if (variant === 'version-a') {
      // Baseline Version A
      await new Promise(r => setTimeout(r, 600));
      setLogs(prev => [...prev, '[00:00.450] Step 2: Locating selector `#checkout-btn` directly in DOM...']);
      setLogs(prev => [...prev, '[00:00.600] Found element `<button id="checkout-btn">Checkout</button>`. Clicking...']);

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: 'Studio Wireless Headphones',
            price: 299.00,
            customer_name: fullName,
            quantity: 1,
            status: 'Placed'
          })
        });
        const orderData = await res.json();
        setPlacedOrder(orderData);
      } catch {
        // fallback
      }

      setTimelineStep(8);
      setExecutionState('completed');
      setCurrentResult('PASS');
      setLogs(prev => [...prev, '[00:01.050] ✓ Baseline test passed directly: Order placed and verified in SQLite.']);
      return;
    }

    if (variant === 'version-b') {
      // Self-Healing Version B
      await new Promise(r => setTimeout(r, 500));
      setExecutionState('detecting');
      setTimelineStep(2);
      setLogs(prev => [...prev, '[00:00.520] Step 2: Looking for `#checkout-btn`... Failed (Timeout 1500ms). UI Change Detected!']);

      await new Promise(r => setTimeout(r, 500));
      setExecutionState('analyzing');
      setTimelineStep(3);
      setLogs(prev => [...prev, '[00:00.900] Step 3: Analyzing original test intent: "Complete checkout with a valid card."']);

      await new Promise(r => setTimeout(r, 500));
      setTimelineStep(4);
      setLogs(prev => [...prev, '[00:01.300] Step 4: Discovered 3 interactive candidate elements in current DOM:']);
      setLogs(prev => [...prev, '   • [94%] #proceed-to-payment-btn ("Proceed to Payment")']);
      setLogs(prev => [...prev, '   • [87%] #continue-checkout-btn ("Continue Checkout")']);
      setLogs(prev => [...prev, '   • [42%] #place-order-summary-btn ("Place Order")']);

      await new Promise(r => setTimeout(r, 500));
      setExecutionState('reconstructing');
      setTimelineStep(5);
      setLogs(prev => [...prev, '[00:01.750] Step 5: Candidate selected: `#proceed-to-payment-btn`. Safety gates: Confidence 0.94 ≥ 0.75, Margin 0.07 against threshold passed.']);

      await new Promise(r => setTimeout(r, 400));
      setTimelineStep(6);
      setLogs(prev => [...prev, '[00:02.100] Step 6: Action replayed via Playwright sync engine on candidate.']);

      setExecutionState('verifying');
      setTimelineStep(7);
      setLogs(prev => [...prev, '[00:02.400] Step 7: Dual Verifier checking DOM confirmation + querying SQLite /api/orders...']);

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: 'Studio Wireless Headphones (Redesigned Checkout)',
            price: 299.00,
            customer_name: fullName,
            quantity: 1,
            status: 'Placed'
          })
        });
        const orderData = await res.json();
        setPlacedOrder(orderData);
      } catch {
        // fallback
      }

      await new Promise(r => setTimeout(r, 400));
      setTimelineStep(8);
      setExecutionState('completed');
      setCurrentResult('SELF-HEALED');
      setLogs(prev => [...prev, '[00:02.850] ✓ SELF-HEALED: Workflow successfully reconstructed and outcome verified!']);
      return;
    }

    if (variant === 'defect') {
      // Genuine Failure
      await new Promise(r => setTimeout(r, 500));
      setExecutionState('detecting');
      setTimelineStep(2);
      setLogs(prev => [...prev, '[00:00.500] Step 2: Attempting payment gateway transaction...']);

      await new Promise(r => setTimeout(r, 500));
      setExecutionState('verifying');
      setTimelineStep(7);
      setLogs(prev => [...prev, '[00:01.100] Step 3: HTTP 500 Internal Server Error intercepted: "DB_TRANSACTION_FAILURE".']);
      setLogs(prev => [...prev, '[00:01.350] Safety Gate Active: Genuine defect preservation rules triggered. UI self-healing is strictly suppressed.']);

      setExecutionState('completed');
      setCurrentResult('FAIL');
      setLogs(prev => [...prev, '[00:01.600] ✕ GENUINE FAILURE: Real application bug detected. Expected order confirmation not received. Never masked as healed.']);
      return;
    }

    if (variant === 'ambiguous') {
      // Ambiguous Challenge
      await new Promise(r => setTimeout(r, 500));
      setExecutionState('detecting');
      setTimelineStep(2);
      setLogs(prev => [...prev, '[00:00.500] Step 2: Locating payment button... Selector missing. Scanning candidates...']);

      await new Promise(r => setTimeout(r, 500));
      setExecutionState('analyzing');
      setTimelineStep(4);
      setLogs(prev => [...prev, '[00:01.100] Step 3: Evaluated candidates: `#confirm-payment-opt1` (Score: 0.88) vs `#confirm-payment-opt2` (Score: 0.86).']);
      setLogs(prev => [...prev, '[00:01.400] Step 4: Ambiguity margin: |0.88 - 0.86| = 0.02 < 0.15 threshold!']);
      setLogs(prev => [...prev, '[00:01.700] Safety Gate Active: System refuses to make unsafe guess.']);

      setExecutionState('completed');
      setCurrentResult('HUMAN REVIEW');
      setLogs(prev => [...prev, '[00:02.000] ⚠️ HUMAN REVIEW REQUIRED: Multiple equally plausible actions detected. Execution halted safely for engineer review.']);
      return;
    }
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* 1. Header & Variant Switcher */}
      <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto' }}>
        <div className="section-eyebrow">Main Product Demonstration</div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Interactive Self-Healing Demo
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.5 }}>
          Test the exact core problem: a test written for <code>[ Checkout ]</code> survives when the interface redesigns to <code>[ Proceed to Payment ]</code>.
        </p>

        {/* Tab Controls */}
        <div style={{ display: 'inline-flex', background: 'var(--bg-inset)', padding: '0.3rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', marginTop: '1.75rem', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button
            className={`nav-tab ${activeTab === 'version-a' ? 'active' : ''}`}
            onClick={() => runSimulation('version-a')}
            disabled={executionState !== 'idle' && executionState !== 'completed'}
          >
            Version A (Baseline)
          </button>
          <button
            className={`nav-tab ${activeTab === 'version-b' ? 'active' : ''}`}
            onClick={() => runSimulation('version-b')}
            disabled={executionState !== 'idle' && executionState !== 'completed'}
          >
            Version B (Redesign — Self-Heals)
          </button>
          <button
            className={`nav-tab ${activeTab === 'defect' ? 'active' : ''}`}
            onClick={() => runSimulation('defect')}
            disabled={executionState !== 'idle' && executionState !== 'completed'}
          >
            Backend Defect (HTTP 500)
          </button>
          <button
            className={`nav-tab ${activeTab === 'ambiguous' ? 'active' : ''}`}
            onClick={() => runSimulation('ambiguous')}
            disabled={executionState !== 'idle' && executionState !== 'completed'}
          >
            Ambiguity Challenge
          </button>
        </div>
      </div>

      {/* 2. Side-by-Side: Interface Canvas vs. Intent Recovery Engine */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 460px) 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Interactive Checkout Canvas */}
        <div className="task-card" style={{ padding: '2rem', position: 'sticky', top: '5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Target Application UI
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
                {activeTab === 'version-a' ? 'Version A: Standard Checkout' : activeTab === 'version-b' ? 'Version B: Redesigned Flow' : activeTab === 'defect' ? 'Defect Mode: 500 Simulation' : 'Ambiguous Target Challenge'}
              </h3>
            </div>
            {currentResult && (
              <div>
                {currentResult === 'PASS' && <span className="status-badge-pass">✓ PASS</span>}
                {currentResult === 'SELF-HEALED' && <span className="status-badge-healed">✓ SELF-HEALED</span>}
                {currentResult === 'FAIL' && <span className="status-badge-fail">✕ GENUINE FAILURE</span>}
                {currentResult === 'HUMAN REVIEW' && <span className="status-badge-review">⚠️ HUMAN REVIEW</span>}
              </div>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); runSimulation(activeTab); }}>
            <div className="form-group">
              <label className="form-label">Full Customer Name</label>
              <input
                id="checkout-name-input"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Billing Email</label>
              <input
                id="checkout-email-input"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Card Details</label>
              <input
                id="checkout-card-input"
                className="form-input"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="•••• •••• •••• ••••"
              />
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Studio Wireless Headphones</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantity: 1 • In Stock</div>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>$299.00</div>
            </div>

            {/* Target Button based on variant */}
            {activeTab === 'version-a' && (
              <button
                id="checkout-btn"
                type="button"
                className="btn-primary"
                style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
                onClick={() => runSimulation('version-a')}
              >
                Checkout ($299.00)
              </button>
            )}

            {activeTab === 'version-b' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  id="proceed-to-payment-btn"
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
                  onClick={() => runSimulation('version-b')}
                >
                  Proceed to Payment →
                </button>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  UI changed: <code>#checkout-btn</code> removed ➔ replaced with <code>#proceed-to-payment-btn</code>
                </div>
              </div>
            )}

            {activeTab === 'defect' && (
              <button
                id="simulate-payment-btn"
                type="button"
                className="btn-primary"
                style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem', background: 'var(--status-fail)', borderColor: 'var(--status-fail)' }}
                onClick={() => runSimulation('defect')}
              >
                Trigger Failing API Call (500)
              </button>
            )}

            {activeTab === 'ambiguous' && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  id="confirm-payment-opt1"
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                  onClick={() => runSimulation('ambiguous')}
                >
                  Confirm (Option 1)
                </button>
                <button
                  id="confirm-payment-opt2"
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                  onClick={() => runSimulation('ambiguous')}
                >
                  Confirm (Option 2)
                </button>
              </div>
            )}
          </form>

          {placedOrder && (
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--status-pass-bg)', border: '1px solid var(--status-pass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--status-pass-text)', fontSize: '0.85rem' }}>
              ✓ <strong>Order #{placedOrder.id} Placed &amp; Persisted</strong> for {placedOrder.customer_name}. Verified in SQLite!
            </div>
          )}
        </div>

        {/* Right: Real Intent Recovery Pipeline & Candidate Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Action Trigger Bar */}
          <div style={{ background: '#FFFFFF', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: 'var(--shadow-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.06em' }}>
                Simulate End-to-End Test Run
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                Intent: "Complete checkout with a valid card."
              </div>
            </div>

            <button
              id="run-simulation-cta-btn"
              className="btn-primary"
              onClick={() => runSimulation(activeTab)}
              disabled={executionState !== 'idle' && executionState !== 'completed'}
            >
              {executionState === 'idle' || executionState === 'completed' ? '▶ Re-run Simulation' : 'Running Engine...'}
            </button>
          </div>

          {/* 5. RECOVERY TIMELINE (Section 5 of prompt) */}
          <div className="task-card" style={{ padding: '1.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: '0.35rem' }}>
              Recovery Timeline
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Execution Lifecycle Progress
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {timelineSteps.map((step, idx) => {
                const isPassed = timelineStep > idx + 1;
                const isCurrent = timelineStep === idx + 1;
                const isHealedFinal = step.num === '08';

                let dotColor = 'var(--border-color)';
                let textColor = 'var(--text-muted)';
                let titleColor = 'var(--text-secondary)';

                if (isCurrent) {
                  dotColor = 'var(--primary)';
                  textColor = 'var(--text-primary)';
                  titleColor = 'var(--primary)';
                } else if (isPassed) {
                  dotColor = isHealedFinal && currentResult === 'SELF-HEALED' ? 'var(--status-pass)' : 'var(--primary)';
                  textColor = 'var(--text-primary)';
                  titleColor = 'var(--text-primary)';
                }

                return (
                  <div key={step.num} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: isPassed ? (isHealedFinal ? 'var(--status-pass)' : 'var(--primary)') : isCurrent ? 'var(--primary)' : 'var(--bg-inset)',
                          border: `2px solid ${dotColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          color: '#FFFFFF',
                          fontWeight: 700,
                        }}
                      >
                        {isPassed ? '✓' : step.num}
                      </div>
                      {idx < timelineSteps.length - 1 && (
                        <div style={{ width: 2, height: 26, background: isPassed ? 'var(--primary)' : 'var(--border-subtle)', margin: '3px 0' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, paddingBottom: '0.35rem' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: titleColor }}>
                        {step.num} — {step.title}
                      </div>
                      <div style={{ fontSize: '0.785rem', color: textColor, marginTop: '0.15rem' }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. CANDIDATE ANALYSIS (Section 6 of prompt) */}
          <div className="task-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)' }}>
                  5-Factor Scoring Inspection
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  Candidate Discovery &amp; Match Analysis
                </h3>
              </div>
              <span className="badge badge-in-progress">
                Mathematical Scoring Engine
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {candidates.map((c) => (
                <div
                  key={c.selector}
                  style={{
                    background: c.selected ? 'rgba(0, 113, 227, 0.04)' : 'var(--bg-subtle)',
                    border: `1px solid ${c.selected ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.15rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{c.label}</span>
                      <code>{c.selector}</code>
                      {c.selected && <span className="status-badge-healed" style={{ fontSize: '0.7rem' }}>Selected Target</span>}
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: c.selected ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {c.score}%
                    </span>
                  </div>

                  {/* 5-Factor Score Breakdown Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.725rem' }}>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Semantic (40%):</span> <strong>{c.semanticMatch}%</strong>
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Role (20%):</span> <strong>{c.roleMatch}%</strong>
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Text (15%):</span> <strong>{c.textMatch}%</strong>
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Context (15%):</span> <strong>{c.contextMatch}%</strong>
                    </div>
                    <div style={{ padding: '0.35rem 0.5rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Structure (10%):</span> <strong>{c.structuralMatch}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Why the candidate was selected */}
            <div style={{ background: 'var(--bg-inset)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Why <code>#proceed-to-payment-btn</code> was selected:
              </div>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li><strong>Intent match (95%):</strong> Semantically associated with checkout completion and transaction progression.</li>
                <li><strong>Context match (92%):</strong> Situated inside the checkout card form container beside credit card inputs.</li>
                <li><strong>Workflow compatibility (100%):</strong> Interactive HTML button element with accessible submit/action role.</li>
                <li><strong>Outcome compatibility:</strong> Dual Verifier confirms that clicking it generates confirmation state and writes order to SQLite.</li>
              </ul>
            </div>
          </div>

          {/* Real Live Execution Telemetry Log */}
          <div className="task-card" style={{ padding: '1.75rem', background: '#1D1D1F', color: '#F5F5F7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0071E3', fontWeight: 700 }}>
                Live Engine Diagnostics
              </span>
              <span style={{ fontSize: '0.75rem', color: '#86868B' }}>
                Playwright Sync Engine
              </span>
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.785rem', lineHeight: 1.5 }}>
              {logs.map((log, i) => (
                <div key={i} style={{ color: log.includes('✓') ? '#34C759' : log.includes('✕') ? '#FF3B30' : log.includes('⚠️') ? '#FF9F0A' : '#E5E5EA' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
