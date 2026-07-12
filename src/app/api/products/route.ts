import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const products = await prisma.productESGProfile.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can manage product ESG profiles.' }, { status: 403 });
    }

    const { name, sku, carbonFootprint, materialSource, recyclingRate } = await req.json();

    if (!name || !sku || carbonFootprint === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const product = await prisma.productESGProfile.create({
      data: {
        name,
        sku,
        carbonFootprint: parseFloat(carbonFootprint),
        materialSource: materialSource || '',
        recyclingRate: recyclingRate !== undefined ? parseFloat(recyclingRate) : 0,
        status: 'active',
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can manage product ESG profiles.' }, { status: 403 });
    }

    const { id, name, sku, carbonFootprint, materialSource, recyclingRate, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const product = await prisma.productESGProfile.update({
      where: { id },
      data: {
        name,
        sku,
        carbonFootprint: carbonFootprint !== undefined ? parseFloat(carbonFootprint) : undefined,
        materialSource,
        recyclingRate: recyclingRate !== undefined ? parseFloat(recyclingRate) : undefined,
        status,
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'officer' && session.role !== 'manager')) {
      return NextResponse.json({ error: 'Only Managers and Officers can delete product ESG profiles.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    await prisma.productESGProfile.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
