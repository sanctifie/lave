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
    <div style={styles.page} className="rise">
      <div style={styles.hero}>
        <div style={styles.heroGlow} />
        <div style={{ position: 'relative' }}>
          <div style={styles.heroEyebrow}>Vue d'ensemble · temps réel</div>
          <h1 style={styles.title}>Bonjour 👋 Voici MBOLO aujourd'hui</h1>
          <p style={styles.subtitle}>Pilotage de la plateforme — consultations, ordonnances, livraisons et transport.</p>
        </div>
        <div style={styles.heroBadge}>🟢 Tous les services opérationnels</div>
      </div>

      <div style={styles.grid}>
        <StatCard icon="📦" label="Commandes"     value={stats.orders}       color="#0E9384" bg="#E7F4F2" trend="12%" />
        <StatCard icon="🚚" label="Livraisons"    value={stats.deliveries}   color="#0EA5E9" bg="#E0F2FE" trend="8%" />
        <StatCard icon="🚗" label="Courses"       value={stats.rides}        color="#12A150" bg="#DBF6E5" />
        <StatCard icon="🥗" label="Repas"         value={stats.mealOrders}   color="#F6A417" bg="#FBEFD3" />
        <StatCard icon="🩺" label="Consultations" value={stats.appointments} color="#EC4899" bg="#FCE7F3" trend="21%" />
        <StatCard icon="👥" label="Utilisateurs"  value={stats.users}        color="#8B5CF6" bg="#EDE9FE" />
        <StatCard icon="👨‍⚕️" label="Médecins"     value={stats.doctors}      color="#0E9384" bg="#CCFBF1" />
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
            <a key={a.path} href={a.path} style={styles.actionCard} className="card-lift">
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
  page:    { padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1240 },
  center:  { padding: 40, textAlign: 'center', color: '#6B8B87' },

  hero: {
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, #0E9384 0%, #0B6B60 55%, #0A4F49 100%)',
    borderRadius: 24, padding: '28px 30px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap',
    boxShadow: '0 20px 44px -18px rgba(11,107,96,.6)',
  },
  heroGlow: { position: 'absolute', width: 260, height: 260, right: -60, top: -90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.18), transparent 70%)' },
  heroEyebrow: { color: 'rgba(255,255,255,.78)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4 },
  title:   { fontSize: 27, fontWeight: 750, color: '#fff', marginTop: 8, letterSpacing: '-0.02em' },
  subtitle:{ fontSize: 14, color: 'rgba(255,255,255,.82)', marginTop: 6, maxWidth: 460 },
  heroBadge: {
    position: 'relative', background: 'rgba(255,255,255,.14)', color: '#fff',
    fontSize: 12.5, fontWeight: 600, padding: '9px 14px', borderRadius: 20,
    border: '1px solid rgba(255,255,255,.2)', whiteSpace: 'nowrap',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 },

  section: { display: 'flex', flexDirection: 'column', gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#0F2C29', letterSpacing: '-0.01em' },
  actionGrid: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  actionCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 18, padding: '22px 26px',
    boxShadow: '0 4px 14px -4px rgba(8,49,46,.12)', minWidth: 150,
    textDecoration: 'none', color: '#0F2C29',
    border: '1px solid #E3EDEB', cursor: 'pointer',
  },
  actionLabel: { fontSize: 13, fontWeight: 600, textAlign: 'center' },
};
