import { prisma } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function main() {
  console.log('Seeding database...');

  // 1. Reset database
  await prisma.appConfig.deleteMany();
  await prisma.complianceIssue.deleteMany();
  await prisma.policyAcknowledgement.deleteMany();
  await prisma.eSGPolicy.deleteMany();
  await prisma.employeeBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.challengeParticipation.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.employeeParticipation.deleteMany();
  await prisma.cSRActivity.deleteMany();
  await prisma.carbonTransaction.deleteMany();
  await prisma.emissionFactor.deleteMany();
  await prisma.category.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.spendingRecord.deleteMany();

  // 2. Global configuration
  await prisma.appConfig.create({
    data: {
      id: 'global',
      autoEmissionCalc: false,
      evidenceRequired: true,
      badgeAutoAward: true,
      complianceEmailAlert: false,
      envWeight: 0.4,
      socialWeight: 0.3,
      govWeight: 0.3,
      notifyCompliance: true,
      notifyApproval: true,
      notifyPolicyReminder: true,
      notifyBadgeUnlock: true,
    },
  });

  // 3. Departments
  const deptLogistics = await prisma.department.create({
    data: { name: 'Logistics', code: 'LOG', headName: 'Sarah Jenkins', employeeCount: 15, status: 'active' },
  });
  const deptMfg = await prisma.department.create({
    data: { name: 'Manufacturing', code: 'MFG', headName: 'Robert Chen', employeeCount: 45, status: 'active' },
  });
  const deptCorporate = await prisma.department.create({
    data: { name: 'Corporate', code: 'CORP', headName: 'Elena Rostova', employeeCount: 10, status: 'active' },
  });
  const deptRD = await prisma.department.create({
    data: { name: 'R&D', code: 'RD', headName: 'Dr. Alan Turing', employeeCount: 20, status: 'active' },
  });

  // 4. Employees
  const empJohn = await prisma.employee.create({
    data: { name: 'John Doe', email: 'john@ecosphere.com', passwordHash: hashPassword('john123'), role: 'employee', departmentId: deptLogistics.id, xp: 120, points: 50 },
  });
  const empJane = await prisma.employee.create({
    data: { name: 'Jane Smith', email: 'jane@ecosphere.com', passwordHash: hashPassword('jane123'), role: 'employee', departmentId: deptMfg.id, xp: 80, points: 30 },
  });
  const empElena = await prisma.employee.create({
    data: { name: 'Elena Rostova', email: 'elena@ecosphere.com', passwordHash: hashPassword('elena123'), role: 'manager', departmentId: deptCorporate.id, xp: 250, points: 150 },
  });
  const empAlice = await prisma.employee.create({
    data: { name: 'Alice Johnson', email: 'alice@ecosphere.com', passwordHash: hashPassword('alice123'), role: 'employee', departmentId: deptRD.id, xp: 350, points: 200 },
  });
  const empMarcus = await prisma.employee.create({
    data: { name: 'Marcus Vance', email: 'marcus@ecosphere.com', passwordHash: hashPassword('marcus123'), role: 'officer', departmentId: deptCorporate.id, xp: 0, points: 0 },
  });

  // 5. Emission Factors
  const efElectricity = await prisma.emissionFactor.create({
    data: { name: 'Grid Electricity', unit: 'kWh', co2eValue: 0.000475 },
  });
  const efNatGas = await prisma.emissionFactor.create({
    data: { name: 'Natural Gas', unit: 'm3', co2eValue: 0.0019 },
  });
  const efDiesel = await prisma.emissionFactor.create({
    data: { name: 'Fleet Diesel', unit: 'Liters', co2eValue: 0.00268 },
  });
  const efAirTravel = await prisma.emissionFactor.create({
    data: { name: 'Air Travel', unit: 'km', co2eValue: 0.000115 },
  });

  // 6. Categories
  const catCSR = await prisma.category.create({
    data: { name: 'CSR Advocacy', type: 'CSR', status: 'active' },
  });
  const catChallenge = await prisma.category.create({
    data: { name: 'Eco-Action Challenge', type: 'CHALLENGE', status: 'active' },
  });

  // 7. CSR Activities
  const actCleanup = await prisma.cSRActivity.create({
    data: { title: 'Annual Beach Cleanup', description: 'Help clean up local coastlines to protect marine ecosystems.', categoryId: catCSR.id },
  });
  const actTrees = await prisma.cSRActivity.create({
    data: { title: 'Tree Planting Initiative', description: 'Plant native trees in urban parks to restore green cover.', categoryId: catCSR.id },
  });
  const actRecycle = await prisma.cSRActivity.create({
    data: { title: 'E-Waste Recycling Drive', description: 'Bring old electronics for safe collection and recycling.', categoryId: catCSR.id },
  });

  // 8. Challenges
  const chPlastic = await prisma.challenge.create({
    data: { title: 'No Single-Use Plastic Week', description: 'Avoid single-use plastic cups, straws, and bags for 7 days.', xp: 100, difficulty: 'easy', status: 'active', categoryId: catChallenge.id },
  });
  const chBike = await prisma.challenge.create({
    data: { title: 'Bike to Work Month', description: 'Commute by bicycle or walk for at least 10 work days this month.', xp: 300, difficulty: 'medium', status: 'active', categoryId: catChallenge.id },
  });
  const chZeroWaste = await prisma.challenge.create({
    data: { title: 'Zero Waste Operations', description: 'Audit and achieve 90% zero-waste target in office waste stream.', xp: 500, difficulty: 'hard', status: 'draft', categoryId: catChallenge.id },
  });

  // 9. Badges
  const badgeNovice = await prisma.badge.create({
    data: { name: 'Eco Novice', description: 'Awarded for reaching 100 XP.', unlockRule: JSON.stringify({ xpGte: 100 }), icon: '🌱' },
  });
  const badgeChampion = await prisma.badge.create({
    data: { name: 'Green Champion', description: 'Awarded for reaching 300 XP.', unlockRule: JSON.stringify({ xpGte: 300 }), icon: '🏆' },
  });
  const badgeSocialite = await prisma.badge.create({
    data: { name: 'CSR Advocate', description: 'Unlock by completing 1 CSR Activity.', unlockRule: JSON.stringify({ csrCountGte: 1 }), icon: '🤝' },
  });

  // Award seed badges
  await prisma.employeeBadge.createMany({
    data: [
      { employeeId: empJohn.id, badgeId: badgeNovice.id },
      { employeeId: empElena.id, badgeId: badgeNovice.id },
      { employeeId: empAlice.id, badgeId: badgeNovice.id },
      { employeeId: empAlice.id, badgeId: badgeChampion.id },
    ],
  });

  // 10. ESG Policies
  const polProcure = await prisma.eSGPolicy.create({
    data: { title: 'Sustainable Procurement Policy', body: 'All department purchasing decisions must prioritize items with eco-labels, energy-efficient ratings, and minimal packaging materials.' },
  });
  const polWaste = await prisma.eSGPolicy.create({
    data: { title: 'Office Waste Reduction Policy', body: 'Mandatory sorting of waste into Recyclables, Organic, and General Trash. Single-use plastic water bottles are prohibited in meeting rooms.' },
  });

  // Seed policy acknowledgements
  await prisma.policyAcknowledgement.createMany({
    data: [
      { employeeId: empJohn.id, policyId: polProcure.id },
      { employeeId: empAlice.id, policyId: polProcure.id },
      { employeeId: empElena.id, policyId: polWaste.id },
    ],
  });

  // 11. Compliance Issues
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const pastDue = new Date();
  pastDue.setDate(pastDue.getDate() - 5);

  const resolvedDate = new Date();
  resolvedDate.setDate(resolvedDate.getDate() - 3);

  await prisma.complianceIssue.create({
    data: { departmentId: deptMfg.id, severity: 'high', description: 'Unreported chemical drum storage at facility B near the stormwater drain.', owner: 'Robert Chen', dueDate: tomorrow, status: 'open' },
  });
  await prisma.complianceIssue.create({
    data: { departmentId: deptLogistics.id, severity: 'critical', description: 'Fleet emissions exceed standard allowance limit for carbon cap Q2 regulations.', owner: 'Sarah Jenkins', dueDate: pastDue, status: 'open' },
  });
  await prisma.complianceIssue.create({
    data: { departmentId: deptCorporate.id, severity: 'low', description: 'Thermostat settings at main corporate offices set lower than mandated 24C environmental baseline.', owner: 'Elena Rostova', dueDate: resolvedDate, status: 'resolved' },
  });

  // 12. Carbon Transactions (to generate initial scores)
  await prisma.carbonTransaction.createMany({
    data: [
      { departmentId: deptLogistics.id, emissionFactorId: efDiesel.id, quantity: 1500, co2eTotal: 1500 * efDiesel.co2eValue, source: 'manual', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { departmentId: deptLogistics.id, emissionFactorId: efDiesel.id, quantity: 1200, co2eTotal: 1200 * efDiesel.co2eValue, source: 'manual', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
      { departmentId: deptMfg.id, emissionFactorId: efElectricity.id, quantity: 120000, co2eTotal: 120000 * efElectricity.co2eValue, source: 'manual', date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) },
      { departmentId: deptMfg.id, emissionFactorId: efNatGas.id, quantity: 8000, co2eTotal: 8000 * efNatGas.co2eValue, source: 'manual', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { departmentId: deptCorporate.id, emissionFactorId: efElectricity.id, quantity: 15000, co2eTotal: 15000 * efElectricity.co2eValue, source: 'manual', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { departmentId: deptRD.id, emissionFactorId: efAirTravel.id, quantity: 45000, co2eTotal: 45000 * efAirTravel.co2eValue, source: 'manual', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    ],
  });

  // 13. Employee Participations (seed some initial history)
  await prisma.employeeParticipation.createMany({
    data: [
      { employeeId: empJohn.id, activityId: actCleanup.id, proofUrl: '/proofs/beach.jpg', approvalStatus: 'approved', pointsEarned: 20, completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      { employeeId: empAlice.id, activityId: actTrees.id, proofUrl: '/proofs/tree.jpg', approvalStatus: 'approved', pointsEarned: 50, completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { employeeId: empJane.id, activityId: actRecycle.id, proofUrl: '/proofs/recycle.jpg', approvalStatus: 'pending', pointsEarned: 0 },
    ],
  });

  // 14. Challenge Participations
  await prisma.challengeParticipation.createMany({
    data: [
      { employeeId: empJohn.id, challengeId: chPlastic.id, progress: 100, proofUrl: '/proofs/plastic.jpg', approval: 'approved', xpAwarded: 100 },
      { employeeId: empJane.id, challengeId: chBike.id, progress: 40, approval: 'pending' },
    ],
  });

  // 15. Rewards Catalog
  await prisma.reward.createMany({
    data: [
      { name: 'Eco Coffee Mug', description: 'Double-walled reusable bamboo travel mug.', pointsRequired: 100, stock: 15 },
      { name: 'Sustainable Apparel Hoodie', description: 'Certified organic cotton hoodie.', pointsRequired: 300, stock: 5 },
      { name: 'Solar Charger Powerbank', description: '20,000mAh solar-powered backup battery.', pointsRequired: 500, stock: 2 },
    ],
  });

  // 16. Operational Spending Records
  await prisma.spendingRecord.createMany({
    data: [
      { type: 'fleet', description: 'Logistics Diesel Fuel Fleet refill', amount: 650.0, quantity: 450.0, departmentId: deptLogistics.id },
      { type: 'manufacturing', description: 'Monthly Factory Power Bill Grid utilities', amount: 2200.0, quantity: 18000.0, departmentId: deptMfg.id },
      { type: 'expense', description: 'R&D Executive Flight Travel mileage', amount: 950.0, quantity: 3000.0, departmentId: deptRD.id },
      { type: 'purchase', description: 'Eco-friendly office supplies procurement', amount: 1500.0, quantity: 1500.0, departmentId: deptCorporate.id },
    ],
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
