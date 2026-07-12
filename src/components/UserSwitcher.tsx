'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UserSession {
  employeeId: string;
  name: string;
  role: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
}

interface UserSwitcherProps {
  session: UserSession;
}

export default function UserSwitcher({ session }: UserSwitcherProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const roleEmoji = session.role === 'officer' ? '🛡️' : session.role === 'manager' ? '💼' : '👤';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.825rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>{roleEmoji}</span>
          <span>{session.name}</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {session.role.toUpperCase()} ({session.departmentCode})
        </span>
      </div>
      <button 
        className="btn btn-secondary" 
        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderLeft: '3px solid #ef4444' }} 
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? 'Signing out...' : '🚪 Logout'}
      </button>
    </div>
  );
}
