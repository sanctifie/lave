import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Badge } from '../components/Table';

type KycType = 'partner' | 'doctor' | 'courier';

interface KycDoc { id: string; url: string; kind: string }
interface KycEntity {
  type: KycType;
  id: string;
  name: string;
  phone: string | null;
  documents: KycDoc[];
}
interface Verifications {
  partners: KycEntity[];
  doctors: KycEntity[];
  couriers: KycEntity[];
}
interface Screening { legible: boolean; concerns: string[] }

const TYPE_FR: Record<KycType, { label: string; color: string; bg: string }> = {
  partner: { label: 'Pharmacie', color: '#D97706', bg: '#FEF3C7' },
  doctor:  { label: 'Médecin',   color: '#7C3AED', bg: '#EDE9FE' },
  courier: { label: 'Coursier',  color: '#0891B2', bg: '#CFFAFE' },
};

export function Verifications() {
  const [data, setData]       = useState<KycEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState<string | null>(null);
  const [screen, setScreen]   = useState<Record<string, Screening>>({});

  const load = () => {
    setLoading(true);
    api.get<Verifications>('/kyc/verifications')
      .then((v) => setData([...v.partners, ...v.doctors, ...v.couriers]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const rowKey = (e: KycEntity) => `${e.type}:${e.id}`;

  const analyse = async (e: KycEntity) => {
    setBusy(rowKey(e));
    try {
      const res = await api.post<Screening>(`/kyc/verifications/${e.type}/${e.id}/screen`, {});
      setScreen((prev) => ({ ...prev, [rowKey(e)]: res }));
    } catch (err: any) {
      setScreen((prev) => ({ ...prev, [rowKey(e)]: { legible: false, concerns: [err?.message ?? 'Analyse impossible'] } }));
    } finally { setBusy(null); }
  };

  const decide = async (e: KycEntity, status: 'verified' | 'rejected') => {
    const verb = status === 'verified' ? 'valider' : 'rejeter';
    if (!window.confirm(`Voulez-vous ${verb} ${TYPE_FR[e.type].label.toLowerCase()} « ${e.name} » ?`)) return;
    setBusy(rowKey(e));
    try {
      await api.patch(`/kyc/verifications/${e.type}/${e.id}`, { status });
      setData((prev) => prev.filter((x) => rowKey(x) !== rowKey(e)));
    } catch { /* silencieux */ }
    finally { setBusy(null); }
  };

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>Vérifications KYC</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Pharmacies, médecins et coursiers en attente. Le pré-contrôle IA (vision) aide à la décision —
          la validation reste humaine.
        </p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : data.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
          ✅ Aucune vérification en attente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map((e) => {
            const k = rowKey(e);
            const sc = screen[k];
            const t = TYPE_FR[e.type];
            return (
              <div key={k} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Badge label={t.label} color={t.color} bg={t.bg} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {e.phone ?? '—'} · {e.documents.length} justificatif(s)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={btnStyle('#2563EB', '#BFDBFE', busy === k)}
                      disabled={busy === k || e.documents.length === 0}
                      onClick={() => analyse(e)}
                      title={e.documents.length === 0 ? 'Aucun justificatif déposé' : ''}
                    >
                      {busy === k ? '…' : '✨ Analyser (IA)'}
                    </button>
                    <button style={btnStyle('#16A34A', '#86EFAC', busy === k)} disabled={busy === k} onClick={() => decide(e, 'verified')}>
                      Valider
                    </button>
                    <button style={btnStyle('#DC2626', '#FCA5A5', busy === k)} disabled={busy === k} onClick={() => decide(e, 'rejected')}>
                      Rejeter
                    </button>
                  </div>
                </div>

                {sc && (
                  <div style={{ background: sc.legible ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${sc.legible ? '#BBF7D0' : '#FECACA'}`, borderRadius: 8, padding: 10, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: sc.legible ? '#16A34A' : '#DC2626', marginBottom: 4 }}>
                      {sc.legible ? '🔎 Document lisible' : '⚠️ Lisibilité à vérifier'}
                    </div>
                    {sc.concerns.length === 0 ? (
                      <div style={{ color: 'var(--muted)' }}>Aucun point d'attention signalé par l'IA.</div>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--body)' }}>
                        {sc.concerns.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function btnStyle(color: string, border: string, busy: boolean): React.CSSProperties {
  return {
    height: 32, paddingInline: 12, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: `1.5px solid ${border}`, background: 'var(--surface)', color, opacity: busy ? 0.5 : 1,
  };
}
