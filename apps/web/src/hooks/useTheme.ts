import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'mbolo_admin_theme';

function getInitial(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage indisponible → on retombe sur la préférence système */
  }
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Gère le thème clair/sombre du dashboard.
 * Pose `data-theme` sur <html> (les variables CSS d'index.css font le reste)
 * et mémorise le choix explicite de l'utilisateur.
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const toggle = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));

  return { mode, toggle };
}
