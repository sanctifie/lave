import React from 'react';
import { ThemeMode } from '../hooks/useTheme';

interface ThemeToggleProps {
  mode: ThemeMode;
  onToggle: () => void;
}

/** Interrupteur clair/sombre placé dans le pied de la sidebar. */
export function ThemeToggle({ mode, onToggle }: ThemeToggleProps) {
  const dark = mode === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      style={styles.btn}
      aria-pressed={dark}
      aria-label={dark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      title={dark ? 'Thème clair' : 'Thème sombre'}
    >
      <span style={{ ...styles.knobTrack }}>
        <span style={{ ...styles.knob, transform: dark ? 'translateX(18px)' : 'translateX(0)' }}>
          {dark ? '🌙' : '☀️'}
        </span>
      </span>
      <span style={styles.label}>{dark ? 'Sombre' : 'Clair'}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '8px 12px', width: '100%',
    color: '#A9C6C2', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    transition: 'background .18s',
  },
  knobTrack: {
    position: 'relative', width: 38, height: 20, borderRadius: 999,
    background: 'rgba(18,179,162,0.28)', flexShrink: 0,
  },
  knob: {
    position: 'absolute', top: 1, left: 1, width: 18, height: 18, borderRadius: '50%',
    background: '#04211e', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
  },
  label: { flex: 1, textAlign: 'left' },
};
