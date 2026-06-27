import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface PricingRow {
  id: string;
  kind: string;
  valueFcfa: number | null;
  valueNum: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

const KIND_FR: Record<string, { label: string; desc: string; unit: string; field: 'valueFcfa' | 'valueNum' }> = {
  delivery_base:                  { label: 'Frais de base livraison',    desc: 'Montant fixe par livraison (FCFA)',           unit: 'FCFA',     field: 'valueFcfa' },
  delivery_per_km:                { label: 'Tarif par km (livraison)',   desc: 'Montant additionnel par kilomètre',           unit: 'FCFA/km',  field: 'valueFcfa' },
  service_fee:                    { label: 'Frais de service',           desc: 'Commission plateforme sur commandes',         unit: 'FCFA',     field: 'valueFcfa' },
  consultation_base_fee:          { label: 'Frais consultation de base', desc: 'Tarif minimum de téléconsultation',           unit: 'FCFA',     field: 'valueFcfa' },
  video_usd_per_participant_min:  { label: 'Coût vidéo / min',          desc: 'Taux Daily.co par participant par minute',    unit: 'USD/min',  field: 'valueNum'  },
  usd_to_fcfa_rate:               { label: 'Taux USD → FCFA',           desc: 'Taux de change utilisé pour la vidéo',       unit: 'FCFA',     field: 'valueNum'  },
  platform_commission_pct:        { label: 'Commission plateforme %',   desc: 'Pourcentage retenu sur paiements',            unit: '%',        field: 'valueNum'  },
  meal_delivery_fee:              { label: 'Frais livraison repas',     desc: 'Frais fixes pour livraison de repas',         unit: 'FCFA',     field: 'valueFcfa' },
  ride_base_fee:                  { label: 'Tarif de base course',      desc: 'Montant fixe pour une course (transport)',    unit: 'FCFA',     field: 'valueFcfa' },
  ride_per_km:                    { label: 'Tarif par km (course)',     desc: 'Montant additionnel par km (transport)',      unit: 'FCFA/km',  field: 'valueFcfa' },
};

export function Pricing() {
  const [rows, setRows]     = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState<string | null>(null);

  useEffect(() => {
    api.get<PricingRow[]>('/pricing')
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (row: PricingRow) => {
    const meta = KIND_FR[row.kind];
    if (!meta) return;
    const val = meta.field === 'valueFcfa' ? row.valueFcfa : row.valueNum;
    setEditValue(String(val ?? ''));
    setEditing(row.kind);
  };

  const save = async (kind: string) => {
    setSaving(true);
    const meta = KIND_FR[kind];
    const body = meta.field === 'valueFcfa'
      ? { kind, valueFcfa: Number(editValue) }
      : { kind, valueNum: Number(editValue) };
    try {
      await api.post('/pricing', body);
      setRows((prev) => prev.map((r) => r.kind === kind
        ? { ...r, ...(meta.field === 'valueFcfa' ? { valueFcfa: Number(editValue) } : { valueNum: editValue }) }
        : r,
      ));
      setSaved(kind);
      setTimeout(() => setSaved(null), 2000);
    } catch { /* silencieux */ }
    finally { setSaving(false); setEditing(null); }
  };

  if (loading) return <div style={{ padding: 40, color: '#64748B', textAlign: 'center' }}>Chargement…</div>;

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B' }}>Tarification</h1>
      <p style={{ color: '#64748B', fontSize: 14 }}>
        Modifiez les paramètres tarifaires de la plateforme. Les changements sont appliqués immédiatement.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((row) => {
          const meta = KIND_FR[row.kind];
          if (!meta) return null;
          const currentVal = meta.field === 'valueFcfa' ? row.valueFcfa : row.valueNum;
          const isEditing = editing === row.kind;
          const isSaved   = saved === row.kind;

          return (
            <div key={row.kind} style={styles.row}>
              <div style={{ flex: 1 }}>
                <div style={styles.kindLabel}>{meta.label}</div>
                <div style={styles.kindDesc}>{meta.desc}</div>
              </div>
              <div style={styles.valueArea}>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="number"
                      style={styles.input}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && save(row.kind)}
                      autoFocus
                    />
                    <span style={styles.unit}>{meta.unit}</span>
                    <button style={styles.saveBtn} onClick={() => save(row.kind)} disabled={saving}>
                      {saving ? '…' : 'Enregistrer'}
                    </button>
                    <button style={styles.cancelBtn} onClick={() => setEditing(null)}>Annuler</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={styles.currentValue}>
                      {currentVal ?? '—'} <span style={styles.unit}>{meta.unit}</span>
                    </span>
                    {isSaved && <span style={{ color: '#16A34A', fontSize: 13 }}>✓ Enregistré</span>}
                    <button style={styles.editBtn} onClick={() => startEdit(row)}>Modifier</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
    backgroundColor: '#fff', borderRadius: 12, padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  kindLabel: { fontSize: 15, fontWeight: 600, color: '#1E293B' },
  kindDesc:  { fontSize: 13, color: '#64748B', marginTop: 2 },
  valueArea: { display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 },
  currentValue: { fontSize: 18, fontWeight: 700, color: '#1E293B' },
  unit:      { fontSize: 12, color: '#94A3B8' },
  input:     { height: 40, width: 120, borderRadius: 8, border: '1.5px solid #006D77', paddingInline: 12, fontSize: 15, outline: 'none' },
  editBtn:   { height: 36, paddingInline: 16, borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#374151' },
  saveBtn:   { height: 36, paddingInline: 16, borderRadius: 8, border: 'none', background: '#006D77', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { height: 36, paddingInline: 12, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#64748B' },
};
