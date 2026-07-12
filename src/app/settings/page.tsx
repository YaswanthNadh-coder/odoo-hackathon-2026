import SettingsPortal from '@/components/SettingsPortal';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export const revalidate = 0; // Live updates

export default async function SettingsPage() {
  const session = await getSession();

  // Fetch global config
  let config = await prisma.appConfig.findUnique({
    where: { id: 'global' },
  });

  if (!config) {
    config = await prisma.appConfig.create({
      data: {
        id: 'global',
        autoEmissionCalc: false,
        evidenceRequired: true,
        badgeAutoAward: true,
        complianceEmailAlert: false,
        envWeight: 0.4,
        socialWeight: 0.3,
        govWeight: 0.3,
      },
    });
  }

  // Fetch departments
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  // Fetch categories
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });

  const serializedConfig = {
    autoEmissionCalc: config.autoEmissionCalc,
    evidenceRequired: config.evidenceRequired,
    badgeAutoAward: config.badgeAutoAward,
    complianceEmailAlert: config.complianceEmailAlert,
    envWeight: config.envWeight,
    socialWeight: config.socialWeight,
    govWeight: config.govWeight,
    notifyCompliance: config.notifyCompliance,
    notifyApproval: config.notifyApproval,
    notifyPolicyReminder: config.notifyPolicyReminder,
    notifyBadgeUnlock: config.notifyBadgeUnlock,
  };

  const serializedDepartments = departments.map((dept) => ({
    id: dept.id,
    name: dept.name,
    code: dept.code,
    headName: dept.headName,
    employeeCount: dept.employeeCount,
    status: dept.status,
  }));

  const serializedCategories = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    type: cat.type,
    status: cat.status,
  }));

  const clientSession = session ? {
    role: session.role,
  } : null;

  return (
    <div className="page-fade-in">
      <div className="flex-between mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>⚙️ EcoSphere Configuration Settings</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Modify ESG score weights, toggle calculations logic, and oversee business units.
          </p>
        </div>
      </div>

      <SettingsPortal
        config={serializedConfig}
        departments={serializedDepartments}
        categories={serializedCategories}
        currentUser={clientSession}
      />
    </div>
  );
}
