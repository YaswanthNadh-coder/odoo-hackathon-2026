import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
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

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can update settings.' }, { status: 403 });
    }

    const body = await req.json();

    const config = await prisma.appConfig.upsert({
      where: { id: 'global' },
      update: {
        autoEmissionCalc: body.autoEmissionCalc !== undefined ? body.autoEmissionCalc : undefined,
        evidenceRequired: body.evidenceRequired !== undefined ? body.evidenceRequired : undefined,
        badgeAutoAward: body.badgeAutoAward !== undefined ? body.badgeAutoAward : undefined,
        complianceEmailAlert: body.complianceEmailAlert !== undefined ? body.complianceEmailAlert : undefined,
        envWeight: body.envWeight !== undefined ? parseFloat(body.envWeight) : undefined,
        socialWeight: body.socialWeight !== undefined ? parseFloat(body.socialWeight) : undefined,
        govWeight: body.govWeight !== undefined ? parseFloat(body.govWeight) : undefined,
        notifyCompliance: body.notifyCompliance !== undefined ? body.notifyCompliance : undefined,
        notifyApproval: body.notifyApproval !== undefined ? body.notifyApproval : undefined,
        notifyPolicyReminder: body.notifyPolicyReminder !== undefined ? body.notifyPolicyReminder : undefined,
        notifyBadgeUnlock: body.notifyBadgeUnlock !== undefined ? body.notifyBadgeUnlock : undefined,
      },
      create: {
        id: 'global',
        autoEmissionCalc: body.autoEmissionCalc || false,
        evidenceRequired: body.evidenceRequired !== undefined ? body.evidenceRequired : true,
        badgeAutoAward: body.badgeAutoAward !== undefined ? body.badgeAutoAward : true,
        complianceEmailAlert: body.complianceEmailAlert || false,
        envWeight: body.envWeight !== undefined ? parseFloat(body.envWeight) : 0.4,
        socialWeight: body.socialWeight !== undefined ? parseFloat(body.socialWeight) : 0.3,
        govWeight: body.govWeight !== undefined ? parseFloat(body.govWeight) : 0.3,
        notifyCompliance: body.notifyCompliance !== undefined ? body.notifyCompliance : true,
        notifyApproval: body.notifyApproval !== undefined ? body.notifyApproval : true,
        notifyPolicyReminder: body.notifyPolicyReminder !== undefined ? body.notifyPolicyReminder : true,
        notifyBadgeUnlock: body.notifyBadgeUnlock !== undefined ? body.notifyBadgeUnlock : true,
      },
    });

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
