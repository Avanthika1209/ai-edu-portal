import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import Progress from '@/models/Progress';
import Conversation from '@/models/Conversation';
import Otp from '@/models/Otp';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 });
    }

    const rec = await Otp.findOne({ email: email.toLowerCase(), purpose: 'delete_account' }).sort({ createdAt: -1 });
    if (!rec || rec.expiresAt < new Date()) {
      return NextResponse.json({ error: 'OTP expired or invalid' }, { status: 400 });
    }

    const ok = await bcrypt.compare(String(otp), rec.otpHash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await Promise.all([
      Progress.deleteOne({ userId: user._id.toString() }),
      Conversation.deleteMany({ userId: user._id.toString() }),
      User.deleteOne({ _id: user._id }),
      Otp.deleteMany({ email: email.toLowerCase(), purpose: 'delete_account' }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
