import React from 'react';
import { NavLink } from 'react-router-dom';
import { theme } from '../theme';
import { ThemeToggle } from './ThemeToggle';
import { ThemeMode } from '../hooks/useTheme';

const LINKS = [
  { to: '/',          label: 'Tableau de bord',  icon: '📊' },
  { to: '/orders',    label: 'Commandes',         icon: '📦' },
  { to: '/deliveries',label: 'Livraisons',        icon: '🚚' },
  { to: '/rides',     label: 'Transport',         icon: '🚗' },
  { to: '/meals',     label: 'Repas',             icon: '🥗' },
  { to: '/doctors',   label: 'Médecins',          icon: '🩺' },
  { to: '/users',     label: 'Utilisateurs',      icon: '👥' },
  { to: '/pricing',   label: 'Tarification',      icon: '💰' },
];

interface SidebarProps {
  onLogout: () => void;
  userName: string;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

export function Sidebar({ onLogout, userName, themeMode, onToggleTheme }: SidebarProps) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <div style={styles.logoMark}>
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
            <path d="M12 21s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7 3.5C19 16.65 12 21 12 21Z" fill="#04211e"/>
            <path d="M12 10v5M9.5 12.5h5" stroke="#5FD3C4" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={styles.logoTitle}>MBOLO Santé</div>
          <div style={styles.logoSub}>Administration</div>
        </div>
      </div>

      <div style={styles.navLabel}>Pilotage</div>
      <nav style={styles.nav}>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.linkActive : {}),
            })}
          >
            {({ isActive }) => (
              <>
                <span style={{ ...styles.rail, ...(isActive ? styles.railOn : {}) }} />
                <span style={{ ...styles.linkIcon, ...(isActive ? styles.linkIconOn : {}) }}>{link.icon}</span>
                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
        <div style={styles.footerUser}>
          <div style={styles.avatar}>{userName.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={styles.footerName}>{userName}</div>
            <div style={styles.footerRole}>Administrateur</div>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={onLogout}>Déconnexion</button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 248,
    background: theme.gradSidebar,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    padding: 0,
    flexShrink: 0,
    borderRight: '1px solid rgba(255,255,255,0.06)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '22px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logoMark: {
    width: 42, height: 42, borderRadius: 13,
    background: theme.gradBrand,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 20px -6px rgba(18,179,162,.6)',
    flexShrink: 0,
  },
  logoTitle: { color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' },
  logoSub:   { color: '#7FA9A3', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },

  navLabel: {
    color: '#5E8580', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1.5, padding: '18px 22px 8px',
  },
  nav: { flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 3 },

  link: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 12px',
    borderRadius: 11,
    color: '#A9C6C2',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.18s, color 0.18s',
  } as React.CSSProperties,
  linkActive: {
    backgroundColor: 'rgba(18,179,162,0.15)',
    color: '#EAF6F4',
    fontWeight: 600,
  },
  rail: {
    position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)',
    width: 3, height: 0, borderRadius: 3, background: theme.brandLight,
    transition: 'height .2s',
  },
  railOn: { height: 22, boxShadow: '0 0 12px rgba(95,211,196,.8)' },
  linkIcon: {
    fontSize: 16, width: 30, height: 30, borderRadius: 9,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.04)',
    transition: 'background .18s',
  },
  linkIconOn: { background: 'rgba(18,179,162,0.22)' },

  footer: {
    padding: '16px 14px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  footerUser: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38, height: 38, borderRadius: 12,
    background: theme.gradBrand,
    color: '#04211e', fontWeight: 800, fontSize: 15,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 6px 16px -6px rgba(18,179,162,.6)',
  },
  footerName: { color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  footerRole: { color: '#7FA9A3', fontSize: 11 },
  logoutBtn: {
    background: 'rgba(255,255,255,0.05)',
    color: '#F0A9A9',
    border: '1px solid rgba(239,68,68,0.28)',
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    transition: 'background .18s',
  },
};
