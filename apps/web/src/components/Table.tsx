import React from 'react';
import { theme } from '../theme';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyFn: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
}

export function Table<T>({ columns, data, keyFn, emptyMessage = 'Aucune donnée', loading }: TableProps<T>) {
  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ ...styles.th, width: col.width }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={styles.empty}>Chargement…</td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={styles.empty}>{emptyMessage}</td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyFn(row)} style={styles.tr} className="row-hover">
                {columns.map((col) => (
                  <td key={col.key} style={styles.td}>{col.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ label, color = theme.brand, bg = theme.brandSurface }: { label: string; color?: string; bg?: string }) {
  return (
    <span style={{ backgroundColor: bg, color, borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    overflowX: 'auto', borderRadius: theme.radiusLg, border: `1px solid ${theme.border}`,
    background: theme.surface, boxShadow: theme.shadow,
  },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    backgroundColor: '#F0F7F5',
    color: theme.muted,
    fontWeight: 700,
    fontSize: 11.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    padding: '13px 18px',
    textAlign: 'left',
    borderBottom: `1px solid ${theme.border}`,
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: `1px solid #EEF5F3` },
  td:    { padding: '15px 18px', color: theme.body, verticalAlign: 'middle' },
  empty: { padding: '44px 16px', textAlign: 'center', color: theme.faint, fontStyle: 'italic' },
};
