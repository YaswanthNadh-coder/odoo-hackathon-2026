import { NextResponse } from 'next/server';
import { calculateESGStats } from '@/lib/esg-calc';

export async function GET() {
  try {
    const stats = await calculateESGStats();
    return NextResponse.json(stats);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('Error calculating ESG stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
