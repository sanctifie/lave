import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table, Badge, Column } from '../components/Table';

interface DoctorRow {
  id: string;
  cnomNumber: string;
  consultationFeeFcfa: number;
  isAvailableNow: boolean;
  verificationStatus: string;
  createdAt: string;
  user: { name: string; phone: string; isActive: boolean };
  specialty: { name: string };
}

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }

const VERIF_COLORS: Record<string, { color: string; bg: string }> = {
  verified:            { color: '#16A34A', bg: '#DCFCE7' },
  pending_verification:{ color: '#D97706', bg: '#FEF3C7' },
  pending_manual:      { color: '#2563EB', bg: '#DBEAFE' },
  rejected:            { color: '#DC2626', bg: '#FEE2E2' },
};
const VERIF_FR: Record<string, string> = {
  verified: 'Vérifié', pending_verification: 'En attente', pending_manual: 'Manuel', rejected: 'Refusé',
};

const COLUMNS: Column<DoctorRow>[] = [
  { key: 'name',     header: 'Médecin',    render: (d) => <div><div style={{ fontWeight: 600 }}>{d.user.name}</div><div style={{ fontSize: 12, color: '#64748B' }}>{d.user.phone}</div></div> },
  { key: 'specialty',header: 'Spécialité', render: (d) => d.specialty.name },
  { key: 'cnom',     header: 'N° CNOM',    render: (d) => <code style={{ fontSize: 12 }}>{d.cnomNumber}</code> },
  { key: 'fee',      header: 'Tarif',      render: (d) => formatFcfa(d.consultationFeeFcfa) },
  { key: 'available',header: 'Disponible', render: (d) => <Badge label={d.isAvailableNow ? '🟢 En ligne' : '⚫ Hors ligne'} color={d.isAvailableNow ? '#16A34A' : '#64748B'} bg={d.isAvailableNow ? '#DCFCE7' : '#F3F4F6'} /> },
  { key: 'verif',    header: 'Vérification',render: (d) => { const s = VERIF_COLORS[d.verificationStatus] ?? { color: '#64748B', bg: '#F3F4F6' }; return <Badge label={VERIF_FR[d.verificationStatus] ?? d.verificationStatus} color={s.color} bg={s.bg} />; } },
];

export function Doctors() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DoctorRow[]>('/admin/doctors').then(setDoctors).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B' }}>Médecins</h1>
      <Table columns={COLUMNS} data={doctors} keyFn={(d) => d.id} loading={loading} emptyMessage="Aucun médecin enregistré" />
    </div>
  );
}
