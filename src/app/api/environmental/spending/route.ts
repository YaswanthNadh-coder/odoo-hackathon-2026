import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spendings = await prisma.spendingRecord.findMany({
      include: { department: true },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(spendings);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, description, amount, quantity, departmentId } = await req.json();

    if (!type || !description || amount === undefined || quantity === undefined || !departmentId) {
      return NextResponse.json({ error: 'Missing required spending fields' }, { status: 400 });
    }

    // 1. Create the spending record
    const spending = await prisma.spendingRecord.create({
      data: {
        type,
        description,
        amount: parseFloat(amount),
        quantity: parseFloat(quantity),
        departmentId,
      },
      include: { department: true },
    });

    // 2. Check if Auto Emission Calculation is enabled in settings
    const config = await prisma.appConfig.findUnique({
      where: { id: 'global' },
    });

    let autoTransactionCreated = null;

    if (config?.autoEmissionCalc) {
      // Find matching emission factor based on spending type
      let searchKeyword = 'Procurement';
      if (type === 'fleet') searchKeyword = 'Diesel';
      else if (type === 'manufacturing') searchKeyword = 'Electricity';
      else if (type === 'expense') searchKeyword = 'Travel';

      const factor = await prisma.emissionFactor.findFirst({
        where: {
          name: {
            contains: searchKeyword,
          },
        },
      }) || await prisma.emissionFactor.findFirst(); // fallback to first factor

      if (factor) {
        // Calculate co2e total
        const co2eTotal = parseFloat((spending.quantity * factor.co2eValue).toFixed(4));

        // Create linked automated carbon transaction
        autoTransactionCreated = await prisma.carbonTransaction.create({
          data: {
            departmentId,
            emissionFactorId: factor.id,
            quantity: spending.quantity,
            co2eTotal,
            source: `auto-${type}`,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      spending,
      autoTransactionCreated,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
