import React from 'react';
import { NavLink } from 'react-router-dom';

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
}

export function Sidebar({ onLogout, userName }: SidebarProps) {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={{ fontSize: 28 }}>🏥</span>
        <div>
          <div style={styles.logoTitle}>MBOLO Santé</div>
          <div style={styles.logoSub}>Administration</div>
        </div>
      </div>

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
            <span style={{ fontSize: 18 }}>{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
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
    width: 240,
    backgroundColor: '#1E293B',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    padding: '0',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '24px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoTitle: { color: '#fff', fontWeight: 700, fontSize: 16 },
  logoSub:   { color: '#94A3B8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },

  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },

  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    color: '#94A3B8',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  linkActive: {
    backgroundColor: 'rgba(0,109,119,0.25)',
    color: '#83C5BE',
  },

  footer: {
    padding: '16px 12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  footerUser: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#006D77',
    color: '#fff', fontWeight: 700, fontSize: 15,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  footerName: { color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  footerRole: { color: '#64748B', fontSize: 11 },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    color: '#FCA5A5',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    cursor: 'pointer',
    width: '100%',
  },
};
