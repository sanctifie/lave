import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table, Badge, Column } from '../components/Table';

interface RideRow {
  id: string;
  status: string;
  fareEstFcfa: number;
  fareFinalFcfa: number | null;
  createdAt: string;
  request: {
    patientId: string;
    type: string;
    originLandmark: string;
    destLandmark: string;
  };
  delivery: { status: string } | null;
}

const TYPE_FR: Record<string, string> = { home: 'Domicile', hospital: 'Hôpital', exam: 'Examen' };

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  pending:   { color: '#D97706', bg: '#FEF3C7' },
  assigned:  { color: '#2563EB', bg: '#DBEAFE' },
  en_route:  { color: '#7C3AED', bg: '#EDE9FE' },
  arrived:   { color: '#0891B2', bg: '#CFFAFE' },
  completed: { color: '#16A34A', bg: '#DCFCE7' },
  cancelled: { color: '#9CA3AF', bg: '#F3F4F6' },
};
const STATUS_FR: Record<string, string> = {
  pending: 'En attente', assigned: 'Assigné', en_route: 'En route',
  arrived: 'Arrivé', completed: 'Terminé', cancelled: 'Annulé',
};

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const COLUMNS: Column<RideRow>[] = [
  { key: 'id',      header: 'ID',     render: (r) => <code style={{ fontSize: 12, color: '#6366F1' }}>…{r.id.slice(-8)}</code>, width: '100px' },
  { key: 'type',    header: 'Type',   render: (r) => TYPE_FR[r.request.type] ?? r.request.type },
  { key: 'trajet',  header: 'Trajet', render: (r) => <div><div style={{ fontWeight: 600 }}>{r.request.originLandmark}</div><div style={{ fontSize: 12, color: '#64748B' }}>→ {r.request.destLandmark}</div></div> },
  { key: 'fare',    header: 'Tarif',  render: (r) => <strong>{formatFcfa(r.fareFinalFcfa ?? r.fareEstFcfa)}</strong> },
  { key: 'status',  header: 'Statut', render: (r) => { const s = STATUS_COLOR[r.status] ?? { color: '#64748B', bg: '#F3F4F6' }; return <Badge label={STATUS_FR[r.status] ?? r.status} color={s.color} bg={s.bg} />; } },
  { key: 'date',    header: 'Date',   render: (r) => formatDate(r.createdAt), width: '150px' },
];

export function Rides() {
  const [rides, setRides]   = useState<RideRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<RideRow[]>('/admin/rides').then(setRides).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B' }}>Transport médical</h1>
      <Table columns={COLUMNS} data={rides} keyFn={(r) => r.id} loading={loading} emptyMessage="Aucune course" />
    </div>
  );
}
