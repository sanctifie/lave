import React from 'react';

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
              <tr key={keyFn(row)} style={styles.tr}>
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

export function Badge({ label, color = '#006D77', bg = '#EDF6F9' }: { label: string; color?: string; bg?: string }) {
  return (
    <span style={{ backgroundColor: bg, color, borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { overflowX: 'auto', borderRadius: 12, border: '1px solid #E2E8F0' },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
    fontWeight: 600,
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #E2E8F0',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s' },
  td:    { padding: '14px 16px', color: '#334155', verticalAlign: 'middle' },
  empty: { padding: '40px 16px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' },
};
