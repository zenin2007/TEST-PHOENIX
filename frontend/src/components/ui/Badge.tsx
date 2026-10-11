import React from 'react';
import type { TestResultStatus } from '../../types';

interface BadgeProps {
  status: TestResultStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  const norm = String(status || '').toUpperCase();

  const getPadding = () => {
    if (size === 'lg') return '0.45rem 0.95rem';
    if (size === 'md') return '0.3rem 0.65rem';
    return '0.2rem 0.5rem';
  };

  const getFontSize = () => {
    if (size === 'lg') return '0.925rem';
    if (size === 'md') return '0.825rem';
    return '0.725rem';
  };

  if (norm.includes('HEAL')) {
    return (
      <span
        className="badge-healed"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: getPadding(),
          fontSize: getFontSize(),
          fontWeight: 700,
          letterSpacing: '0.02em',
          background: 'var(--status-pass-bg)',
          color: 'var(--status-pass-text)',
          border: '1px solid var(--status-pass-border)',
          borderRadius: 'var(--radius-pill)',
        }}
      >
        <span>🟢</span> SELF-HEALED
      </span>
    );
  }

  if (norm.includes('PASS')) {
    return (
      <span
        className="badge-pass"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: getPadding(),
          fontSize: getFontSize(),
          fontWeight: 700,
          letterSpacing: '0.02em',
          background: 'var(--status-pass-bg)',
          color: 'var(--status-pass-text)',
          border: '1px solid var(--status-pass-border)',
          borderRadius: 'var(--radius-pill)',
        }}
      >
        <span>🟢</span> PASSED
      </span>
    );
  }

  if (norm.includes('FAIL') || norm.includes('ERROR')) {
    return (
      <span
        className="badge-fail"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: getPadding(),
          fontSize: getFontSize(),
          fontWeight: 700,
          letterSpacing: '0.02em',
          background: 'var(--status-fail-bg)',
          color: 'var(--status-fail-text)',
          border: '1px solid var(--status-fail-border)',
          borderRadius: 'var(--radius-pill)',
        }}
      >
        <span>🔴</span> GENUINE FAILURE
      </span>
    );
  }

  return (
    <span
      className="badge-review"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: getPadding(),
        fontSize: getFontSize(),
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: 'var(--status-review-bg)',
        color: 'var(--status-review-text)',
        border: '1px solid var(--status-review-border)',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      <span>🟡</span> HUMAN REVIEW REQUIRED
    </span>
  );
};

