'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const DEMO_ACCOUNTS = [
  { name: 'Alice Johnson', role: 'Employee (R&D)', email: 'alice@ecosphere.com', password: 'alice123', icon: '🌱' },
  { name: 'Elena Rostova', role: 'Department Manager (Corporate)', email: 'elena@ecosphere.com', password: 'elena123', icon: '💼' },
  { name: 'Marcus Vance', role: 'Compliance Officer (Corporate)', email: 'marcus@ecosphere.com', password: 'marcus123', icon: '🛡️' },
  { name: 'John Doe', role: 'Employee (Logistics)', email: 'john@ecosphere.com', password: 'john123', icon: '📦' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent, customCreds?: typeof DEMO_ACCOUNTS[0]) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const loginEmail = customCreds ? customCreds.email : email;
    const loginPassword = customCreds ? customCreds.password : password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        // Successful login, redirect to dashboard
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 50%, #030712 0%, #000000 100%)',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glowing ambient blobs */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)',
        filter: 'blur(50px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '500px', zIndex: 1 }}>
        
        {/* Branding header */}
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-overall) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.05em'
          }}>
            🍀 EcoSphere
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Enterprise ESG Management & Gamified Compliance Platform
          </p>
        </div>

        {/* Login form card */}
        <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontWeight: 700 }}>Sign In</h3>

          {error && (
            <div className="pill pill-error" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start', marginBottom: '1.25rem' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Corporate Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. alice@ecosphere.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo profiles quick login */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255, 255, 255, 0.05)' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            ⚡ Hackathon Quick Login Selectors
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {DEMO_ACCOUNTS.map((account, idx) => (
              <div
                key={idx}
                onClick={() => !loading && handleLogin(undefined, account)}
                style={{
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  transition: 'all 0.2s ease'
                }}
                className="btn-secondary-hover" // We can style hover in globals or style attribute
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-overall)';
                  e.currentTarget.style.background = 'rgba(6, 182, 212, 0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{account.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{account.name}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{account.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
