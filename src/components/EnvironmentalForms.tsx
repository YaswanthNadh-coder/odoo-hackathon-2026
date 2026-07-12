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

  // Emission Factors CRUD fields
  const [showFactorForm, setShowFactorForm] = useState(false);
  const [editingFactorId, setEditingFactorId] = useState<string | null>(null);
  const [factorName, setFactorName] = useState('');
  const [factorUnit, setFactorUnit] = useState('');
  const [factorValue, setFactorValue] = useState('');

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');

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

  // Save Emission Factor
  const handleSaveFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorName || !factorUnit || !factorValue || isNaN(parseFloat(factorValue))) {
      setErrorMessage('Please provide name, unit and a valid numeric CO2e coefficient.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/environmental/factors';
    const method = editingFactorId ? 'PUT' : 'POST';
    const body = {
      id: editingFactorId,
      name: factorName,
      unit: factorUnit,
      co2eValue: parseFloat(factorValue),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingFactorId ? 'Emission Factor updated successfully!' : 'New Emission Factor created!');
        resetFactorForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save factor.');
      }
    } catch (err) {
      setErrorMessage('Error saving emission factor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditFactorClick = (f: EmissionFactor) => {
    setEditingFactorId(f.id);
    setFactorName(f.name);
    setFactorUnit(f.unit);
    setFactorValue(f.co2eValue.toString());
    setShowFactorForm(true);
  };

  const handleDeleteFactor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this factor? This will delete all carbon transaction logs calculated using this factor.')) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/environmental/factors?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Emission Factor deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete factor.');
      }
    } catch (err) {
      setErrorMessage('Error deleting factor.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFactorForm = () => {
    setEditingFactorId(null);
    setFactorName('');
    setFactorUnit('');
    setFactorValue('');
    setShowFactorForm(false);
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

      {/* Configure Emission Factors Panel (CRUD for Factors) */}
      {isOfficerOrManager && (
        <div className="glass-card">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Configure Carbon Emission Factors</h3>
            {!showFactorForm && (
              <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setShowFactorForm(true)}>
                ➕ Add Factor
              </button>
            )}
          </div>

          {/* Factor Create / Edit form */}
          {showFactorForm && (
            <form onSubmit={handleSaveFactor} style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glow)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem' }}>{editingFactorId ? '✏️ Edit Emission Factor' : '➕ Create Emission Factor'}</h4>
              <div className="grid-cols-3" style={{ gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Factor Name</label>
                  <input type="text" className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="e.g. Solar Electricity" value={factorName} onChange={(e) => setFactorName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Unit of Measure</label>
                  <input type="text" className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="e.g. kWh or Liters" value={factorUnit} onChange={(e) => setFactorUnit(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>t CO2e per Unit</label>
                  <input type="number" className="form-input" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} placeholder="e.g. 0.00045" value={factorValue} onChange={(e) => setFactorValue(e.target.value)} step="any" min="0" required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={resetFactorForm}>Cancel</button>
                <button type="submit" className="btn btn-env" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} disabled={isLoading}>Save Factor</button>
              </div>
            </form>
          )}

          {/* Factors List Grid */}
          <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
            {factors.map((f) => (
              <div key={f.id} style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{f.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    1 {f.unit} = {f.co2eValue.toFixed(6)} t CO2e
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleEditFactorClick(f)}>
                    ✏️
                  </button>
                  <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleDeleteFactor(f.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
