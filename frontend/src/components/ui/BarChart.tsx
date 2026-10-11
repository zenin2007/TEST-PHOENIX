import React, { useState } from 'react';

export interface BarChartItem {
  id?: string | number;
  label: string;
  value: number;
  maxValue?: number;
  color?: string;
  sublabel?: string;
}

interface HorizontalBarChartProps {
  items: BarChartItem[];
  valueSuffix?: string;
  onItemClick?: (item: BarChartItem) => void;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  items,
  valueSuffix = '',
  onItemClick,
}) => {
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No data available
      </div>
    );
  }

  const maxVal = Math.max(1, ...items.map((i) => i.value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      {items.map((item, idx) => {
        const itemId = item.id ?? idx;
        const pct = Math.round((item.value / maxVal) * 100);
        const isHovered = hoveredId === itemId;
        const barColor = item.color || '#0071E3';

        return (
          <div
            key={itemId}
            onMouseEnter={() => setHoveredId(itemId)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onItemClick && onItemClick(item)}
            style={{
              cursor: onItemClick ? 'pointer' : 'default',
              transition: 'background 0.15s ease',
              padding: '0.2rem 0.35rem',
              borderRadius: '4px',
              background: isHovered ? 'var(--bg-inset)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: isHovered ? 600 : 500, color: 'var(--text-primary)' }}>
                {item.label}
              </span>
              <span style={{ fontWeight: 600, color: isHovered ? barColor : 'var(--text-secondary)' }}>
                {item.value}{valueSuffix}
                {item.sublabel && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>({item.sublabel})</span>}
              </span>
            </div>

            <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-inset)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: 999,
                  transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
