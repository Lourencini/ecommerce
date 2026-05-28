'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/lib/api';
import { useAdminToken } from '@/hooks/useAdminToken';

interface PaymentsConfig {
  accessTokenMasked: string | null;
  isTokenSet:        boolean;
  isWebhookSet:      boolean;
  environment:       'sandbox' | 'production' | null;
}

interface TestResult {
  ok:           boolean;
  accountEmail?: string;
  environment:  string;
  message:      string;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 600,
      background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(139,0,0,0.12)',
      color:      ok ? '#10b981' : 'var(--crimson, #8B0000)',
      border: `1px solid ${ok ? 'rgba(16,185,129,0.25)' : 'rgba(139,0,0,0.25)'}`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? '#10b981' : 'var(--crimson, #8B0000)',
      }} />
      {label}
    </span>
  );
}

function EnvBadge({ env }: { env: 'sandbox' | 'production' | null }) {
  if (!env) return null;
  const isSandbox = env === 'sandbox';
  return (
    <span style={{
      padding: '0.2rem 0.6rem',
      borderRadius: '999px',
      fontSize: '0.75rem', fontWeight: 600,
      background: isSandbox ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
      color:      isSandbox ? '#f59e0b' : '#10b981',
      border: `1px solid ${isSandbox ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
    }}>
      {isSandbox ? '🧪 Sandbox' : '🚀 Produção'}
    </span>
  );
}

export default function AdminSettingsPage() {
  const { status, authFetch } = useAdminToken();

  const [config, setConfig]         = useState<PaymentsConfig | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saved, setSaved]           = useState(false);

  const [accessToken,   setAccessToken]   = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showToken,     setShowToken]     = useState(false);
  const [showSecret,    setShowSecret]    = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/admin/settings/payments`);
      if (res.ok) setConfig(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken && !webhookSecret) return;
    setSaving(true);
    setTestResult(null);
    try {
      const body: Record<string, string> = {};
      if (accessToken)   body.accessToken   = accessToken;
      if (webhookSecret) body.webhookSecret  = webhookSecret;

      const res = await authFetch(`${API_URL}/admin/settings/payments`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setConfig(await res.json());
        setAccessToken('');
        setWebhookSecret('');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await authFetch(`${API_URL}/admin/settings/payments/test`, { method: 'POST' });
      if (res.ok) setTestResult(await res.json());
    } finally {
      setTesting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '0.65rem 0.85rem',
    background: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-main)',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem', fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '0.4rem',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  if (status === 'loading' || loading) return (
    <div>
      <div className="skeleton-title" style={{ width: 280, marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.25rem' }}>Configurações</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
          Integrações e chaves de API do sistema
        </span>
      </div>

      {/* ── Mercado Pago Card ── */}
      <div style={{
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {/* Header do card */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'rgba(0,158,227,0.12)',
              border: '1px solid rgba(0,158,227,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem',
            }}>
              💳
            </div>
            <div>
              <strong style={{ display: 'block' }}>Mercado Pago</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                Pagamentos via cartão, Pix e Boleto
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {config && <EnvBadge env={config.environment} />}
            {config && (
              <StatusBadge
                ok={config.isTokenSet}
                label={config.isTokenSet ? 'Configurado' : 'Não configurado'}
              />
            )}
          </div>
        </div>

        {/* Status atual */}
        {config?.isTokenSet && (
          <div style={{
            padding: '0.875rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(201,168,76,0.04)',
            display: 'flex', gap: '2rem', flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-3)' }}>Access Token</span>
              <code style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {config.accessTokenMasked}
              </code>
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-3)' }}>Webhook Secret</span>
              <span style={{ display: 'block', marginTop: '0.1rem' }}>
                <StatusBadge ok={config.isWebhookSet} label={config.isWebhookSet ? 'Definido' : 'Não definido'} />
              </span>
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div>
            <label style={labelStyle}>Access Token</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showToken ? 'text' : 'password'}
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder={config?.isTokenSet ? 'Deixe em branco para manter o atual' : 'TEST-xxxxxxxxxxxx ou APP_USR-xxx'}
                style={{ ...inputStyle, paddingRight: '3rem' }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1rem',
                }}
                title={showToken ? 'Ocultar' : 'Mostrar'}
              >
                {showToken ? '🙈' : '👁️'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.35rem' }}>
              Encontre em{' '}
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--clay)' }}
              >
                developers.mercadopago.com → Credenciais
              </a>
            </p>
          </div>

          <div>
            <label style={labelStyle}>Webhook Secret</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecret ? 'text' : 'password'}
                value={webhookSecret}
                onChange={e => setWebhookSecret(e.target.value)}
                placeholder={config?.isWebhookSet ? 'Deixe em branco para manter o atual' : 'Chave secreta do webhook'}
                style={{ ...inputStyle, paddingRight: '3rem' }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowSecret(v => !v)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '1rem',
                }}
              >
                {showSecret ? '🙈' : '👁️'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.35rem' }}>
              Gerado em Suas integrações → Webhooks no painel MP
            </p>
          </div>

          {/* Resultado do teste */}
          {testResult && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.25)' : 'rgba(139,0,0,0.25)'}`,
              background: testResult.ok ? 'rgba(16,185,129,0.07)' : 'rgba(139,0,0,0.07)',
              fontSize: '0.875rem',
            }}>
              <strong style={{ color: testResult.ok ? '#10b981' : 'var(--crimson, #8B0000)' }}>
                {testResult.ok ? '✓ ' : '✕ '}{testResult.message}
              </strong>
              {testResult.accountEmail && (
                <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.2rem', fontSize: '0.8rem' }}>
                  Conta: {testResult.accountEmail}
                </span>
              )}
            </div>
          )}

          {saved && (
            <div style={{
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: '#10b981', fontSize: '0.875rem', fontWeight: 600,
            }}>
              ✓ Configurações salvas com sucesso!
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTest}
              disabled={testing || !config?.isTokenSet}
              style={{ fontSize: '0.875rem' }}
            >
              {testing ? 'Testando...' : '⚡ Testar Conexão'}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || (!accessToken && !webhookSecret)}
              style={{ fontSize: '0.875rem' }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
