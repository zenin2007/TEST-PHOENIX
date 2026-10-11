import React from 'react';
import type { TestResultStatus } from '../../types';

interface BadgeProps {
  status: TestResultStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  const norm = String(status).toUpperCase();

  if (norm.includes('PASS')) {
    return (
      <span className="badge-pass" style={{ fontSize: size === 'sm' ? '0.75rem' : '0.85rem' }}>
        <span>●</span> PASS
      </span>
    );
  }

  if (norm.includes('HEAL')) {
    return (
      <span className="badge-healed" style={{ fontSize: size === 'sm' ? '0.75rem' : '0.85rem' }}>
        <span>✓</span> SELF-HEALED
      </span>
    );
  }

  if (norm.includes('FAIL') || norm.includes('ERROR')) {
    return (
      <span className="badge-fail" style={{ fontSize: size === 'sm' ? '0.75rem' : '0.85rem' }}>
        <span>✕</span> GENUINE FAILURE
      </span>
    );
  }

  return (
    <span className="badge-review" style={{ fontSize: size === 'sm' ? '0.75rem' : '0.85rem' }}>
      <span>⚠️</span> HUMAN REVIEW REQUIRED
    </span>
  );
};
