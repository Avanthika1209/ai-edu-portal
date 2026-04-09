import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Progress from '@/models/Progress';

export async function GET(req: NextRequest) {
  await connectDB();
  const userId = req.nextUrl.searchParams.get('userId');
  const p = await Progress.findOne({ userId });
  return NextResponse.json(p?.stats || []);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const { userId, stats } = await req.json();
  const p = await Progress.findOneAndUpdate({ userId }, { stats }, { upsert: true, new: true });
  return NextResponse.json(p);
}