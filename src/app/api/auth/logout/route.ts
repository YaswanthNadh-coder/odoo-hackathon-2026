import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
