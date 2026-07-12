import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can create emission factors.' }, { status: 403 });
    }

    const { name, unit, co2eValue } = await req.json();

    if (!name || !unit || co2eValue === undefined) {
      return NextResponse.json({ error: 'Name, Unit and CO2e value are required' }, { status: 400 });
    }

    const factor = await prisma.emissionFactor.create({
      data: {
        name,
        unit,
        co2eValue: parseFloat(co2eValue),
      },
    });

    return NextResponse.json(factor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can update emission factors.' }, { status: 403 });
    }

    const { id, name, unit, co2eValue } = await req.json();

    if (!id || !name || !unit || co2eValue === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update factor and recalculate co2e totals for all dependent transactions!
    const updatedFactor = await prisma.$transaction(async (tx) => {
      const factor = await tx.emissionFactor.update({
        where: { id },
        data: {
          name,
          unit,
          co2eValue: parseFloat(co2eValue),
        },
      });

      // Recalculate transaction totals
      const txs = await tx.carbonTransaction.findMany({
        where: { emissionFactorId: id },
      });

      for (const t of txs) {
        await tx.carbonTransaction.update({
          where: { id: t.id },
          data: {
            co2eTotal: parseFloat((t.quantity * factor.co2eValue).toFixed(4)),
          },
        });
      }

      return factor;
    });

    return NextResponse.json(updatedFactor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can delete emission factors.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Emission Factor ID is required' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.carbonTransaction.deleteMany({
        where: { emissionFactorId: id },
      }),
      prisma.emissionFactor.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
