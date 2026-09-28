import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { name, email, password, avatar, purpose } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // hash with salt rounds 10
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(String(password), salt);

    // Use new User() + .save() instead of User.create()
    const user = new User({
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      password: hashed,
      avatar: avatar || '🧑',
      purpose: purpose || '',
    });
    await user.save();

    // Send welcome email (wrapped in try/catch so auth still works if email fails)
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false, // ✅ fixes self-signed certificate error
        },
      });

      await transporter.sendMail({
        from: `"EduAI Portal" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🎓 Welcome to EduAI Portal!',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;background:#f8faff;border-radius:16px">
            <h2 style="color:#3b82f6">Welcome to EduAI Portal, ${name}! 🎓</h2>
            <p>Your account has been successfully created.</p>
            <p><strong>Email:</strong> ${email}</p>
            <p>Start learning with your AI tutor, generate quizzes, summarize notes and track your progress!</p>
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" 
               style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
              Start Learning →
            </a>
          </div>
        `,
      });

      console.log('Welcome email sent to:', email);
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      purpose: user.purpose,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Signup error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
