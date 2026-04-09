import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"EduAI Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your EduAI Portal OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:30px;background:#f8faff;border-radius:16px;border:1px solid #e8edf5">
          <h2 style="color:#3b82f6;margin-bottom:8px">🎓 EduAI Portal</h2>
          <p style="color:#374151">Hi <strong>${name || 'there'}</strong>,</p>
          <p style="color:#374151">Your email verification OTP is:</p>
          <div style="background:#1e293b;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:36px;font-weight:800;color:#60a5fa;letter-spacing:10px">${otp}</span>
          </div>
          <p style="color:#6b7280;font-size:13px">This OTP expires in 10 minutes. Do not share it with anyone.</p>
          <p style="color:#6b7280;font-size:12px;margin-top:16px">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    // In production: store OTP in DB/Redis with expiry instead of returning it
    return NextResponse.json({ otp });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Send OTP error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
