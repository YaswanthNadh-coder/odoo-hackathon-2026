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

interface SpendingRecord {
  id: string;
  type: string;
  description: string;
  amount: number;
  quantity: number;
  departmentCode: string;
  date: string;
}

interface EnvironmentalFormsProps {
  departments: Department[];
  factors: EmissionFactor[];
  autoEmissionCalcEnabled: boolean;
  spendings: SpendingRecord[];
  currentUser: {
    role: string;
    departmentId: string;
  } | null;
}

export default function EnvironmentalForms({
  departments,
  factors,
  autoEmissionCalcEnabled,
  spendings,
  currentUser,
}: EnvironmentalFormsProps) {
  const router = useRouter();
  const [selectedDeptId, setSelectedDeptId] = useState(currentUser?.departmentId || departments[0]?.id || '');
  const [selectedFactorId, setSelectedFactorId] = useState(factors[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Spending Form states
  const [spendingType, setSpendingType] = useState('fleet');
  const [spendingDesc, setSpendingDesc] = useState('');
  const [spendingAmount, setSpendingAmount] = useState('');
  const [spendingQty, setSpendingQty] = useState('');
  const [spendingDeptId, setSpendingDeptId] = useState(currentUser?.departmentId || departments[0]?.id || '');

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

      if (res.ok) {
        setSuccessMessage('Carbon transaction logged successfully!');
        setQuantity('');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to log transaction.');
      }
    } catch {
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
    } catch {
      setErrorMessage('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating Spending Record
  const handleCreateSpending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spendingDesc || !spendingAmount || !spendingQty || isNaN(parseFloat(spendingAmount)) || isNaN(parseFloat(spendingQty))) {
      setErrorMessage('Please fill in all spending fields with valid numbers.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/environmental/spending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: spendingType,
          description: spendingDesc,
          amount: parseFloat(spendingAmount),
          quantity: parseFloat(spendingQty),
          departmentId: spendingDeptId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.autoTransactionCreated) {
          setSuccessMessage(`Spending logged! Auto Emission Calculation enabled: Generated +${data.autoTransactionCreated.co2eTotal} t CO2e transaction.`);
        } else {
          setSuccessMessage('Spending record logged successfully (Auto-emission calculation is disabled).');
        }
        setSpendingDesc('');
        setSpendingAmount('');
        setSpendingQty('');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to log spending.');
      }
    } catch {
      setErrorMessage('Unexpected error logging spending.');
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
    } catch {
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
    } catch {
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

  // --- Real-time Spending Chart Logic ---
  const spendSummary = spendings.reduce((acc, sp) => {
    acc[sp.type] = (acc[sp.type] || 0) + sp.amount;
    return acc;
  }, {} as Record<string, number>);

  const categories = [
    { type: 'fleet', name: 'Fleet Diesel', color: '#10b981' },
    { type: 'manufacturing', name: 'Factory Power', color: '#3b82f6' },
    { type: 'expense', name: 'Flight Travel', color: '#f59e0b' },
    { type: 'purchase', name: 'Office Supply', color: '#8b5cf6' },
  ];

  const totalSpendAmount = categories.reduce((sum, cat) => sum + (spendSummary[cat.type] || 0), 0);
  const maxSpendAmount = Math.max(...categories.map((cat) => spendSummary[cat.type] || 0), 100);

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

      {/* Grid: Forms & Live Spending Chart */}
      <div className="grid-cols-2" style={{ gap: '1.5rem' }}>
        
        {/* Left Side: Dynamic Logging Form */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {autoEmissionCalcEnabled ? (
            // Log Operations Spending (Auto emission generation)
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>💸 Log Operations Spending</h3>
              <form onSubmit={handleCreateSpending} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Operational Category</label>
                  <select className="form-select" value={spendingType} onChange={(e) => setSpendingType(e.target.value)}>
                    <option value="fleet">Fleet Diesel (Liters)</option>
                    <option value="manufacturing">Factory Electricity Grid (kWh)</option>
                    <option value="expense">Executive Flight Travel (Pax-km)</option>
                    <option value="purchase">Office Materials Procurement (USD)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Invoice</label>
                  <input type="text" className="form-input" placeholder="e.g. Q3 Fleet Fuel Ingest" value={spendingDesc} onChange={(e) => setSpendingDesc(e.target.value)} required />
                </div>

                <div className="grid-cols-2" style={{ gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Spending (USD)</label>
                    <input type="number" className="form-input" placeholder="$ amount" value={spendingAmount} onChange={(e) => setSpendingAmount(e.target.value)} required min="1" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Usage Quantity</label>
                    <input type="number" className="form-input" placeholder="Liters, kWh, etc" value={spendingQty} onChange={(e) => setSpendingQty(e.target.value)} required min="1" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Department Owner</label>
                  <select className="form-select" value={spendingDeptId} onChange={(e) => setSpendingDeptId(e.target.value)}>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="btn btn-env" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isLoading}>
                  {isLoading ? 'Processing Invoice...' : '💾 Log Spending Invoice'}
                </button>
              </form>
            </div>
          ) : (
            // Manual Carbon Footprint Log
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Log Carbon Footprint Receipts</h3>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Department Scope</label>
                  <select className="form-select" value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Emission Category Factor</label>
                  <select className="form-select" value={selectedFactorId} onChange={(e) => setSelectedFactorId(e.target.value)}>
                    {factors.map((fac) => (
                      <option key={fac.id} value={fac.id}>{fac.name} ({fac.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Usage / Ingest Volume ({selectedFactor?.unit})</label>
                  <input type="number" className="form-input" placeholder={`e.g. 500 ${selectedFactor?.unit || ''}`} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </div>

                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🧮 Projected Emissions: <strong style={{ color: 'var(--text-primary)' }}>{((parseFloat(quantity) || 0) * (selectedFactor?.co2eValue || 0)).toFixed(3)} tonnes CO2e</strong>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
                  {isLoading ? 'Saving Receipt...' : '🚀 Log Carbon Footprint'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Side: Real-Time SVG Spending Allocation Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '1.1rem' }}>💰 Spend Analysis allocation</h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-gov)' }}>
              Total: ${totalSpendAmount.toLocaleString()}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
            Real-time financial layout across departments and asset logs.
          </p>

          {/* SVG Bar Chart */}
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="160" viewBox="0 0 320 160" style={{ overflow: 'visible' }}>
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1="40" y1="70" x2="300" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1="40" y1="120" x2="300" y2="120" stroke="rgba(255,255,255,0.08)" />

              {/* Rendering Bar Columns */}
              {categories.map((cat, idx) => {
                const amount = spendSummary[cat.type] || 0;
                const barHeight = (amount / maxSpendAmount) * 100;
                const colX = 50 + idx * 65;
                const barY = 120 - barHeight;

                return (
                  <g key={cat.type}>
                    {/* Shadow/Glow under bar */}
                    <rect x={colX} y={barY} width="35" height={barHeight} fill={cat.color} opacity="0.15" rx="3" />
                    
                    {/* Active Bar */}
                    <rect x={colX} y={barY} width="35" height={barHeight} fill={cat.color} rx="3" />

                    {/* Numeric Value */}
                    <text x={colX + 17.5} y={barY - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="700">
                      ${amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}
                    </text>

                    {/* X Axis Label */}
                    <text x={colX + 17.5} y="135" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontWeight="600">
                      {cat.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* Y Axis line */}
              <line x1="40" y1="10" x2="40" y2="120" stroke="rgba(255,255,255,0.08)" />
            </svg>
          </div>
        </div>

      </div>

      {/* Row 2: Emission Factors Configuration */}
      <div className="glass-card">
        <div className="flex-between" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>🔧 Emission Factors Settings</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
              Set global CO2e coefficients to determine metric tonnes generated.
            </p>
          </div>
          {isOfficerOrManager && (
            <button className="btn btn-secondary" onClick={() => (showFactorForm ? resetFactorForm() : setShowFactorForm(true))}>
              {showFactorForm ? '✕ Close Form' : '➕ Add Factor'}
            </button>
          )}
        </div>

        {showFactorForm && isOfficerOrManager && (
          <div className="glass-card mb-6" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glow)' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '1rem', fontWeight: 600 }}>
              {editingFactorId ? '✏️ Edit Emission Factor' : '➕ Create New Emission Factor'}
            </h4>
            <form onSubmit={handleSaveFactor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-cols-3" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Factor Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Natural Gas" value={factorName} onChange={(e) => setFactorName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Calculation Unit</label>
                  <input type="text" className="form-input" placeholder="e.g. Therms" value={factorUnit} onChange={(e) => setFactorUnit(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">CO2e Value (tonnes per unit)</label>
                  <input type="number" step="0.00001" className="form-input" placeholder="e.g. 0.0053" value={factorValue} onChange={(e) => setFactorValue(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={resetFactorForm}>Cancel</button>
                <button type="submit" className="btn btn-env" disabled={isLoading}>💾 Save Factor</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Emission Factor Name</th>
                <th>Measurement Unit</th>
                <th>CO2e Coefficient Value</th>
                {isOfficerOrManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {factors.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td><span className="pill pill-info">{f.unit}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--accent-overall)' }}>{f.co2eValue} t CO2e</td>
                  {isOfficerOrManager && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleEditFactorClick(f)}>✏️ Edit</button>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderLeft: '3px solid #ef4444' }} onClick={() => handleDeleteFactor(f.id)}>🗑️ Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
