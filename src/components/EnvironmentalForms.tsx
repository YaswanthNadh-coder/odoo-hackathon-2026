'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface EmissionFactor {
  id: string;
  name: string;
  unit: string;
  co2eValue: number;
}

interface EnvironmentalFormsProps {
  departments: Department[];
  factors: EmissionFactor[];
  autoEmissionCalcEnabled: boolean;
  currentUser: {
    role: string;
    departmentId: string;
  } | null;
}

export default function EnvironmentalForms({
  departments,
  factors,
  autoEmissionCalcEnabled,
  currentUser,
}: EnvironmentalFormsProps) {
  const router = useRouter();
  const [selectedDeptId, setSelectedDeptId] = useState(currentUser?.departmentId || departments[0]?.id || '');
  const [selectedFactorId, setSelectedFactorId] = useState(factors[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle manual transaction submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      setErrorMessage('Please enter a valid positive quantity.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/environmental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: selectedDeptId,
          emissionFactorId: selectedFactorId,
          quantity: parseFloat(quantity),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Carbon transaction logged successfully!');
        setQuantity('');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to log transaction.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle auto-ingestion from simulated ERP
  const handleAutoIngest = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/environmental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-ingest' }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`ERP Sync Complete! Automatically ingested ${data.count} transaction logs.`);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to ingest ERP data.');
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFactor = factors.find((f) => f.id === selectedFactorId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Banner */}
      {errorMessage && (
        <div className="pill pill-error" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start' }}>
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="pill pill-success" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', textTransform: 'none', justifyContent: 'flex-start' }}>
          ✅ {successMessage}
        </div>
      )}

      {/* Mode Switcher Banner based on Settings configuration */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: autoEmissionCalcEnabled ? '4px solid var(--accent-overall)' : '4px solid var(--accent-gov)' }}>
        <div style={{ fontSize: '1.5rem' }}>{autoEmissionCalcEnabled ? '🤖' : '✍️'}</div>
        <div style={{ flexGrow: 1 }}>
          <h4 style={{ fontSize: '1rem' }}>
            {autoEmissionCalcEnabled ? 'Automated ERP Carbon Calculation' : 'Manual Carbon Transactions Logging'}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {autoEmissionCalcEnabled
              ? 'EcoSphere is connected directly to simulated daily business logs (Fleet/Manufacturing/Purchase).'
              : 'Logging is configured to manual mode. Please submit operational receipts details.'}
          </p>
        </div>
        {autoEmissionCalcEnabled && (
          <button className="btn btn-primary" onClick={handleAutoIngest} disabled={isLoading}>
            🔄 Sync ERP Logs
          </button>
        )}
      </div>

      {/* Manual Entry Form - Disabled if auto is active, but still visible to review */}
      {!autoEmissionCalcEnabled && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Log Carbon Footprint Receipts</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-cols-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Department Scope</label>
                <select
                  className="form-select"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Emission Category Factor</label>
                <select
                  className="form-select"
                  value={selectedFactorId}
                  onChange={(e) => setSelectedFactorId(e.target.value)}
                >
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (per {f.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity Consumed ({selectedFactor?.unit || 'Units'})</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input
                  type="number"
                  className="form-input"
                  style={{ flexGrow: 1 }}
                  placeholder="e.g. 1500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0.001"
                  step="any"
                  required
                />
                <button type="submit" className="btn btn-env" disabled={isLoading}>
                  {isLoading ? 'Saving...' : '💾 Log Carbon Data'}
                </button>
              </div>
            </div>
            {selectedFactor && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Factor calculation: 1 {selectedFactor.unit} = {selectedFactor.co2eValue} t CO2e
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
