import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET() {
  const key = process.env.GROQ_API_KEY || '';
  const masked = key ? `${key.slice(0, 4)}...${key.slice(-4)}` : '';

  let dbStatus = 'disconnected';
  let dbError: string | null = null;
  try {
    await connectDB();
    dbStatus = 'connected';
  } catch (err: unknown) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: dbStatus === 'connected',
    dbStatus,
    dbError,
    groqKeyPresent: Boolean(key),
    groqKeyMasked: masked,
  });
}
