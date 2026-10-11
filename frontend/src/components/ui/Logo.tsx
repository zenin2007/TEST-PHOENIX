import React from 'react';

export interface PhoenixLogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

/**
 * Geometric, abstract Phoenix mark symbolizing recovery, resilience, and rebirth.
 * Clean modern lines inspired by Apple & Linear developer tools.
 */
export const PhoenixLogo: React.FC<PhoenixLogoProps> = ({
  size = 28,
  showText = true,
  subtitle = 'Self-Healing Engine',
  className = '',
}) => {
  return (
    <div
      className={`phoenix-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        userSelect: 'none',
      }}
    >
      {/* Precision Geometric Phoenix Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
        aria-label="TestPhoenix Logo Mark"
      >
        <defs>
          <linearGradient id="phx-wing-l" x1="4" y1="24" x2="16" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0071E3" />
            <stop offset="100%" stopColor="#2997FF" />
          </linearGradient>
          <linearGradient id="phx-wing-r" x1="28" y1="24" x2="16" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0058B6" />
            <stop offset="100%" stopColor="#0071E3" />
          </linearGradient>
          <linearGradient id="phx-flame" x1="16" y1="26" x2="16" y2="2" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0071E3" />
            <stop offset="50%" stopColor="#30D158" />
            <stop offset="100%" stopColor="#34C759" />
          </linearGradient>
        </defs>

        {/* Left Wing Facet 1 (Upper) */}
        <path
          d="M 16 7 L 6 12 L 13 18 Z"
          fill="url(#phx-wing-l)"
          opacity="0.95"
        />
        {/* Left Wing Facet 2 (Lower swept feather) */}
        <path
          d="M 14 18.5 L 4 23 L 11 25 L 15 21 Z"
          fill="#0071E3"
          opacity="0.8"
        />

        {/* Right Wing Facet 1 (Upper) */}
        <path
          d="M 16 7 L 26 12 L 19 18 Z"
          fill="url(#phx-wing-r)"
          opacity="0.95"
        />
        {/* Right Wing Facet 2 (Lower swept feather) */}
        <path
          d="M 18 18.5 L 28 23 L 21 25 L 17 21 Z"
          fill="#0058B6"
          opacity="0.85"
        />

        {/* Central Rising Spine / Rebirth Flame */}
        <path
          d="M 16 2 L 18.5 11 L 16 15 L 13.5 11 Z"
          fill="url(#phx-flame)"
        />

        {/* Base Diamond Anchor */}
        <path
          d="M 16 22 L 18 26 L 16 30 L 14 26 Z"
          fill="#0071E3"
          opacity="0.9"
        />
      </svg>

      {/* Brand Typography */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: size <= 24 ? '0.875rem' : '0.975rem',
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
            }}
          >
            TestPhoenix
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: size <= 24 ? '0.625rem' : '0.675rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Also export as Logo for backward compatibility
export const Logo = PhoenixLogo;

