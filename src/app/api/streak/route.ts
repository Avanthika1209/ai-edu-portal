import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

function toDateKey(ts: number, tzOffsetMinutes: number) {
  const local = new Date(ts - tzOffsetMinutes * 60000);
  return local.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tzOffsetMinutes = 0 } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const todayKey = toDateKey(Date.now(), tzOffsetMinutes);
    const yesterdayKey = toDateKey(Date.now() - 86400000, tzOffsetMinutes);

    let dbConnected = false;
    try {
      await connectDB();
      dbConnected = true;
    } catch {
      // offline fallback
    }

    if (!dbConnected) {
      return NextResponse.json({
        streak: 1,
        todayKey,
        yesterdayKey,
        lastKey: todayKey,
        tzOffsetMinutes,
        serverTime: new Date().toISOString(),
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        streak: 1,
        todayKey,
        yesterdayKey,
        lastKey: todayKey,
        tzOffsetMinutes,
        serverTime: new Date().toISOString(),
      });
    }

    const lastKey = user.streakLastDateKey
      ? user.streakLastDateKey
      : (user.streakLastDate ? toDateKey(new Date(user.streakLastDate).getTime(), tzOffsetMinutes) : '');

    let streak = user.streak || 0;
    if (lastKey === todayKey) {
      // keep streak
    } else if (lastKey === yesterdayKey) {
      streak = streak + 1;
    } else {
      streak = 1;
    }

    user.streak = streak;
    user.streakLastDate = new Date();
    user.streakLastDateKey = todayKey;
    await user.save();

    return NextResponse.json({
      streak,
      todayKey,
      yesterdayKey,
      lastKey,
      tzOffsetMinutes,
      serverTime: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ streak: 1 });
  }
}
