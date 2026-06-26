import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table, Badge, Column } from '../components/Table';

interface MealOrderRow {
  id: string;
  patientId: string;
  totalFcfa: number;
  deliveryFeeFcfa: number;
  notes: string | null;
  createdAt: string;
  mealPlan: { name: string; partnerId: string };
  delivery: { status: string } | null;
}

const DELIVERY_STATUS_FR: Record<string, string> = {
  pending_assignment: 'En attente de livreur',
  assigned:           'Livreur assigné',
  en_route_pickup:    'En route (pickup)',
  picked_up:          'Récupéré',
  en_route_delivery:  'En livraison',
  delivered:          'Livré',
  failed:             'Échec',
};

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const COLUMNS: Column<MealOrderRow>[] = [
  { key: 'id',      header: 'ID',     render: (o) => <code style={{ fontSize: 12, color: '#6366F1' }}>…{o.id.slice(-8)}</code>, width: '100px' },
  { key: 'plan',    header: 'Menu',   render: (o) => <strong>{o.mealPlan.name}</strong> },
  { key: 'total',   header: 'Total',  render: (o) => formatFcfa(o.totalFcfa) },
  { key: 'delivery',header: 'Livraison', render: (o) => {
    const s = o.delivery?.status ?? 'pending_assignment';
    const label = DELIVERY_STATUS_FR[s] ?? s;
    const isDelivered = s === 'delivered';
    return <Badge label={label} color={isDelivered ? '#16A34A' : '#D97706'} bg={isDelivered ? '#DCFCE7' : '#FEF3C7'} />;
  }},
  { key: 'notes',   header: 'Notes',  render: (o) => <span style={{ color: '#64748B', fontSize: 13 }}>{o.notes ?? '—'}</span> },
  { key: 'date',    header: 'Date',   render: (o) => formatDate(o.createdAt), width: '150px' },
];

export function Meals() {
  const [orders, setOrders] = useState<MealOrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<MealOrderRow[]>('/admin/meals').then(setOrders).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B' }}>Commandes repas</h1>
      <Table columns={COLUMNS} data={orders} keyFn={(o) => o.id} loading={loading} emptyMessage="Aucune commande repas" />
    </div>
  );
}
