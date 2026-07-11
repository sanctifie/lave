import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StatCard } from '../components/StatCard';
import { ActivityDonut, Segment } from '../components/charts/ActivityDonut';
import { ServiceBars } from '../components/charts/ServiceBars';

interface Stats {
  orders: number;
  deliveries: number;
  rides: number;
  mealOrders: number;
  appointments: number;
  users: number;
  doctors: number;
}

// Les 5 flux d'activité qui composent le volume de la plateforme (ordre fixe).
const ACTIVITY: { key: keyof Stats; label: string; short: string; icon: string; color: string; bg: string; colorVar: string; trend?: string }[] = [
  { key: 'orders',       label: 'Commandes',     short: 'Cmd.',    icon: '📦', color: '#0E9384', bg: '#E7F4F2', colorVar: 'var(--cat-1)', trend: '12%' },
  { key: 'deliveries',   label: 'Livraisons',    short: 'Livr.',   icon: '🚚', color: '#0EA5E9', bg: '#E0F2FE', colorVar: 'var(--cat-2)', trend: '8%' },
  { key: 'rides',        label: 'Courses',       short: 'Cours.',  icon: '🚗', color: '#12A150', bg: '#DBF6E5', colorVar: 'var(--cat-3)' },
  { key: 'mealOrders',   label: 'Repas',         short: 'Repas',   icon: '🥗', color: '#C77A0A', bg: '#FBEFD3', colorVar: 'var(--cat-4)' },
  { key: 'appointments', label: 'Consultations', short: 'Consul.', icon: '🩺', color: '#DB2777', bg: '#FCE7F3', colorVar: 'var(--cat-5)', trend: '21%' },
];

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

  if (loading) return <DashboardSkeleton />;
  if (error)   return <div style={{ ...styles.center, color: 'var(--error)' }}>{error}</div>;
  if (!stats)  return null;

  const segments: Segment[] = ACTIVITY.map((a) => ({
    key: a.key, label: a.label, value: stats[a.key], colorVar: a.colorVar,
  }));
  const barSegments: Segment[] = ACTIVITY.map((a) => ({
    key: a.key, label: a.short, value: stats[a.key], colorVar: a.colorVar,
  }));
  const activityTotal = segments.reduce((s, x) => s + x.value, 0);
  const share = (v: number) => (activityTotal > 0 ? (v / activityTotal) * 100 : 0);

  return (
    <div style={styles.page} className="rise">
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroGlow} />
        <div style={{ position: 'relative' }}>
          <div style={styles.heroEyebrow}>Vue d'ensemble · temps réel</div>
          <h1 style={styles.title}>Bonjour 👋 Voici MBOLO aujourd'hui</h1>
          <p style={styles.subtitle}>Pilotage de la plateforme — consultations, ordonnances, livraisons et transport.</p>
        </div>
        <div style={styles.heroBadge}>🟢 Tous les services opérationnels</div>
      </div>

      {/* Rangée vedette : composition d'activité + volume par service */}
      <div style={styles.featureGrid}>
        <section className="card-lift" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>Composition de l'activité</h2>
              <p style={styles.panelSub}>Répartition des opérations sur la plateforme</p>
            </div>
          </div>
          <ActivityDonut segments={segments} centerLabel="opérations" />
        </section>

        <section className="card-lift" style={styles.panel}>
          <div style={styles.panelHead}>
            <div>
              <h2 style={styles.panelTitle}>Volume par service</h2>
              <p style={styles.panelSub}>Nombre total d'opérations enregistrées</p>
            </div>
            <span style={styles.totalChip}>
              <span className="tnum" style={{ fontWeight: 800 }}>{activityTotal.toLocaleString('fr-FR')}</span> total
            </span>
          </div>
          <ServiceBars segments={barSegments} />
        </section>
      </div>

      {/* Indicateurs clés */}
      <div style={styles.grid}>
        {ACTIVITY.map((a) => (
          <StatCard
            key={a.key}
            icon={a.icon}
            label={a.label}
            value={stats[a.key].toLocaleString('fr-FR')}
            color={a.color}
            bg={a.bg}
            ring={share(stats[a.key])}
            trend={a.trend}
          />
        ))}
        <StatCard icon="👥" label="Utilisateurs" value={stats.users.toLocaleString('fr-FR')} color="#8B5CF6" bg="#EDE9FE" trend="5%" />
        <StatCard icon="👨‍⚕️" label="Médecins" value={stats.doctors.toLocaleString('fr-FR')} color="#0E9384" bg="#CCFBF1" />
      </div>

      {/* Actions rapides */}
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

/** Squelette de chargement cohérent avec la mise en page réelle. */
function DashboardSkeleton() {
  return (
    <div style={styles.page}>
      <div className="skeleton" style={{ height: 132, borderRadius: 24 }} />
      <div style={styles.featureGrid}>
        <div className="skeleton" style={{ height: 360, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 360, borderRadius: 20 }} />
      </div>
      <div style={styles.grid}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 132, borderRadius: 20 }} />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:    { padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1280 },
  center:  { padding: 40, textAlign: 'center', color: 'var(--muted)' },

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

  featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 },
  panel: {
    background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)', padding: '20px 22px 24px',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  panelHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  panelTitle: { fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' },
  panelSub: { fontSize: 12.5, color: 'var(--muted)', marginTop: 3 },
  totalChip: {
    fontSize: 12, color: 'var(--muted)', background: 'var(--brand-surface)',
    padding: '5px 11px', borderRadius: 20, whiteSpace: 'nowrap',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 },

  section: { display: 'flex', flexDirection: 'column', gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' },
  actionGrid: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  actionCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    backgroundColor: 'var(--surface)', borderRadius: 18, padding: '22px 26px',
    boxShadow: 'var(--shadow)', minWidth: 150,
    textDecoration: 'none', color: 'var(--ink)',
    border: '1px solid var(--border)', cursor: 'pointer',
  },
  actionLabel: { fontSize: 13, fontWeight: 600, textAlign: 'center' },
};
