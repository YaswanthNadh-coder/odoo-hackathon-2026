import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createNotification } from '@/lib/notifications';

export async function GET() {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global' } });
    const now = new Date();
    const notificationsSent = [];

    // 1. Overdue Compliance Issues
    if (config?.notifyCompliance !== false) {
      const overdueIssues = await prisma.complianceIssue.findMany({
        where: {
          status: 'open',
          dueDate: { lt: now },
        },
      });

      for (const issue of overdueIssues) {
        // Find the owner in the DB. The owner field is currently a string (name or email).
        // Let's assume it's the email or name, we will try to find an employee.
        // If owner is mapped to employee email:
        const employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { email: issue.owner },
              { name: issue.owner }
            ]
          }
        });

        if (employee) {
          const title = '⚠️ Overdue Compliance Issue';
          const message = `The compliance issue "${issue.description}" is overdue since ${issue.dueDate.toLocaleDateString()}. Please address it immediately.`;
          
          // Prevent duplicates
          const existingNotif = await prisma.notification.findFirst({
            where: {
              userId: employee.id,
              type: 'compliance',
              title,
              message,
            }
          });

          if (!existingNotif) {
            const notif = await createNotification(employee.id, title, message, 'compliance');
            if (notif) notificationsSent.push(notif.id);
          }
        }
      }
    }

    // 2. Policy Acknowledgement Reminders
    if (config?.notifyPolicyReminder !== false) {
      const allPolicies = await prisma.eSGPolicy.findMany();
      const allEmployees = await prisma.employee.findMany({
        include: { acknowledgements: true }
      });

      for (const employee of allEmployees) {
        const ackedPolicyIds = employee.acknowledgements.map(a => a.policyId);
        
        for (const policy of allPolicies) {
          if (!ackedPolicyIds.includes(policy.id)) {
            const title = '📝 Policy Acknowledgement Required';
            const message = `Please read and acknowledge the policy: "${policy.title}".`;
            
            // Prevent duplicates
            const existingNotif = await prisma.notification.findFirst({
              where: {
                userId: employee.id,
                type: 'policy',
                title,
                message,
              }
            });

            if (!existingNotif) {
              const notif = await createNotification(employee.id, title, message, 'policy');
              if (notif) notificationsSent.push(notif.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, count: notificationsSent.length });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
