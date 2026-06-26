import React, { useState } from 'react';
import { api } from '../api/client';
import { AdminUser } from '../hooks/useAuth';

interface LoginProps {
  onLogin: (user: AdminUser) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [step, setStep]   = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { setError('Numéro requis'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/otp/request', { phone: phone.trim() });
      setStep('otp');
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError('Code requis'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post<{ token: string; user: { id: string; name: string; phone: string; role: string } }>(
        '/auth/otp/verify',
        { phone: phone.trim(), code: code.trim() },
      );
      if (res.user.role !== 'admin') {
        setError('Accès réservé aux administrateurs');
        return;
      }
      onLogin({ ...res.user, token: res.token });
    } catch (err: any) {
      setError(err.message ?? 'Code incorrect ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={{ fontSize: 40 }}>🏥</span>
          <div>
            <div style={styles.logoTitle}>MBOLO Santé</div>
            <div style={styles.logoSub}>Tableau de bord administrateur</div>
          </div>
        </div>

        {step === 'phone' ? (
          <form onSubmit={requestOtp} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Numéro de téléphone</label>
              <input
                style={styles.input}
                type="tel"
                placeholder="+241 XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Envoi…' : 'Recevoir le code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} style={styles.form}>
            <p style={styles.hint}>Code envoyé au {phone}</p>
            <div style={styles.field}>
              <label style={styles.label}>Code de vérification</label>
              <input
                style={{ ...styles.input, letterSpacing: 8, fontSize: 24, textAlign: 'center' }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            {error && <div style={styles.error}>{error}</div>}
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Vérification…' : 'Se connecter'}
            </button>
            <button
              type="button"
              style={styles.backBtn}
              onClick={() => { setStep('phone'); setCode(''); setError(''); }}
            >
              ← Modifier le numéro
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9', padding: 16,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: '40px 32px', width: '100%', maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    display: 'flex', flexDirection: 'column', gap: 28,
  },
  logo:      { display: 'flex', alignItems: 'center', gap: 14 },
  logoTitle: { fontSize: 22, fontWeight: 700, color: '#1E293B' },
  logoSub:   { fontSize: 13, color: '#64748B', marginTop: 2 },

  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field:{ display: 'flex', flexDirection: 'column', gap: 6 },
  label:{ fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 52, borderRadius: 10, border: '1.5px solid #E2E8F0',
    paddingInline: 14, fontSize: 16, color: '#1E293B',
    outline: 'none', width: '100%',
  },
  hint: { fontSize: 14, color: '#64748B' },
  error:{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 14 },
  btn: {
    height: 52, backgroundColor: '#6366F1', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600,
    cursor: 'pointer', marginTop: 4,
  },
  backBtn: {
    background: 'none', border: 'none', color: '#6366F1',
    fontSize: 14, cursor: 'pointer', textAlign: 'center', padding: 0,
  },
};
