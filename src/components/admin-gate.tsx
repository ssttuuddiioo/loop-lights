import { useState, useCallback } from 'preact/hooks';
import { adminLogin } from '../api/health';

/** Password prompt shown when the visitor isn't admin-authenticated. */
export function AdminGate({
  onUnlock,
  subtitle = 'This page is restricted. Enter the admin password.',
}: {
  onUnlock: () => void;
  subtitle?: string;
}) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async (e: Event) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    const ok = await adminLogin(pw);
    setBusy(false);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      setPw('');
    }
  }, [pw, busy, onUnlock]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 16,
    }}>
      <form onSubmit={submit} style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        width: 280, textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600,
          color: 'var(--app-text)',
        }}>
          Admin Access
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--app-muted)' }}>
          {subtitle}
        </div>
        <input
          type="password"
          value={pw}
          autoFocus
          placeholder="Admin password"
          onInput={(e) => { setPw((e.target as HTMLInputElement).value); setError(false); }}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, padding: '10px 14px',
            borderRadius: 8, border: '1px solid var(--app-border, rgba(255,255,255,0.15))',
            background: 'var(--app-surface2, #0a0a0a)', color: 'var(--app-text)',
            outline: 'none', textAlign: 'center',
          }}
        />
        <button type="submit" disabled={!pw || busy} style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          padding: 10, borderRadius: 8, border: 'none', cursor: pw && !busy ? 'pointer' : 'not-allowed',
          background: 'var(--app-accent, #ededed)', color: '#fff', opacity: pw && !busy ? 1 : 0.5,
        }}>
          {busy ? 'Checking...' : 'Unlock'}
        </button>
        {error && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FF3333' }}>
            Incorrect password
          </div>
        )}
      </form>
    </div>
  );
}
