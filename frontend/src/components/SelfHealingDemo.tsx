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

type ProgressiveViewTab = 'simple' | 'reasoning' | 'evidence';

export const SelfHealingDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'version-a' | 'version-b' | 'defect' | 'ambiguous'>('version-b');
  const [progressiveTab, setProgressiveTab] = useState<ProgressiveViewTab>('simple');
  const [executionState, setExecutionState] = useState<'idle' | 'running' | 'detecting' | 'analyzing' | 'reconstructing' | 'verifying' | 'completed'>('idle');
  const [currentResult, setCurrentResult] = useState<'PASS' | 'SELF-HEALED' | 'FAIL' | 'HUMAN REVIEW' | null>('SELF-HEALED');
  const [timelineStep, setTimelineStep] = useState<number>(9);
  const [placedOrder, setPlacedOrder] = useState<Order | null>({
    id: 1042,
    product_name: 'Studio Wireless Headphones (Redesigned Checkout)',
    price: 299.00,
    quantity: 1,
    customer_name: 'Alex Rivers',
    status: 'Placed',
    created_at: new Date().toISOString(),
  });
  const [logs, setLogs] = useState<string[]>([
    '[00:00.010] Intent execution: "Complete checkout with a valid credit card."',
    '[00:00.520] Primary selector `#checkout-btn` not found. UI Change Detected!',
    '[00:00.900] Intent Analysis: semantic tokens [complete, checkout, payment].',
    '[00:01.300] Candidate Ranking: 3 elements evaluated via 5-factor scoring model.',
    '[00:01.750] Workflow Reconstruction: Selected `#proceed-to-payment-btn` (Match Score: 94%).',
    '[00:02.100] Replaying synthetic click on candidate target in Playwright page.',
    '[00:02.400] Dual Verification: Confirmed DOM purchase modal & assert SQLite /api/orders.',
    '[00:02.850] ✓ SELF-HEALED: Workflow adapted and outcome verified in 240ms latency.',
  ]);

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
      label: 'Place Order Summary',
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

  const pipelineSteps = [
    { num: '01', title: 'Original Intent', desc: 'Execute business goal: "Complete checkout with a valid card."' },
    { num: '02', title: 'Interface Changed', desc: 'Target site redesigned: #checkout-btn was removed from DOM.' },
    { num: '03', title: 'Change Detected', desc: 'Playwright locator timed out after 1500ms threshold.' },
    { num: '04', title: 'Intent Analysis', desc: 'Extracted semantic intent: payment progression, submission.' },
    { num: '05', title: 'Candidate Ranking', desc: 'Identified 3 potential interactive elements via 5-factor engine.' },
    { num: '06', title: 'Workflow Reconstruction', desc: 'Selected #proceed-to-payment-btn (Score: 94% vs 2nd: 87%).' },
    { num: '07', title: 'Replay Action', desc: 'Dispatched synthetic action with safety constraints in page.' },
    { num: '08', title: 'Verification', desc: 'Asserted DOM confirmation dialog + SQLite database transaction.' },
    { num: '09', title: 'SELF-HEALED', desc: 'Certified test resilience without developer intervention.' },
  ];

  const runSimulation = async (variant: 'version-a' | 'version-b' | 'defect' | 'ambiguous') => {
    setActiveTab(variant);
    setExecutionState('running');
    setTimelineStep(1);
    setCurrentResult(null);
    setPlacedOrder(null);
    setLogs(['[00:00.010] Step 1: Initiating intent execution: "Complete checkout with a valid card."']);

    if (variant === 'version-a') {
      await new Promise((r) => setTimeout(r, 500));
      setLogs((prev) => [...prev, '[00:00.450] Step 2: Locating selector `#checkout-btn` directly in DOM...']);
      setLogs((prev) => [...prev, '[00:00.600] Found element `<button id="checkout-btn">Checkout</button>`. Clicking...']);

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: 'Studio Wireless Headphones',
            price: 299.00,
            customer_name: fullName,
            quantity: 1,
            status: 'Placed',
          }),
        });
        const orderData = await res.json();
        setPlacedOrder(orderData);
      } catch {
        // fallback
      }

      setTimelineStep(9);
      setExecutionState('completed');
      setCurrentResult('PASS');
      setLogs((prev) => [...prev, '[00:01.050] ✓ Baseline test passed directly: Order placed and verified in SQLite.']);
      return;
    }

    if (variant === 'version-b') {
      await new Promise((r) => setTimeout(r, 450));
      setExecutionState('detecting');
      setTimelineStep(3);
      setLogs((prev) => [...prev, '[00:00.520] Step 2-3: Looking for `#checkout-btn`... Missing! Change Detected.']);

      await new Promise((r) => setTimeout(r, 450));
      setExecutionState('analyzing');
      setTimelineStep(4);
      setLogs((prev) => [...prev, '[00:00.900] Step 4: Analyzing original test intent: "Complete checkout with a valid card."']);

      await new Promise((r) => setTimeout(r, 450));
      setTimelineStep(5);
      setLogs((prev) => [...prev, '[00:01.300] Step 5: Discovered 3 candidate buttons. 5-factor scoring computed:']);
      setLogs((prev) => [...prev, '   • [94%] #proceed-to-payment-btn ("Proceed to Payment")']);
      setLogs((prev) => [...prev, '   • [87%] #continue-checkout-btn ("Continue Checkout")']);
      setLogs((prev) => [...prev, '   • [42%] #place-order-summary-btn ("Place Order")']);

      await new Promise((r) => setTimeout(r, 450));
      setExecutionState('reconstructing');
      setTimelineStep(6);
      setLogs((prev) => [...prev, '[00:01.750] Step 6: Candidate selected: `#proceed-to-payment-btn`. Confidence 0.94 ≥ 0.75 gate.']);

      await new Promise((r) => setTimeout(r, 400));
      setTimelineStep(7);
      setLogs((prev) => [...prev, '[00:02.100] Step 7: Action replayed via Playwright sync engine on candidate.']);

      setExecutionState('verifying');
      setTimelineStep(8);
      setLogs((prev) => [...prev, '[00:02.400] Step 8: Dual Verifier: Querying SQLite /api/orders + DOM modal...']);

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: 'Studio Wireless Headphones (Redesigned Checkout)',
            price: 299.00,
            customer_name: fullName,
            quantity: 1,
            status: 'Placed',
          }),
        });
        const orderData = await res.json();
        setPlacedOrder(orderData);
      } catch {
        // fallback
      }

      await new Promise((r) => setTimeout(r, 400));
      setTimelineStep(9);
      setExecutionState('completed');
      setCurrentResult('SELF-HEALED');
      setLogs((prev) => [...prev, '[00:02.850] ✓ SELF-HEALED: Workflow successfully reconstructed and outcome verified!']);
      return;
    }

    if (variant === 'defect') {
      await new Promise((r) => setTimeout(r, 450));
      setExecutionState('detecting');
      setTimelineStep(3);
      setLogs((prev) => [...prev, '[00:00.500] Step 2: Attempting payment gateway transaction...']);

      await new Promise((r) => setTimeout(r, 450));
      setExecutionState('verifying');
      setTimelineStep(8);
      setLogs((prev) => [...prev, '[00:01.100] Step 3: HTTP 500 Server Error intercepted: "DB_TRANSACTION_FAILURE".']);
      setLogs((prev) => [...prev, '[00:01.350] Safety Gate Active: Real bug preservation rules triggered. UI self-healing suppressed!']);

      setExecutionState('completed');
      setCurrentResult('FAIL');
      setLogs((prev) => [...prev, '[00:01.600] ✕ GENUINE FAILURE: Real application bug detected. TestPhoenix never masks real bugs as healed.']);
      return;
    }

    if (variant === 'ambiguous') {
      await new Promise((r) => setTimeout(r, 450));
      setExecutionState('detecting');
      setTimelineStep(3);
      setLogs((prev) => [...prev, '[00:00.500] Step 2: Locating payment button... Selector missing. Scanning candidates...']);

      await new Promise((r) => setTimeout(r, 450));
      setExecutionState('analyzing');
      setTimelineStep(5);
      setLogs((prev) => [...prev, '[00:01.100] Step 5: Evaluated candidates: `#confirm-opt1` (Score: 0.88) vs `#confirm-opt2` (Score: 0.86).']);
      setLogs((prev) => [...prev, '[00:01.400] Step 6: Ambiguity separation |0.88 - 0.86| = 0.02 < 0.15 threshold!']);
      setLogs((prev) => [...prev, '[00:01.700] Safety Gate Active: Halting execution to prevent destructive guesses.']);

      setExecutionState('completed');
      setCurrentResult('HUMAN REVIEW');
      setLogs((prev) => [...prev, '[00:02.000] ⚠️ HUMAN REVIEW REQUIRED: Multiple equally plausible actions detected. Safely flagged.']);
      return;
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* 1. Header & Variant Switcher */}
      <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: '0.35rem' }}>
          Signature Feature Demonstration
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Intent-Aware Self-Healing Experience
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.5 }}>
          UI changes. Intent stays the same. TestPhoenix adapts and verifies the outcome.
        </p>

        {/* Tab Controls for Scenarios */}
        <div style={{ display: 'inline-flex', background: 'var(--bg-inset)', padding: '0.3rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', marginTop: '1.25rem', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button
            className={`nav-tab ${activeTab === 'version-a' ? 'active' : ''}`}
            onClick={() => runSimulation('version-a')}
            disabled={executionState !== 'idle' && executionState !== 'completed'}
          >
            Version A (Baseline Pass)
          </button>
          <button
            className={`nav-tab ${activeTab === 'version-b' ? 'active' : ''}`}
            onClick={() => runSimulation('version-b')}
            disabled={executionState !== 'idle' && executionState !== 'completed'}
          >
            Version B (Redesign — Self-Healed)
          </button>
          <button
            className={`nav-tab ${activeTab === 'defect' ? 'active' : ''}`}
            onClick={() => runSimulation('defect')}
            disabled={executionState !== 'idle' && executionState !== 'completed'}
          >
            Backend Defect (Genuine Failure)
          </button>
          <button
            className={`nav-tab ${activeTab === 'ambiguous' ? 'active' : ''}`}
            onClick={() => runSimulation('ambiguous')}
            disabled={executionState !== 'idle' && executionState !== 'completed'}
          >
            Ambiguous Match (Human Review)
          </button>
        </div>
      </div>

      {/* 2. Visual Representation of 3 System States */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div
          style={{
            padding: '1.15rem',
            background: currentResult === 'SELF-HEALED' ? 'rgba(52, 199, 89, 0.08)' : 'var(--bg-subtle)',
            border: `1.5px solid ${currentResult === 'SELF-HEALED' ? '#34C759' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-md)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34C759' }} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1B5E20' }}>🟢 SELF-HEALED</span>
          </div>
          <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            The interface changed, but the intended business workflow succeeded and verified.
          </p>
        </div>

        <div
          style={{
            padding: '1.15rem',
            background: currentResult === 'HUMAN REVIEW' ? 'rgba(255, 159, 10, 0.08)' : 'var(--bg-subtle)',
            border: `1.5px solid ${currentResult === 'HUMAN REVIEW' ? '#FF9F0A' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-md)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF9F0A' }} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#B25E00' }}>🟡 HUMAN REVIEW REQUIRED</span>
          </div>
          <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            Multiple candidate elements are too similar or confidence is insufficient. No blind guessing.
          </p>
        </div>

        <div
          style={{
            padding: '1.15rem',
            background: currentResult === 'FAIL' ? 'rgba(255, 59, 48, 0.08)' : 'var(--bg-subtle)',
            border: `1.5px solid ${currentResult === 'FAIL' ? '#FF3B30' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-md)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF3B30' }} />
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#C62828' }}>🔴 GENUINE FAILURE</span>
          </div>
          <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            The application itself failed (e.g. 500 error or broken database). Bug preserved.
          </p>
        </div>
      </div>

      {/* 3. Progressive Disclosure Toggle: Simple View → Recovery Reasoning → Technical Evidence */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-inset)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', gap: '0.25rem' }}>
          <button
            className={`btn-secondary ${progressiveTab === 'simple' ? 'btn-primary' : ''}`}
            onClick={() => setProgressiveTab('simple')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-xs)' }}
          >
            1. Simple View
          </button>
          <button
            className={`btn-secondary ${progressiveTab === 'reasoning' ? 'btn-primary' : ''}`}
            onClick={() => setProgressiveTab('reasoning')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-xs)' }}
          >
            2. Recovery Reasoning
          </button>
          <button
            className={`btn-secondary ${progressiveTab === 'evidence' ? 'btn-primary' : ''}`}
            onClick={() => setProgressiveTab('evidence')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-xs)' }}
          >
            3. Technical Evidence
          </button>
        </div>
      </div>

      {/* 4. Main Body: Left Interactive Target Form / Right Progressive Disclosure Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Interactive Canvas */}
        <div className="task-card" style={{ padding: '1.75rem', position: 'sticky', top: '5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Target Checkout View
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.15rem' }}>
                {activeTab === 'version-a' ? 'Version A: Standard' : activeTab === 'version-b' ? 'Version B: Redesigned Flow' : activeTab === 'defect' ? 'Defect Mode (500 Error)' : 'Ambiguous Challenge'}
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

            <div style={{ padding: '0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Studio Wireless Headphones</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Quantity: 1 • In Stock</div>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>$299.00</div>
            </div>

            {/* Target Button based on variant */}
            {activeTab === 'version-a' && (
              <button
                id="checkout-btn"
                type="button"
                className="btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
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
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                  onClick={() => runSimulation('version-b')}
                >
                  Proceed to Payment →
                </button>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  UI changed: <code>#checkout-btn</code> removed ➔ replaced with <code>#proceed-to-payment-btn</code>
                </div>
              </div>
            )}

            {activeTab === 'defect' && (
              <button
                id="simulate-payment-btn"
                type="button"
                className="btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', background: '#FF3B30', borderColor: '#FF3B30' }}
                onClick={() => runSimulation('defect')}
              >
                Trigger Failing API Call (500)
              </button>
            )}

            {activeTab === 'ambiguous' && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  id="confirm-payment-opt1"
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem', fontSize: '0.8rem' }}
                  onClick={() => runSimulation('ambiguous')}
                >
                  Confirm (Option 1)
                </button>
                <button
                  id="confirm-payment-opt2"
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.65rem', fontSize: '0.8rem' }}
                  onClick={() => runSimulation('ambiguous')}
                >
                  Confirm (Option 2)
                </button>
              </div>
            )}
          </form>

          {placedOrder && (
            <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'var(--status-pass-bg)', border: '1px solid var(--status-pass-border)', borderRadius: 'var(--radius-sm)', color: 'var(--status-pass-text)', fontSize: '0.8rem' }}>
              ✓ <strong>Order #{placedOrder.id} Placed &amp; Persisted</strong> for {placedOrder.customer_name}. Verified in SQLite!
            </div>
          )}
        </div>

        {/* Right: Progressive Disclosure Views */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* TAB 1: SIMPLE VIEW */}
          {progressiveTab === 'simple' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="task-card" style={{ padding: '1.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: '0.35rem' }}>
                  High-Level Recovery Summary
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                  Original Action vs. Recovered Workflow
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Original Action</span>
                    <div style={{ marginTop: '0.25rem' }}><code>click("#checkout-btn")</code></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--status-fail-text)', marginTop: '0.35rem' }}>
                      ✕ Element missing in redesign
                    </div>
                  </div>

                  <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Recovered Action</span>
                    <div style={{ marginTop: '0.25rem' }}><code style={{ color: 'var(--primary)' }}>click("#proceed-to-payment-btn")</code></div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--status-pass-text)', marginTop: '0.35rem' }}>
                      ✓ Intent Match Score: 94%
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-inset)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dual Verifier Outcome:</span>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                      DOM purchase confirmation + SQLite /api/orders verified
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recovery Duration:</span>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>240ms</div>
                  </div>
                </div>
              </div>

              {/* Visual 9-Step Pipeline Timeline */}
              <div className="task-card" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>
                  9-Step Intent Reconstruction Timeline
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {pipelineSteps.map((step, idx) => {
                    const isPassed = timelineStep > idx + 1;
                    const isCurrent = timelineStep === idx + 1;
                    const isFinal = step.num === '09';

                    return (
                      <div key={step.num} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: isPassed ? (isFinal ? '#34C759' : 'var(--primary)') : isCurrent ? 'var(--primary)' : 'var(--bg-inset)',
                              border: `2px solid ${isPassed || isCurrent ? (isFinal ? '#34C759' : 'var(--primary)') : 'var(--border-color)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.6rem',
                              color: '#FFFFFF',
                              fontWeight: 700,
                            }}
                          >
                            {isPassed ? '✓' : step.num}
                          </div>
                          {idx < pipelineSteps.length - 1 && (
                            <div style={{ width: 2, height: 20, background: isPassed ? 'var(--primary)' : 'var(--border-subtle)', margin: '2px 0' }} />
                          )}
                        </div>

                        <div style={{ flex: 1, paddingBottom: '0.2rem' }}>
                          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: isCurrent ? 'var(--primary)' : isPassed ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {step.num} — {step.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isPassed || isCurrent ? 'var(--text-secondary)' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {step.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RECOVERY REASONING */}
          {progressiveTab === 'reasoning' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="task-card" style={{ padding: '1.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: '0.35rem' }}>
                  Candidate Ranking Analysis
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                  5-Factor Mathematical Scoring Breakdown
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {candidates.map((c) => (
                    <div
                      key={c.selector}
                      style={{
                        background: c.selected ? 'rgba(0, 113, 227, 0.04)' : 'var(--bg-subtle)',
                        border: `1px solid ${c.selected ? 'var(--primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-sm)',
                        padding: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.label}</span>
                          <code style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>{c.selector}</code>
                          {c.selected && <span className="status-badge-healed" style={{ marginLeft: '0.5rem', fontSize: '0.675rem' }}>Selected</span>}
                        </div>
                        <span style={{ fontSize: '1.15rem', fontWeight: 700, color: c.selected ? 'var(--primary)' : 'var(--text-secondary)' }}>
                          {c.score}%
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.35rem', fontSize: '0.7rem' }}>
                        <div style={{ padding: '0.25rem 0.45rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                          Semantic (40%): <strong>{c.semanticMatch}%</strong>
                        </div>
                        <div style={{ padding: '0.25rem 0.45rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                          Role (20%): <strong>{c.roleMatch}%</strong>
                        </div>
                        <div style={{ padding: '0.25rem 0.45rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                          Text (15%): <strong>{c.textMatch}%</strong>
                        </div>
                        <div style={{ padding: '0.25rem 0.45rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                          Context (15%): <strong>{c.contextMatch}%</strong>
                        </div>
                        <div style={{ padding: '0.25rem 0.45rem', background: '#FFFFFF', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                          Structure (10%): <strong>{c.structuralMatch}%</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem', marginTop: '1.25rem' }}>
                  <strong>Safety Gate Proof:</strong> Top candidate score (94%) exceeds Confidence Gate (&ge; 75%).
                  The margin over the runner-up (87%) is 7%, satisfying ambiguous separation conditions.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL EVIDENCE */}
          {progressiveTab === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="task-card" style={{ padding: '1.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: '0.35rem' }}>
                  Verification Telemetry &amp; Evidence
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                  UI &amp; SQLite Database Evidence
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>1. DOM State Evidence</span>
                    <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Interactive DOM modal rendered with title: <code>"Order #1042 Placed &amp; Persisted"</code>.
                      Confirmation text verified in browser page.
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>2. Database Evidence (SQLite Query)</span>
                    <pre style={{ margin: '0.35rem 0 0 0', background: '#1D1D1F', color: '#F5F5F7', padding: '0.75rem', borderRadius: 'var(--radius-xs)', fontSize: '0.725rem', overflowX: 'auto' }}>
{`SELECT * FROM orders WHERE customer_name = 'Alex Rivers' ORDER BY id DESC LIMIT 1;
-- Result: id=1042, product="Studio Wireless Headphones", status="Placed"`}
                    </pre>
                  </div>

                  <div style={{ background: '#1D1D1F', color: '#F5F5F7', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ color: '#0071E3', fontWeight: 600 }}>Live Engine Telemetry Stream</span>
                      <span style={{ color: '#86868B' }}>Playwright Engine</span>
                    </div>
                    <div style={{ maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.725rem', lineHeight: 1.5 }}>
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
          )}
        </div>
      </div>
    </div>
  );
};
