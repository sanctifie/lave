import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Table, Badge, Column } from '../components/Table';

interface Order {
  id: string;
  status: string;
  totalFcfa: number;
  createdAt: string;
  patient: { name: string; phone: string };
  partner: { legalName: string };
  items: { name: string; quantity: number }[];
}

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  pending_pharmacy:   { color: '#D97706', bg: '#FEF3C7' },
  pharmacy_accepted:  { color: '#059669', bg: '#D1FAE5' },
  pharmacy_rejected:  { color: '#DC2626', bg: '#FEE2E2' },
  preparing:          { color: '#2563EB', bg: '#DBEAFE' },
  ready_for_pickup:   { color: '#7C3AED', bg: '#EDE9FE' },
  dispatched:         { color: '#0891B2', bg: '#CFFAFE' },
  delivered:          { color: '#16A34A', bg: '#DCFCE7' },
  cancelled:          { color: '#9CA3AF', bg: '#F3F4F6' },
};

const STATUS_FR: Record<string, string> = {
  pending_pharmacy:   'En attente pharmacie',
  pharmacy_accepted:  'Acceptée',
  pharmacy_rejected:  'Refusée',
  preparing:          'En préparation',
  ready_for_pickup:   'Prête',
  dispatched:         'En livraison',
  delivered:          'Livrée',
  cancelled:          'Annulée',
};

function formatFcfa(n: number) { return `${n.toLocaleString('fr-FR')} FCFA`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const COLUMNS: Column<Order>[] = [
  { key: 'id',       header: 'ID',        render: (o) => <code style={{ fontSize: 12, color: '#006D77' }}>…{o.id.slice(-8)}</code>, width: '100px' },
  { key: 'patient',  header: 'Patient',   render: (o) => <div><div style={{ fontWeight: 600 }}>{o.patient.name}</div><div style={{ fontSize: 12, color: '#64748B' }}>{o.patient.phone}</div></div> },
  { key: 'partner',  header: 'Pharmacie', render: (o) => o.partner.legalName },
  { key: 'items',    header: 'Articles',  render: (o) => { const n = o.items?.length ?? 0; return <span>{n} article{n > 1 ? 's' : ''}</span>; } },
  { key: 'total',    header: 'Total',     render: (o) => <strong>{formatFcfa(o.totalFcfa)}</strong> },
  { key: 'status',   header: 'Statut',    render: (o) => { const s = STATUS_COLOR[o.status] ?? { color: '#64748B', bg: '#F3F4F6' }; return <Badge label={STATUS_FR[o.status] ?? o.status} color={s.color} bg={s.bg} />; } },
  { key: 'date',     header: 'Date',      render: (o) => formatDate(o.createdAt), width: '150px' },
];

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]  = useState('');

  useEffect(() => {
    api.get<Order[]>('/admin/orders')
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? orders.filter((o) => o.status === filter)
    : orders;

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <h1 style={styles.title}>Commandes</h1>
        <select style={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_FR).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <Table columns={COLUMNS} data={filtered} keyFn={(o) => o.id} loading={loading} emptyMessage="Aucune commande" />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:       { padding: 32, display: 'flex', flexDirection: 'column', gap: 24 },
  pageHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title:      { fontSize: 24, fontWeight: 700, color: '#1E293B' },
  select:     { height: 40, borderRadius: 8, border: '1.5px solid #E2E8F0', paddingInline: 12, fontSize: 14, color: '#374151', outline: 'none' },
};
