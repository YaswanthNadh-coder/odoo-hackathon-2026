import EnvironmentalForms from '@/components/EnvironmentalForms';
import TransactionsTable from '@/components/TransactionsTable';
import { calculateESGStats, DEPT_CARBON_TARGETS } from '@/lib/esg-calc';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export const revalidate = 0; // Live updates

export default async function EnvironmentalPage() {
  const session = await getSession();

  // Fetch factors, departments, configurations
  const factors = await prisma.emissionFactor.findMany();
  const departments = await prisma.department.findMany();
  
  const config = await prisma.appConfig.findUnique({
    where: { id: 'global' },
  });

  const autoEmissionCalcEnabled = config ? config.autoEmissionCalc : false;

  // Fetch ESG stats to see the carbon calculations
  const stats = await calculateESGStats();

  // Fetch transactions with relationships
  const transactions = await prisma.carbonTransaction.findMany({
    include: {
      department: true,
      emissionFactor: true,
    },
    orderBy: { date: 'desc' },
  });

  const serializedTransactions = transactions.map((tx) => ({
    id: tx.id,
    date: tx.date.toISOString(),
    quantity: tx.quantity,
    co2eTotal: tx.co2eTotal,
    source: tx.source,
    department: {
      name: tx.department.name,
      code: tx.department.code,
    },
    emissionFactor: {
      name: tx.emissionFactor.name,
      unit: tx.emissionFactor.unit,
    },
  }));

  const isOfficerOrManager = session?.role === 'officer' || session?.role === 'manager';

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>🍀 Environmental Impact Module</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Scope 1 and Scope 2 carbon accounting tracker.
          </p>
        </div>
      </div>

      <div className="grid-cols-3 mb-8" style={{ alignItems: 'flex-start' }}>
        {/* Left Side: Logging Forms */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <EnvironmentalForms
            departments={departments}
            factors={factors}
            autoEmissionCalcEnabled={autoEmissionCalcEnabled}
            currentUser={session}
          />

          {/* Transactions Log List */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Carbon Transaction Log Ledger</h3>
            <TransactionsTable
              transactions={serializedTransactions}
              isOfficerOrManager={isOfficerOrManager}
            />
          </div>
        </div>

        {/* Right Side: Carbon Summary / Target Indicators */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Department Carbon Target Index</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {stats.departmentScores.map((dept) => {
              const actual = dept.scores.carbonTotal;
              const target = dept.scores.carbonTarget;
              const percent = target > 0 ? (actual / target) * 100 : 0;
              
              // Color based on budget usage
              const barColor = percent > 90 ? '#ef4444' : percent > 70 ? '#fbbf24' : 'var(--accent-env)';

              return (
                <div key={dept.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div className="flex-between">
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dept.name} ({dept.code})</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {actual.toFixed(2)} / {target.toFixed(2)} t
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.min(100, percent)}%`, 
                        height: '100%', 
                        background: barColor, 
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-in-out' 
                      }} 
                    />
                  </div>
                  <div className="flex-between" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>Budget Used</span>
                    <span style={{ color: percent > 100 ? '#f87171' : undefined }}>{percent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <strong>💡 Emission Targeting:</strong>
            <p style={{ marginTop: '0.25rem' }}>
              Departments receive score penalties once their actual CO2e emissions pass 100% of their target threshold. Reducing carbon footprints improves overall scores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
