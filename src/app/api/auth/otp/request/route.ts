import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Otp from '@/models/Otp';

const PURPOSES = new Set(['change_password', 'delete_account']);

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, purpose } = await req.json();
    if (!email || !purpose) {
      return NextResponse.json({ error: 'Email and purpose required' }, { status: 400 });
    }
    if (!PURPOSES.has(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email: email.toLowerCase(), purpose });
    await Otp.create({ email: email.toLowerCase(), purpose, otpHash, expiresAt });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });

    const subject = purpose === 'change_password' ? 'Password Change OTP' : 'Delete Account OTP';
    await transporter.sendMail({
      from: `"EduAI Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `EduAI Portal - ${subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:30px;background:#f8faff;border-radius:16px;border:1px solid #e8edf5">
          <h2 style="color:#3b82f6;margin-bottom:8px">EduAI Portal</h2>
          <p style="color:#374151">Your OTP for <strong>${purpose.replace('_', ' ')}</strong> is:</p>
          <div style="background:#1e293b;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:36px;font-weight:800;color:#60a5fa;letter-spacing:10px">${otp}</span>
          </div>
          <p style="color:#6b7280;font-size:13px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
