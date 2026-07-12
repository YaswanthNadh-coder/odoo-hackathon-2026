import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const searchParams = req.nextUrl.searchParams;
    const filterDeptId = searchParams.get('departmentId');

    const factors = await prisma.emissionFactor.findMany();
    
    const transactions = await prisma.carbonTransaction.findMany({
      where: filterDeptId ? { departmentId: filterDeptId } : {},
      include: {
        department: true,
        emissionFactor: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ factors, transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Check if auto-ingest trigger
    if (body.action === 'auto-ingest') {
      const config = await prisma.appConfig.findUnique({ where: { id: 'global' } });
      if (!config || !config.autoEmissionCalc) {
        return NextResponse.json({ error: 'Auto Emission Calculation is disabled in settings.' }, { status: 400 });
      }

      // Generate 3 simulated ERP logs (fleet travel, logistics supply, electricity usage)
      const logisticsDept = await prisma.department.findFirst({ where: { code: 'LOG' } });
      const mfgDept = await prisma.department.findFirst({ where: { code: 'MFG' } });
      
      const efElectricity = await prisma.emissionFactor.findFirst({ where: { name: { contains: 'Electricity' } } });
      const efDiesel = await prisma.emissionFactor.findFirst({ where: { name: { contains: 'Diesel' } } });

      const txs = [];

      if (logisticsDept && efDiesel) {
        // Fleet Travel
        const qty = Math.floor(Math.random() * 500) + 100; // 100-600 Liters
        const tx = await prisma.carbonTransaction.create({
          data: {
            departmentId: logisticsDept.id,
            emissionFactorId: efDiesel.id,
            quantity: qty,
            co2eTotal: parseFloat((qty * efDiesel.co2eValue).toFixed(4)),
            source: 'auto-erp-fleet',
          },
          include: { department: true, emissionFactor: true },
        });
        txs.push(tx);
      }

      if (mfgDept && efElectricity) {
        // Manufacturing log
        const qty = Math.floor(Math.random() * 20000) + 5000; // 5000-25000 kWh
        const tx = await prisma.carbonTransaction.create({
          data: {
            departmentId: mfgDept.id,
            emissionFactorId: efElectricity.id,
            quantity: qty,
            co2eTotal: parseFloat((qty * efElectricity.co2eValue).toFixed(4)),
            source: 'auto-erp-manufacturing',
          },
          include: { department: true, emissionFactor: true },
        });
        txs.push(tx);
      }

      return NextResponse.json({ success: true, count: txs.length, transactions: txs });
    }

    // Manual Log
    const { departmentId, emissionFactorId, quantity } = body;
    if (!departmentId || !emissionFactorId || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const factor = await prisma.emissionFactor.findUnique({
      where: { id: emissionFactorId },
    });

    if (!factor) {
      return NextResponse.json({ error: 'Emission factor not found' }, { status: 404 });
    }

    const co2eTotal = parseFloat((quantity * factor.co2eValue).toFixed(4));

    const transaction = await prisma.carbonTransaction.create({
      data: {
        departmentId,
        emissionFactorId,
        quantity: parseFloat(quantity),
        co2eTotal,
        source: 'manual',
      },
      include: {
        department: true,
        emissionFactor: true,
      },
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
