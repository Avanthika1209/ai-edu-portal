import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    const valid = await bcrypt.compare(String(password), user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar || '🧑',
      profilePic: user.profilePic || '',
      purpose: user.purpose || '',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Login error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}