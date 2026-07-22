import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge } from '../components/Table';

interface FlaggedReview {
  id: string;
  rating: number;
  comment: string | null;
  moderationNote: string | null;
  createdAt: string;
  refTable: string;
  refId: string;
  author: { name: string } | null;
}

const REF_FR: Record<string, string> = {
  partner_profiles: 'Pharmacie',
  doctor_profiles: 'Médecin',
  couriers: 'Coursier',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function Reviews() {
  const [items, setItems]   = useState<FlaggedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<FlaggedReview[]>('/reviews/flagged').then(setItems).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const moderate = async (r: FlaggedReview, action: 'approve' | 'remove') => {
    const verb = action === 'approve' ? 'approuver (rendre public)' : 'supprimer';
    if (!window.confirm(`Voulez-vous ${verb} cet avis ?`)) return;
    setBusy(r.id);
    try {
      await api.patch(`/reviews/${r.id}/moderate`, { action });
      setItems((prev) => prev.filter((x) => x.id !== r.id));
    } catch { /* silencieux */ }
    finally { setBusy(null); }
  };

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>Modération des avis</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Avis signalés par la modération IA (masqués du public en attendant votre décision).
          Approuver les rend visibles ; supprimer les retire définitivement.
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : items.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
          ✅ Aucun avis signalé.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((r) => (
            <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Badge label={REF_FR[r.refTable] ?? r.refTable} color="#7C3AED" bg="#EDE9FE" />
                  <span style={{ color: '#C77A0A', fontWeight: 700 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {r.author?.name ?? 'Anonyme'} · {formatDate(r.createdAt)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn('#16A34A', '#86EFAC', busy === r.id)} disabled={busy === r.id} onClick={() => moderate(r, 'approve')}>Approuver</button>
                  <button style={btn('#DC2626', '#FCA5A5', busy === r.id)} disabled={busy === r.id} onClick={() => moderate(r, 'remove')}>Supprimer</button>
                </div>
              </div>

              {r.comment && (
                <div style={{ fontSize: 14, color: 'var(--body)', background: '#F8FAFC', borderRadius: 8, padding: 10 }}>« {r.comment} »</div>
              )}
              {r.moderationNote && (
                <div style={{ fontSize: 12, color: '#DC2626' }}>🤖 Motif IA : {r.moderationNote}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function btn(color: string, border: string, busy: boolean): React.CSSProperties {
  return {
    height: 32, paddingInline: 12, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: `1.5px solid ${border}`, background: 'var(--surface)', color, opacity: busy ? 0.5 : 1,
  };
}
