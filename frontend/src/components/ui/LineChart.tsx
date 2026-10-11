import React, { useState } from 'react';

export interface LineChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  metadata?: string;
}

interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  strokeColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  yMin?: number;
  yMax?: number;
  onPointClick?: (point: LineChartPoint) => void;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 180,
  strokeColor = '#0071E3',
  gradientFrom = 'rgba(0, 113, 227, 0.22)',
  gradientTo = 'rgba(0, 113, 227, 0.0)',
  valuePrefix = '',
  valueSuffix = '',
  yMin,
  yMax,
  onPointClick,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No historical telemetry available for this trend
      </div>
    );
  }

  const padding = { top: 20, right: 24, bottom: 30, left: 40 };
  const width = 560;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const rawValues = data.map((d) => d.value);
  const minVal = yMin !== undefined ? yMin : Math.min(0, ...rawValues);
  const maxVal = yMax !== undefined ? yMax : Math.max(10, ...rawValues);
  const valRange = maxVal - minVal || 1;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + innerHeight - ((clamped - minVal) / valRange) * innerHeight;
  };

  // Generate line path
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(data.length - 1)},${padding.top + innerHeight} L ${getX(0)},${padding.top + innerHeight} Z`;

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={`line-fill-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = padding.top + innerHeight * (1 - pct);
          const gridVal = Math.round(minVal + pct * valRange);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="end"
                fontFamily="inherit"
              >
                {valuePrefix}{gridVal}{valueSuffix}
              </text>
            </g>
          );
        })}

        {/* Gradient Fill under line */}
        <path d={areaPath} fill={`url(#line-fill-${strokeColor.replace('#', '')})`} />

        {/* Main Line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points & interaction hit areas */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.value);
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onClick={() => onPointClick && onPointClick(d)}
              style={{ cursor: onPointClick ? 'pointer' : 'default' }}
            >
              {/* Invisible larger hover target */}
              <circle cx={cx} cy={cy} r="12" fill="transparent" />

              {/* Visible dot */}
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : 3.5}
                fill="#FFFFFF"
                stroke={strokeColor}
                strokeWidth={isHovered ? 2.5 : 2}
                style={{ transition: 'all 0.15s ease' }}
              />

              {/* X-axis label */}
              {(data.length <= 8 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) && (
                <text
                  x={cx}
                  y={height - 8}
                  fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="inherit"
                  fontWeight={isHovered ? 600 : 400}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && hoveredIndex !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${(getX(hoveredIndex) / width) * 100}%`,
            top: `${(getY(hoveredPoint.value) / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: '#1D1D1F',
            color: '#FFFFFF',
            padding: '0.35rem 0.65rem',
            borderRadius: '4px',
            fontSize: '0.725rem',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-floating)',
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600 }}>{hoveredPoint.label}</div>
          <div style={{ color: '#2997FF', marginTop: '0.1rem' }}>
            {valuePrefix}{hoveredPoint.value}{valueSuffix}
          </div>
          {hoveredPoint.metadata && (
            <div style={{ color: '#86868B', fontSize: '0.675rem' }}>{hoveredPoint.metadata}</div>
          )}
        </div>
      )}
    </div>
  );
};
