import React, { useState } from 'react';
import { Segment } from './ActivityDonut';

interface ServiceBarsProps {
  segments: Segment[];
  height?: number;
}

/**
 * Histogramme « volume par service ». Une seule série (le titre la nomme → pas
 * de légende séparée). Valeurs en label direct au-dessus de chaque barre,
 * extrémités arrondies 4px ancrées à la ligne de base, 2px d'écart entre barres,
 * survol → mise en avant + info-bulle.
 */
export function ServiceBars({ segments, height = 210 }: ServiceBarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...segments.map((s) => s.value));
  const plot = height - 46; // marge haute pour les labels de valeur

  return (
    <div style={{ ...styles.wrap, height }}>
      {segments.map((seg, i) => {
        const h = Math.max(4, (seg.value / max) * plot);
        const dim = hover != null && hover !== i;
        return (
          <div
            key={seg.key}
            style={styles.col}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="tnum" style={{ ...styles.value, opacity: dim ? 0.4 : 1 }}>
              {seg.value.toLocaleString('fr-FR')}
            </div>
            <div
              style={{
                ...styles.bar,
                height: h,
                background: seg.colorVar,
                opacity: dim ? 0.32 : 1,
                boxShadow: hover === i ? '0 6px 16px -6px var(--grid-line)' : 'none',
                transform: hover === i ? 'scaleY(1.02)' : 'none',
              }}
            />
            <div style={{ ...styles.label, color: hover === i ? 'var(--ink)' : 'var(--muted)' }}>
              {seg.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    gap: 10, width: '100%',
    borderBottom: '1px solid var(--grid-line)',
  },
  col: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'flex-end', gap: 6, height: '100%', cursor: 'default', minWidth: 0,
  },
  value: { fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', transition: 'opacity .18s' },
  bar: {
    width: '100%', maxWidth: 46, borderRadius: '6px 6px 2px 2px',
    transformOrigin: 'bottom', transition: 'opacity .18s, transform .18s, box-shadow .18s',
  },
  label: {
    fontSize: 11.5, fontWeight: 600, marginTop: 8, textAlign: 'center',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
    transition: 'color .18s',
  },
};
