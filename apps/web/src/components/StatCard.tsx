import React from 'react';

interface StatCardProps {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
  bg?: string;
}

export function StatCard({ icon, label, value, color = '#006D77', bg = '#EDF6F9' }: StatCardProps) {
  return (
    <div style={{ ...styles.card, borderLeft: `4px solid ${color}` }}>
      <div style={{ ...styles.iconBox, backgroundColor: bg, color }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <div style={styles.value}>{value}</div>
        <div style={styles.label}>{label}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    flex: 1,
    minWidth: 160,
  },
  iconBox: {
    width: 52, height: 52,
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  value: { fontSize: 26, fontWeight: 700, color: '#1E293B', lineHeight: 1 },
  label: { fontSize: 13, color: '#64748B', marginTop: 4 },
};
