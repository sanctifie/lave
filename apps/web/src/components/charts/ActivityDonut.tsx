import React, { useState } from 'react';

export interface Segment {
  key: string;
  label: string;
  value: number;
  colorVar: string; // ex. 'var(--cat-1)'
}

interface ActivityDonutProps {
  segments: Segment[];
  /** Libellé du total au centre. */
  centerLabel?: string;
  size?: number;
}

/**
 * Donut de composition d'activité : le total réel au centre, un segment par
 * service. Encodage secondaire imposé par la palette : légende à libellés
 * directs + espace de 2px (surface) entre les segments. Survol → mise en avant
 * du segment et affichage de sa valeur au centre.
 */
export function ActivityDonut({ segments, centerLabel = 'Activité totale', size = 208 }: ActivityDonutProps) {
  const [hover, setHover] = useState<number | null>(null);

  const total = segments.reduce((s, x) => s + x.value, 0);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const GAP = 2; // 2px de surface entre segments

  let cursor = 0;
  const arcs = segments.map((seg, i) => {
    const frac = total > 0 ? seg.value / total : 0;
    const len = Math.max(0, frac * C - GAP);
    const dashoffset = -cursor * C;
    cursor += frac;
    return { seg, len, rest: C - len, dashoffset, i };
  });

  const active = hover != null ? segments[hover] : null;
  const centerValue = active ? active.value : total;
  const centerText = active ? active.label : centerLabel;
  const centerPct = active && total > 0 ? Math.round((active.value / total) * 100) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${centerLabel} : ${total}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid-line)" strokeWidth={stroke} />
            {arcs.map(({ seg, len, rest, dashoffset, i }) => (
              <circle
                key={seg.key}
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke={seg.colorVar}
                strokeWidth={hover === i ? stroke + 4 : stroke}
                strokeDasharray={`${len} ${rest}`}
                strokeDashoffset={dashoffset}
                strokeLinecap="butt"
                style={{
                  transition: 'stroke-width .18s, opacity .18s',
                  opacity: hover == null || hover === i ? 1 : 0.32,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </g>
        </svg>
        <div style={styles.center}>
          <div className="tnum" style={styles.centerValue}>{centerValue.toLocaleString('fr-FR')}</div>
          <div style={styles.centerLabel}>{centerText}{centerPct != null ? ` · ${centerPct}%` : ''}</div>
        </div>
      </div>

      <div style={styles.legend}>
        {segments.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div
              key={seg.key}
              style={{ ...styles.legendRow, opacity: hover == null || hover === i ? 1 : 0.5 }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span style={{ ...styles.dot, background: seg.colorVar }} />
              <span style={styles.legendLabel}>{seg.label}</span>
              <span className="tnum" style={styles.legendValue}>{seg.value.toLocaleString('fr-FR')}</span>
              <span className="tnum" style={styles.legendPct}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 2,
  },
  centerValue: { fontSize: 34, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 },
  centerLabel: { fontSize: 12, fontWeight: 600, color: 'var(--muted)', maxWidth: 130, textAlign: 'center' },
  legend: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', width: '100%' },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity .18s', cursor: 'default' },
  dot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  legendLabel: { fontSize: 12.5, color: 'var(--body)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  legendValue: { fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' },
  legendPct: { fontSize: 11.5, color: 'var(--faint)', width: 34, textAlign: 'right' },
};
