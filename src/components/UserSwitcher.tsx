'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: {
    name: string;
    code: string;
  };
}

interface UserSwitcherProps {
  currentEmployeeId: string;
  employees: Employee[];
}

export default function UserSwitcher({ currentEmployeeId, employees }: UserSwitcherProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(currentEmployeeId);
  const [isPending, startTransition] = useTransition();

  const handleSwitch = async (employeeId: string) => {
    setSelectedId(employeeId);
    
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId }),
      });

      if (res.ok) {
        // Trigger server components to re-run and fetch updated session data
        startTransition(() => {
          router.refresh();
        });
      } else {
        console.error('Failed to switch user');
      }
    } catch (err) {
      console.error('Error switching user:', err);
    }
  };

  const activeEmp = employees.find(e => e.id === selectedId);

  return (
    <div className="user-switcher-container">
      <span style={{ fontSize: '1.1rem', marginRight: '0.25rem' }}>
        {activeEmp?.role === 'officer' ? '🛡️' : activeEmp?.role === 'manager' ? '💼' : '👤'}
      </span>
      <select
        className="user-switcher-select"
        value={selectedId}
        onChange={(e) => handleSwitch(e.target.value)}
        disabled={isPending}
      >
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.name} ({emp.role.toUpperCase()} - {emp.department.code})
          </option>
        ))}
      </select>
      {isPending && <span style={{ opacity: 0.6, fontSize: '0.75rem', animation: 'pulse-glow 1s infinite' }}>Syncing...</span>}
    </div>
  );
}
