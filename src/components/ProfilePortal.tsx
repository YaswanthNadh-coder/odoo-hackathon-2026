'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProfilePortalProps {
  employee: {
    id: string;
    name: string;
    email: string;
    gender: string;
    ethnicity: string;
    department: {
      name: string;
    };
  };
}

const GENDER_OPTIONS = [
  'Prefer not to say',
  'Male',
  'Female',
  'Non-Binary',
  'Other'
];

const ETHNICITY_OPTIONS = [
  'Prefer not to say',
  'Asian',
  'Black',
  'Hispanic',
  'White',
  'Two or more races',
  'Other'
];

export default function ProfilePortal({ employee }: ProfilePortalProps) {
  const router = useRouter();
  const [gender, setGender] = useState(employee.gender);
  const [ethnicity, setEthnicity] = useState(employee.ethnicity);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender, ethnicity }),
      });

      if (res.ok) {
        setSuccessMsg('Profile updated successfully!');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to update profile.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Personal Information</h3>

      {successMsg && (
        <div className="pill pill-success" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start', marginBottom: '1rem' }}>
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="pill pill-error" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start', marginBottom: '1rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" className="form-input" value={employee.name} disabled style={{ opacity: 0.7 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="text" className="form-input" value={employee.email} disabled style={{ opacity: 0.7 }} />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Department</label>
          <input type="text" className="form-input" value={employee.department.name} disabled style={{ opacity: 0.7 }} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-glow)', margin: '0.5rem 0' }} />
        <h4 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Diversity & Inclusion Metrics</h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          This information is kept confidential and only used for aggregate corporate diversity reporting on the Social Dashboard.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Gender</label>
            <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
              {GENDER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Ethnicity</label>
            <select className="form-select" value={ethnicity} onChange={(e) => setEthnicity(e.target.value)}>
              {ETHNICITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : '💾 Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
