import React from 'react';
import { theme } from '../theme';

interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
  bg?: string;
  trend?: string;
  /** Part du total (0–100) → mini-anneau de progression dans le coin. */
  ring?: number;
}

/** Anneau de progression compact (part du total), aligné sur la couleur de la tuile. */
function MiniRing({ pct, color }: { pct: number; color: string }) {
  const size = 44, stroke = 5, r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const off = C - (clamped / 100) * C;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid-line)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off}
            style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)' }}
          />
        </g>
      </svg>
      <span className="tnum" style={styles.ringText}>{Math.round(clamped)}%</span>
    </div>
  );
}

export function StatCard({ icon, label, value, color = theme.brand, bg = theme.brandSurface, trend, ring }: StatCardProps) {
  return (
    <div className="card-lift" style={styles.card}>
      <div style={styles.top}>
        <div style={{ ...styles.iconBox, backgroundColor: bg, color }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
        </div>
        {ring != null ? <MiniRing pct={ring} color={color} />
          : trend ? <span style={styles.trend}>▲ {trend}</span> : null}
      </div>
      <div style={styles.value} className="tnum">{value}</div>
      <div style={styles.bottom}>
        <span style={styles.label}>{label}</span>
        {ring != null && trend && <span style={styles.trendInline}>▲ {trend}</span>}
      </div>
      <span style={{ ...styles.accent, background: color }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: 'relative',
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    padding: '18px 20px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    boxShadow: theme.shadow,
    border: `1px solid ${theme.border}`,
    flex: 1,
    minWidth: 168,
    overflow: 'hidden',
  },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  iconBox: {
    width: 48, height: 48,
    borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  trend: {
    fontSize: 11.5, fontWeight: 700, color: theme.success,
    background: theme.successSurface, padding: '4px 9px', borderRadius: 20,
  },
  ringText: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: 'var(--body)',
  },
  value: { fontSize: 30, fontWeight: 780, color: theme.ink, lineHeight: 1, letterSpacing: '-0.02em' },
  bottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 13, color: theme.muted, fontWeight: 500 },
  trendInline: { fontSize: 11, fontWeight: 700, color: theme.success },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
};
