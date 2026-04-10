import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.GROQ_API_KEY || '';
  const masked = key ? `${key.slice(0, 4)}...${key.slice(-4)}` : '';
  return NextResponse.json({
    ok: true,
    groqKeyPresent: Boolean(key),
    groqKeyMasked: masked,
  });
}
