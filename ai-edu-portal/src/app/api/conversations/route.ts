import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Conversation from '@/models/Conversation';

export async function GET(req: NextRequest) {
  await connectDB();
  const userId = req.nextUrl.searchParams.get('userId');
  const convs = await Conversation.find({ userId }).sort({ updatedAt: -1 }).limit(30);
  return NextResponse.json(convs);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const { userId, title, messages, convId } = await req.json();
  if (convId) {
    const updated = await Conversation.findByIdAndUpdate(convId, { title, messages, updatedAt: new Date() }, { new: true });
    return NextResponse.json(updated);
  }
  const conv = await Conversation.create({ userId, title, messages });
  return NextResponse.json(conv);
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const { id } = await req.json();
  await Conversation.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}