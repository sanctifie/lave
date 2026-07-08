import React, { useState } from 'react';
import { api } from '../api/client';
import { AdminUser } from '../hooks/useAuth';
import { theme } from '../theme';

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
          <div style={styles.logoMark}>
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
              <path d="M12 21s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7 3.5C19 16.65 12 21 12 21Z" fill="#04211e"/>
              <path d="M12 10v5M9.5 12.5h5" stroke="#5FD3C4" strokeWidth="1.9" strokeLinecap="round"/>
            </svg>
          </div>
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
    flex: 1, minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: 16,
    background:
      'radial-gradient(900px 600px at 80% -10%, rgba(18,179,162,.28), transparent 55%),' +
      'radial-gradient(700px 500px at 10% 110%, rgba(246,164,23,.16), transparent 55%),' +
      'linear-gradient(160deg, #0A3B37, #06201F)',
  },
  card: {
    position: 'relative',
    backgroundColor: '#fff', borderRadius: 24,
    padding: '38px 34px', width: '100%', maxWidth: 428,
    boxShadow: '0 30px 70px -24px rgba(0,0,0,.55)',
    display: 'flex', flexDirection: 'column', gap: 26,
    overflow: 'hidden',
  },
  logo:      { display: 'flex', alignItems: 'center', gap: 14 },
  logoMark: {
    width: 54, height: 54, borderRadius: 16,
    background: 'linear-gradient(145deg, #12B3A2, #0B6B60)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 12px 26px -8px rgba(18,179,162,.7)', flexShrink: 0,
  },
  logoTitle: { fontSize: 22, fontWeight: 750, color: theme.ink, letterSpacing: '-0.01em' },
  logoSub:   { fontSize: 13, color: theme.muted, marginTop: 2 },

  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field:{ display: 'flex', flexDirection: 'column', gap: 7 },
  label:{ fontSize: 12, fontWeight: 700, color: theme.body, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    height: 54, borderRadius: 13, border: `1.5px solid ${theme.border}`,
    paddingInline: 16, fontSize: 16, color: theme.ink,
    outline: 'none', width: '100%', background: '#FbFdfc',
  },
  hint: { fontSize: 14, color: theme.muted },
  error:{ backgroundColor: theme.errorSurface, color: theme.error, padding: '11px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500 },
  btn: {
    height: 54, background: 'linear-gradient(145deg, #12B3A2, #0B6B60)', color: '#fff',
    border: 'none', borderRadius: 13, fontSize: 16, fontWeight: 700,
    cursor: 'pointer', marginTop: 4,
    boxShadow: '0 14px 30px -10px rgba(14,147,132,.7)',
  },
  backBtn: {
    background: 'none', border: 'none', color: theme.brand,
    fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center', padding: 0,
  },
};
