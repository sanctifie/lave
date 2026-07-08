import React from 'react';
import { theme } from '../theme';

interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
  bg?: string;
  trend?: string;
}

export function StatCard({ icon, label, value, color = theme.brand, bg = theme.brandSurface, trend }: StatCardProps) {
  return (
    <div className="card-lift" style={styles.card}>
      <div style={styles.top}>
        <div style={{ ...styles.iconBox, backgroundColor: bg, color }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
        </div>
        {trend && <span style={styles.trend}>▲ {trend}</span>}
      </div>
      <div style={styles.value} className="tnum">{value}</div>
      <div style={styles.label}>{label}</div>
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
  value: { fontSize: 30, fontWeight: 780, color: theme.ink, lineHeight: 1, letterSpacing: '-0.02em' },
  label: { fontSize: 13, color: theme.muted, fontWeight: 500 },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
};
