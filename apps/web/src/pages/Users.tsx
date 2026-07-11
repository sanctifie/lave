import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table, Badge, Column } from '../components/Table';

interface UserRow {
  id: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_FR: Record<string, string> = {
  patient: 'Patient', doctor: 'Médecin', courier: 'Coursier',
  partner_staff: 'Pharmacie', admin: 'Admin', accompagnant: 'Accompagnant',
};
const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  patient:       { color: '#2563EB', bg: '#DBEAFE' },
  doctor:        { color: '#7C3AED', bg: '#EDE9FE' },
  courier:       { color: '#0891B2', bg: '#CFFAFE' },
  partner_staff: { color: '#D97706', bg: '#FEF3C7' },
  admin:         { color: '#DC2626', bg: '#FEE2E2' },
  accompagnant:  { color: '#64748B', bg: '#F3F4F6' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

const ROLES = ['', 'patient', 'doctor', 'courier', 'partner_staff', 'admin'];

export function Users() {
  const [users, setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole]     = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<UserRow[]>(`/admin/users${role ? `?role=${role}` : ''}`)
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [role]);

  const toggle = async (u: UserRow) => {
    const verb = u.isActive ? 'désactiver' : 'réactiver';
    if (!window.confirm(`Voulez-vous ${verb} le compte de ${u.name} ?`)) return;
    setToggling(u.id);
    try {
      const res = await api.patch<{ id: string; isActive: boolean }>(`/admin/users/${u.id}/toggle`);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: res.isActive } : x)));
    } catch { /* silencieux */ }
    finally { setToggling(null); }
  };

  const COLUMNS: Column<UserRow>[] = [
    { key: 'name',   header: 'Nom',       render: (u) => <div><div style={{ fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.phone}</div></div> },
    { key: 'role',   header: 'Rôle',      render: (u) => { const c = ROLE_COLORS[u.role] ?? { color: '#64748B', bg: '#F3F4F6' }; return <Badge label={ROLE_FR[u.role] ?? u.role} color={c.color} bg={c.bg} />; } },
    { key: 'active', header: 'Statut',    render: (u) => <Badge label={u.isActive ? 'Actif' : 'Inactif'} color={u.isActive ? '#16A34A' : '#DC2626'} bg={u.isActive ? '#DCFCE7' : '#FEE2E2'} /> },
    { key: 'date',   header: 'Inscrit le',render: (u) => formatDate(u.createdAt), width: '120px' },
    { key: 'action', header: '',          width: '130px', render: (u) => (
      <button
        style={{
          height: 32, paddingInline: 12, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: `1.5px solid ${u.isActive ? '#FCA5A5' : '#86EFAC'}`,
          background: 'var(--surface)', color: u.isActive ? '#DC2626' : '#16A34A',
          opacity: toggling === u.id ? 0.5 : 1,
        }}
        disabled={toggling === u.id}
        onClick={() => toggle(u)}
      >
        {toggling === u.id ? '…' : u.isActive ? 'Désactiver' : 'Réactiver'}
      </button>
    ) },
  ];

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>Utilisateurs</h1>
        <select
          style={{ height: 40, borderRadius: 8, border: '1.5px solid var(--border)', paddingInline: 12, fontSize: 14, color: 'var(--body)', background: 'var(--surface)', outline: 'none' }}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Tous les rôles</option>
          {ROLES.filter(Boolean).map((r) => <option key={r} value={r}>{ROLE_FR[r] ?? r}</option>)}
        </select>
      </div>
      <Table columns={COLUMNS} data={users} keyFn={(u) => u.id} loading={loading} emptyMessage="Aucun utilisateur" />
    </div>
  );
}
