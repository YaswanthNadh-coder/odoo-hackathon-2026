'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDate } from '@/lib/date';

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

interface EnvironmentalGoal {
  id: string;
  title: string;
  description: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  departmentId: string;
  department: {
    name: string;
    code: string;
  };
  status: string;
  targetDate: string;
}

interface ProductESGProfile {
  id: string;
  name: string;
  sku: string;
  carbonFootprint: number;
  materialSource: string | null;
  recyclingRate: number;
  status: string;
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
  goals: EnvironmentalGoal[];
  products: ProductESGProfile[];
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
  goals,
  products,
  autoEmissionCalcEnabled,
  spendings,
  currentUser,
}: EnvironmentalFormsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'carbon' | 'goals' | 'products'>('carbon');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ----------------------------------------------------
  // CARBON LOGGING & FACTORS STATE
  // ----------------------------------------------------
  const [selectedDeptId, setSelectedDeptId] = useState(currentUser?.departmentId || departments[0]?.id || '');
  const [selectedFactorId, setSelectedFactorId] = useState(factors[0]?.id || '');
  const [quantity, setQuantity] = useState('');

  // Spending Form states
  const [spendingType, setSpendingType] = useState('fleet');
  const [spendingDesc, setSpendingDesc] = useState('');
  const [spendingAmount, setSpendingAmount] = useState('');
  const [spendingQty, setSpendingQty] = useState('');
  const [spendingDeptId, setSpendingDeptId] = useState(currentUser?.departmentId || departments[0]?.id || '');
  const [showFactorForm, setShowFactorForm] = useState(false);
  const [editingFactorId, setEditingFactorId] = useState<string | null>(null);
  const [factorName, setFactorName] = useState('');
  const [factorUnit, setFactorUnit] = useState('');
  const [factorValue, setFactorValue] = useState('');

  // ----------------------------------------------------
  // SUSTAINABILITY GOALS STATE
  // ----------------------------------------------------
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTargetValue, setGoalTargetValue] = useState('');
  const [goalCurrentValue, setGoalCurrentValue] = useState('0');
  const [goalUnit, setGoalUnit] = useState('t CO2e');
  const [goalDeptId, setGoalDeptId] = useState(departments[0]?.id || '');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalStatus, setGoalStatus] = useState('active');

  // Inline current value updating state
  const [updatingGoalValueId, setUpdatingGoalValueId] = useState<string | null>(null);
  const [inlineGoalValue, setInlineGoalValue] = useState('');

  // ----------------------------------------------------
  // PRODUCT ESG PROFILES STATE
  // ----------------------------------------------------
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productCarbon, setProductCarbon] = useState('');
  const [productMaterial, setProductMaterial] = useState('');
  const [productRecycling, setProductRecycling] = useState('0');
  const [productStatus, setProductStatus] = useState('active');

  const isOfficerOrManager = currentUser && (currentUser.role === 'officer' || currentUser.role === 'manager');

  // ----------------------------------------------------
  // CARBON ACTIONS
  // ----------------------------------------------------
  const handleSubmitCarbon = async (e: React.FormEvent) => {
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

  // ----------------------------------------------------
  // EMISSION FACTOR CRUD ACTIONS
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // GOAL ACTIONS
  // ----------------------------------------------------
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalTargetValue || !goalUnit || !goalDeptId || !goalTargetDate) {
      setErrorMessage('Please fill in all required goal fields.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/environmental/goals';
    const method = editingGoalId ? 'PUT' : 'POST';
    const body = {
      id: editingGoalId,
      title: goalTitle,
      description: goalDesc,
      targetValue: parseFloat(goalTargetValue),
      currentValue: parseFloat(goalCurrentValue),
      unit: goalUnit,
      departmentId: goalDeptId,
      targetDate: goalTargetDate,
      status: goalStatus,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingGoalId ? 'Sustainability Goal updated!' : 'New Sustainability Goal created!');
        resetGoalForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save goal.');
      }
    } catch (err) {
      setErrorMessage('Error saving sustainability goal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditGoalClick = (g: EnvironmentalGoal) => {
    setEditingGoalId(g.id);
    setGoalTitle(g.title);
    setGoalDesc(g.description || '');
    setGoalTargetValue(g.targetValue.toString());
    setGoalCurrentValue(g.currentValue.toString());
    setGoalUnit(g.unit);
    setGoalDeptId(g.departmentId);
    setGoalTargetDate(g.targetDate.split('T')[0]);
    setGoalStatus(g.status);
    setShowGoalForm(true);
  };

  const handleUpdateInlineGoalValue = async (id: string) => {
    if (isNaN(parseFloat(inlineGoalValue))) {
      alert('Please enter a valid number.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/environmental/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          currentValue: parseFloat(inlineGoalValue),
        }),
      });

      if (res.ok) {
        setSuccessMessage('Goal progress updated successfully.');
        setUpdatingGoalValueId(null);
        setInlineGoalValue('');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to update goal progress.');
      }
    } catch (err) {
      setErrorMessage('Error updating progress.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sustainability target goal?')) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/environmental/goals?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Goal deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete goal.');
      }
    } catch (err) {
      setErrorMessage('Error deleting goal.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetGoalForm = () => {
    setEditingGoalId(null);
    setGoalTitle('');
    setGoalDesc('');
    setGoalTargetValue('');
    setGoalCurrentValue('0');
    setGoalUnit('t CO2e');
    setGoalDeptId(departments[0]?.id || '');
    setGoalTargetDate('');
    setGoalStatus('active');
    setShowGoalForm(false);
  };

  // ----------------------------------------------------
  // PRODUCT ACTIONS
  // ----------------------------------------------------
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productSku || !productCarbon) {
      setErrorMessage('Please fill in name, SKU, and carbon footprint for the product.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const url = '/api/products';
    const method = editingProductId ? 'PUT' : 'POST';
    const body = {
      id: editingProductId,
      name: productName,
      sku: productSku,
      carbonFootprint: parseFloat(productCarbon),
      materialSource: productMaterial,
      recyclingRate: parseFloat(productRecycling),
      status: productStatus,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccessMessage(editingProductId ? 'Product ESG Profile updated!' : 'New Product ESG Profile added!');
        resetProductForm();
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to save product profile.');
      }
    } catch (err) {
      setErrorMessage('Error saving product profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProductClick = (p: ProductESGProfile) => {
    setEditingProductId(p.id);
    setProductName(p.name);
    setProductSku(p.sku);
    setProductCarbon(p.carbonFootprint.toString());
    setProductMaterial(p.materialSource || '');
    setProductRecycling(p.recyclingRate.toString());
    setProductStatus(p.status);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product profile?')) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage('Product ESG Profile deleted successfully.');
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete product.');
      }
    } catch (err) {
      setErrorMessage('Error deleting product.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProductName('');
    setProductSku('');
    setProductCarbon('');
    setProductMaterial('');
    setProductRecycling('0');
    setProductStatus('active');
    setShowProductForm(false);
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

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'carbon' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('carbon')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          ✍️ Carbon Accounting
        </button>
        <button
          className={`btn ${activeTab === 'goals' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('goals')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          🎯 Sustainability Goals
        </button>
        <button
          className={`btn ${activeTab === 'products' ? 'btn-env' : 'btn-secondary'}`}
          onClick={() => setActiveTab('products')}
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
        >
          📦 Product ESG Profiles
        </button>
      </div>

      {/* ----------------------------------------------------
          TAB 1: CARBON ACCOUNTING
          ---------------------------------------------------- */}
      {activeTab === 'carbon' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

          {/* 2-Column Grid: Left: Logging Forms, Right: Spend Chart */}
          <div className="grid-cols-2" style={{ gap: '1.5rem' }}>
            
            {/* Left Column: Logging Form */}
            <div>
              {autoEmissionCalcEnabled ? (
                /* Log Operations Spending Form (which generates carbon transactions) */
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>💸 Log Operations Spending</h3>
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button type="submit" className="btn btn-env" style={{ width: '100%' }} disabled={isLoading}>
                        {isLoading ? 'Saving...' : '💾 Log Operations Spending'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Manual Carbon Footprint Entry Form */
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Log Carbon Footprint Receipts</h3>
                  <form onSubmit={handleSubmitCarbon} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

            {/* Right Column: Real-Time SVG Spending Allocation Chart */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="flex-between">
                <h3 style={{ fontSize: '1.1rem' }}>💰 Spend Analysis allocation</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-overall)' }}>
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
      )}

      {/* ----------------------------------------------------
          TAB 2: SUSTAINABILITY GOALS
          ---------------------------------------------------- */}
      {activeTab === 'goals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '1.25rem' }}>Department Sustainability Goals</h3>
            {isOfficerOrManager && !showGoalForm && (
              <button className="btn btn-env" onClick={() => setShowGoalForm(true)}>
                ➕ Create Goal Target
              </button>
            )}
          </div>

          {/* Goal Create / Edit Form */}
          {showGoalForm && isOfficerOrManager && (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-env)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                {editingGoalId ? '✏️ Edit Sustainability Target' : '➕ Establish Sustainability Target'}
              </h3>
              <form onSubmit={handleSaveGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Goal Title</label>
                    <input type="text" className="form-input" placeholder="e.g. 20% Carbon Footprint Reduction" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Department</label>
                    <select className="form-select" value={goalDeptId} onChange={(e) => setGoalDeptId(e.target.value)}>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-cols-3" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Target Value</label>
                    <input type="number" className="form-input" placeholder="e.g. 50" value={goalTargetValue} onChange={(e) => setGoalTargetValue(e.target.value)} step="any" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Progress Value</label>
                    <input type="number" className="form-input" placeholder="e.g. 10" value={goalCurrentValue} onChange={(e) => setGoalCurrentValue(e.target.value)} step="any" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <input type="text" className="form-input" placeholder="e.g. t CO2e or kWh" value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} required />
                  </div>
                </div>

                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Target Completion Date</label>
                    <input type="date" className="form-input" value={goalTargetDate} onChange={(e) => setGoalTargetDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Goal Status</label>
                    <select className="form-select" value={goalStatus} onChange={(e) => setGoalStatus(e.target.value)}>
                      <option value="active">Active</option>
                      <option value="achieved">Achieved (Success)</option>
                      <option value="failed">Failed</option>
                      <option value="inactive">Suspended / Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Scope Details</label>
                  <textarea className="form-textarea" rows={3} placeholder="Describe the sustainability targets..." value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={resetGoalForm}>Cancel</button>
                  <button type="submit" className="btn btn-env" disabled={isLoading}>💾 Save Goal Target</button>
                </div>
              </form>
            </div>
          )}

          {/* Goals List Grid */}
          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            {goals.map((g) => {
              const percent = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
              const isAchieved = g.status === 'achieved';
              const isFailed = g.status === 'failed';
              const barColor = isAchieved ? '#10b981' : isFailed ? '#ef4444' : 'var(--accent-overall)';

              return (
                <div key={g.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: `4px solid ${barColor}` }}>
                  <div className="flex-between">
                    <div>
                      <span className="pill pill-success" style={{ fontSize: '0.65rem' }}>{g.department.code} Target</span>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.25rem' }}>{g.title}</h4>
                    </div>
                    <span className={`pill ${isAchieved ? 'pill-success' : isFailed ? 'pill-error' : 'pill-warning'}`} style={{ fontSize: '0.65rem' }}>
                      {g.status.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexGrow: 1 }}>{g.description || 'No target description.'}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                    <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                      <span>Progress: <strong>{g.currentValue} / {g.targetValue} {g.unit}</strong></span>
                      <span>{percent.toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, percent)}%`, height: '100%', background: barColor, borderRadius: '3px' }} />
                    </div>
                  </div>

                  <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span>Target Date: <strong>{formatDate(g.targetDate)}</strong></span>
                    {isOfficerOrManager && (
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        {updatingGoalValueId === g.id ? (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '70px', padding: '0.15rem 0.3rem', fontSize: '0.75rem' }}
                              value={inlineGoalValue}
                              onChange={(e) => setInlineGoalValue(e.target.value)}
                              placeholder="Value"
                            />
                            <button className="btn btn-env" style={{ padding: '0.15rem 0.3rem', fontSize: '0.75rem' }} onClick={() => handleUpdateInlineGoalValue(g.id)}>✓</button>
                            <button className="btn btn-secondary" style={{ padding: '0.15rem 0.3rem', fontSize: '0.75rem' }} onClick={() => setUpdatingGoalValueId(null)}>✕</button>
                          </div>
                        ) : (
                          <>
                            <button className="btn" style={{ padding: '0.15rem 0.3rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }} onClick={() => { setUpdatingGoalValueId(g.id); setInlineGoalValue(g.currentValue.toString()); }}>
                              ✏️ Update Progress
                            </button>
                            <button className="btn" style={{ padding: '0.15rem', background: 'transparent' }} onClick={() => handleEditGoalClick(g)}>⚙️</button>
                            <button className="btn" style={{ padding: '0.15rem', background: 'transparent' }} onClick={() => handleDeleteGoal(g.id)}>🗑️</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No active sustainability goals defined.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: PRODUCT ESG PROFILES
          ---------------------------------------------------- */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '1.25rem' }}>Product ESG Information Logs</h3>
            {isOfficerOrManager && !showProductForm && (
              <button className="btn btn-env" onClick={() => setShowProductForm(true)}>
                ➕ Add Product Profile
              </button>
            )}
          </div>

          {/* Product Create / Edit Form */}
          {showProductForm && isOfficerOrManager && (
            <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-overall)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                {editingProductId ? '✏️ Edit Product ESG Profile' : '➕ Register Product ESG Profile'}
              </h3>
              <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Product Name</label>
                    <input type="text" className="form-input" placeholder="e.g. Eco Travel Mug v2" value={productName} onChange={(e) => setProductName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU Code</label>
                    <input type="text" className="form-input" placeholder="e.g. SKU-ECO-123" value={productSku} onChange={(e) => setProductSku(e.target.value)} required />
                  </div>
                </div>

                <div className="grid-cols-3" style={{ gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Carbon Footprint (t CO2e per unit)</label>
                    <input type="number" className="form-input" placeholder="e.g. 0.045" value={productCarbon} onChange={(e) => setProductCarbon(e.target.value)} step="any" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recycled Content Rate (%)</label>
                    <input type="number" className="form-input" placeholder="e.g. 85" value={productRecycling} onChange={(e) => setProductRecycling(e.target.value)} min="0" max="100" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Product Status</label>
                    <select className="form-select" value={productStatus} onChange={(e) => setProductStatus(e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Material Sources</label>
                  <input type="text" className="form-input" placeholder="e.g. Recycled Bamboo Fiber, Organic Rubber Seals" value={productMaterial} onChange={(e) => setProductMaterial(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={resetProductForm}>Cancel</button>
                  <button type="submit" className="btn btn-env" disabled={isLoading}>💾 Save Product ESG Profile</button>
                </div>
              </form>
            </div>
          )}

          {/* Products Grid */}
          <div className="grid-cols-2" style={{ gap: '1rem' }}>
            {products.map((p) => {
              const active = p.status === 'active';
              return (
                <div key={p.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: active ? 1 : 0.6 }}>
                  <div className="flex-between">
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: <strong>{p.sku}</strong></span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className={`pill ${active ? 'pill-success' : 'pill-error'}`} style={{ fontSize: '0.65rem' }}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                    <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>CO2e Footprint:</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-env)' }}>{p.carbonFootprint.toFixed(4)} t CO2e / unit</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Recycling Content Rate:</span>
                      <span style={{ fontWeight: 600 }}>{p.recyclingRate}%</span>
                    </div>
                    {p.materialSource && (
                      <div className="flex-between" style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Primary Materials:</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>{p.materialSource}</span>
                      </div>
                    )}
                  </div>

                  {isOfficerOrManager && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleEditProductClick(p)}>✏️ Edit Profile</button>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderLeft: '3px solid #ef4444' }} onClick={() => handleDeleteProduct(p.id)}>🗑️ Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
            {products.length === 0 && (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No product ESG profiles defined.
              </div>
            )}
          </div>
        </div>
      )}

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
