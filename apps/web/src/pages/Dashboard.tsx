import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';

interface Stats {
  orders: number;
  deliveries: number;
  rides: number;
  mealOrders: number;
  appointments: number;
  users: number;
  doctors: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get<Stats>('/admin/stats')
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.center}>Chargement des statistiques…</div>;
  if (error)   return <div style={{ ...styles.center, color: '#DC2626' }}>{error}</div>;
  if (!stats)  return null;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Tableau de bord</h1>
      <p style={styles.subtitle}>Vue d'ensemble de la plateforme MBOLO Santé</p>

      <div style={styles.grid}>
        <StatCard icon="📦" label="Commandes"     value={stats.orders}       color="#6366F1" bg="#EEF2FF" />
        <StatCard icon="🚚" label="Livraisons"    value={stats.deliveries}   color="#0EA5E9" bg="#E0F2FE" />
        <StatCard icon="🚗" label="Courses"       value={stats.rides}        color="#10B981" bg="#DCFCE7" />
        <StatCard icon="🥗" label="Repas"         value={stats.mealOrders}   color="#F59E0B" bg="#FEF3C7" />
        <StatCard icon="🩺" label="Consultations" value={stats.appointments} color="#EC4899" bg="#FCE7F3" />
        <StatCard icon="👥" label="Utilisateurs"  value={stats.users}        color="#8B5CF6" bg="#EDE9FE" />
        <StatCard icon="👨‍⚕️" label="Médecins"     value={stats.doctors}      color="#14B8A6" bg="#CCFBF1" />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Actions rapides</h2>
        <div style={styles.actionGrid}>
          {[
            { icon: '💰', label: 'Gérer la tarification', path: '/pricing' },
            { icon: '🩺', label: 'Voir les médecins',     path: '/doctors' },
            { icon: '📦', label: 'Suivi des commandes',   path: '/orders' },
            { icon: '🚗', label: 'Suivi des courses',     path: '/rides' },
          ].map((a) => (
            <a key={a.path} href={a.path} style={styles.actionCard}>
              <span style={{ fontSize: 28 }}>{a.icon}</span>
              <span style={styles.actionLabel}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:    { padding: '32px', display: 'flex', flexDirection: 'column', gap: 32 },
  center:  { padding: 40, textAlign: 'center', color: '#64748B' },
  title:   { fontSize: 26, fontWeight: 700, color: '#1E293B' },
  subtitle:{ fontSize: 14, color: '#64748B', marginTop: 4 },

  grid: { display: 'flex', flexWrap: 'wrap', gap: 16 },

  section: { display: 'flex', flexDirection: 'column', gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: '#1E293B' },
  actionGrid: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  actionCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)', minWidth: 140,
    textDecoration: 'none', color: '#1E293B',
    border: '1px solid #E2E8F0', cursor: 'pointer',
  },
  actionLabel: { fontSize: 13, fontWeight: 600, textAlign: 'center' },
};
