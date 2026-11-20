import { useState } from 'react'

export function MiniBars({ color = '#3b82f6', values = [4, 6, 8, 5, 9, 12, 10] }: { color?: string; values?: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px', padding: '2px 0' }}>
      {values.map((v, i) => {
        const heightPct = Math.max(12, Math.round((v / max) * 100))
        const isHighlight = i === values.length - 2 || i === values.length - 1
        return (
          <span
            key={i}
            style={{
              width: '5px',
              height: `${heightPct}%`,
              borderRadius: '2px',
              backgroundColor: isHighlight ? color : `${color}40`,
              transition: 'all 0.2s ease'
            }}
          />
        )
      })}
    </div>
  )
}

export function RevenueTrendChart({ total = '$74K', growth = '↑ 21.8% last month' }: { total?: string; growth?: string }) {
  const [period, setPeriod] = useState<'days' | 'week' | 'month'>('month')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(4) // Default May highlighted

  const months = [
    { label: 'Jan', val: 32, amount: '$32,100.00' },
    { label: 'Feb', val: 45, amount: '$45,300.00' },
    { label: 'Mar', val: 58, amount: '$58,900.00' },
    { label: 'Apr', val: 52, amount: '$52,400.00' },
    { label: 'May', val: 84, amount: '$74,480.00' },
    { label: 'Jun', val: 65, amount: '$65,200.00' }
  ]

  return (
    <div className="panel chart-panel">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Revenue Trend</h3>
          <div className="chart-stat-row">
            <span className="chart-stat-big">{total}</span>
            <span className="chart-growth-pill">{growth}</span>
          </div>
        </div>
        <div className="chart-period-toggle">
          {(['days', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              type="button"
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bar-chart-container">
        {/* Y Axis Grid lines */}
        <div className="y-axis-labels">
          <span>100k</span>
          <span>80k</span>
          <span>60k</span>
          <span>40k</span>
          <span>20k</span>
          <span>0</span>
        </div>

        {/* Bars */}
        <div className="bars-area">
          {months.map((m, idx) => {
            const isSelected = hoveredIdx === idx
            return (
              <div
                key={m.label}
                className="bar-column"
                onMouseEnter={() => setHoveredIdx(idx)}
              >
                {isSelected && (
                  <div className="bar-tooltip">
                    <small>Earning</small>
                    <strong>{m.amount}</strong>
                  </div>
                )}
                <div
                  className={`bar-fill ${isSelected ? 'highlight' : ''}`}
                  style={{ height: `${m.val}%` }}
                />
                <span className="bar-label">{m.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function AcquisitionSourcesDonut() {
  const sources = [
    { label: 'Meta Ads', pct: 43, color: '#2563eb' },
    { label: 'Direct WhatsApp', pct: 28, color: '#f59e0b' },
    { label: 'Email Portfolio', pct: 18, color: '#10b981' },
    { label: 'Organic Search', pct: 12, color: '#eab308' }
  ]

  return (
    <div className="panel chart-panel donut-panel">
      <div className="chart-header">
        <h3 className="chart-title">Top Acquisition Sources</h3>
      </div>

      <div className="donut-content-row">
        {/* Circular Donut Ring */}
        <div className="donut-ring-wrapper">
          <svg viewBox="0 0 100 100" className="donut-svg">
            <circle cx="50" cy="50" r="38" className="donut-bg" />
            {/* 43% Meta Ads (Blue) */}
            <circle
              cx="50" cy="50" r="38"
              fill="transparent"
              stroke="#2563eb"
              strokeWidth="12"
              strokeDasharray="102 238"
              strokeDashoffset="60"
            />
            {/* 28% Direct (Amber) */}
            <circle
              cx="50" cy="50" r="38"
              fill="transparent"
              stroke="#f59e0b"
              strokeWidth="12"
              strokeDasharray="66 238"
              strokeDashoffset="195"
            />
            {/* 18% Email (Green) */}
            <circle
              cx="50" cy="50" r="38"
              fill="transparent"
              stroke="#10b981"
              strokeWidth="12"
              strokeDasharray="43 238"
              strokeDashoffset="128"
            />
            {/* 12% Social (Yellow) */}
            <circle
              cx="50" cy="50" r="38"
              fill="transparent"
              stroke="#38bdf8"
              strokeWidth="12"
              strokeDasharray="29 238"
              strokeDashoffset="84"
            />
          </svg>
          <div className="donut-center-label">
            <strong>100%</strong>
            <small>Attributed</small>
          </div>
        </div>

        {/* Legend */}
        <div className="donut-legend">
          {sources.map(s => (
            <div className="legend-row" key={s.label}>
              <span className="legend-dot" style={{ backgroundColor: s.color }} />
              <span className="legend-name">{s.label}</span>
              <strong className="legend-pct">{s.pct}%</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
