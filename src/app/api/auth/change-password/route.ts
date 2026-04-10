import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Otp from '@/models/Otp';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, otp, newPassword } = await req.json();
    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP, and new password required' }, { status: 400 });
    }

    const rec = await Otp.findOne({ email: email.toLowerCase(), purpose: 'change_password' }).sort({ createdAt: -1 });
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

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(newPassword), salt);
    await user.save();

    await Otp.deleteMany({ email: email.toLowerCase(), purpose: 'change_password' });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
