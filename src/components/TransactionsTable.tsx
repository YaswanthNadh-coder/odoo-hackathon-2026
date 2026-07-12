'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDateTime } from '@/lib/date';

interface Transaction {
  id: string;
  date: string;
  quantity: number;
  co2eTotal: number;
  source: string;
  department: {
    name: string;
    code: string;
  };
  emissionFactor: {
    name: string;
    unit: string;
  };
}

interface TransactionsTableProps {
  transactions: Transaction[];
  isOfficerOrManager: boolean;
}

export default function TransactionsTable({
  transactions,
  isOfficerOrManager,
}: TransactionsTableProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this carbon transaction record?')) {
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch(`/api/environmental?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete transaction log.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditQty(tx.quantity.toString());
  };

  const handleSaveEdit = async (id: string) => {
    if (!editQty || isNaN(parseFloat(editQty)) || parseFloat(editQty) <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch('/api/environmental', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: parseFloat(editQty) }),
      });
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        alert('Failed to save changes.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="table-container">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Department</th>
            <th>Source Category</th>
            <th>Quantity</th>
            <th>Total Emissions</th>
            <th>Source</th>
            {isOfficerOrManager && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td style={{ fontSize: '0.85rem' }}>
                {formatDateTime(tx.date)}
              </td>
              <td style={{ fontWeight: 600 }}>{tx.department.name}</td>
              <td>
                {tx.emissionFactor.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({tx.emissionFactor.unit})</span>
              </td>
              <td>
                {editingId === tx.id ? (
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '90px', padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    step="any"
                    required
                  />
                ) : (
                  tx.quantity
                )}
              </td>
              <td style={{ fontWeight: 700, color: 'var(--accent-env)' }}>
                {tx.co2eTotal.toFixed(3)} t CO2e
              </td>
              <td>
                {tx.source.startsWith('auto') ? (
                  <span className="pill pill-info" style={{ fontSize: '0.65rem' }}>🤖 ERP Sync</span>
                ) : (
                  <span className="pill pill-warning" style={{ fontSize: '0.65rem' }}>✍️ Manual</span>
                )}
              </td>
              {isOfficerOrManager && (
                <td>
                  {editingId === tx.id ? (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-env" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleSaveEdit(tx.id)} disabled={submitting}>
                        Save
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleEditClick(tx)} disabled={submitting}>
                        ✏️
                      </button>
                      <button className="btn" style={{ padding: '0.25rem', background: 'transparent' }} onClick={() => handleDelete(tx.id)} disabled={submitting}>
                        🗑️
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan={isOfficerOrManager ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                No carbon transactions logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
