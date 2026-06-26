import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table, Badge, Column } from '../components/Table';

interface DeliveryRow {
  id: string;
  status: string;
  feeFcfa: number;
  createdAt: string;
  courier: { user: { name: string } } | null;
  order: { partner: { legalName: string } | null; patient: { name: string } | null } | null;
  ride:  { request: { originLandmark: string; destLandmark: string; type: string } } | null;
  mealOrder: { mealPlan: { name: string } } | null;
}

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  pending_assignment: { color: '#D97706', bg: '#FEF3C7' },
  assigned:           { color: '#2563EB', bg: '#DBEAFE' },
  en_route_pickup:    { color: '#7C3AED', bg: '#EDE9FE' },
  picked_up:          { color: '#0891B2', bg: '#CFFAFE' },
  en_route_delivery:  { color: '#6366F1', bg: '#EEF2FF' },
  delivered:          { color: '#16A34A', bg: '#DCFCE7' },
  failed:             { color: '#DC2626', bg: '#FEE2E2' },
};
const STATUS_FR: Record<string, string> = {
  pending_assignment: 'En attente', assigned: 'Assignée', en_route_pickup: 'En route (pickup)',
  picked_up: 'Récupéré', en_route_delivery: 'En livraison', delivered: 'Livré', failed: 'Échec',
};

function typeLabel(d: DeliveryRow) {
  if (d.order)     return `📦 ${d.order.partner?.legalName ?? 'Commande'}`;
  if (d.ride)      return `🚗 ${d.ride.request.originLandmark} → ${d.ride.request.destLandmark}`;
  if (d.mealOrder) return `🥗 ${d.mealOrder.mealPlan.name}`;
  return '—';
}

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const COLUMNS: Column<DeliveryRow>[] = [
  { key: 'id',     header: 'ID',      render: (d) => <code style={{ fontSize: 12, color: '#6366F1' }}>…{d.id.slice(-8)}</code>, width: '100px' },
  { key: 'type',   header: 'Contenu', render: typeLabel },
  { key: 'courier',header: 'Coursier',render: (d) => d.courier?.user.name ?? <span style={{ color: '#94A3B8' }}>Non assigné</span> },
  { key: 'fee',    header: 'Frais',   render: (d) => formatFcfa(d.feeFcfa) },
  { key: 'status', header: 'Statut',  render: (d) => { const s = STATUS_COLOR[d.status] ?? { color: '#64748B', bg: '#F3F4F6' }; return <Badge label={STATUS_FR[d.status] ?? d.status} color={s.color} bg={s.bg} />; } },
  { key: 'date',   header: 'Date',    render: (d) => formatDate(d.createdAt), width: '150px' },
];

export function Deliveries() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    api.get<DeliveryRow[]>('/admin/deliveries').then(setDeliveries).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B' }}>Livraisons</h1>
      <Table columns={COLUMNS} data={deliveries} keyFn={(d) => d.id} loading={loading} emptyMessage="Aucune livraison" />
    </div>
  );
}
