import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { hashPassword, hashResetToken } from '@/lib/auth';
import User from '@/models/User';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token || token.length > 200) return NextResponse.json({ error: 'Reset link is invalid or expired.' }, { status: 400 });
  if (password.length < 8 || password.length > 128) return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 });

  try {
    await dbConnect();
    const user = await User.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpires');
    if (!user) return NextResponse.json({ error: 'Reset link is invalid or expired.' }, { status: 400 });

    user.passwordHash = await hashPassword(password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not reset the password.' }, { status: 500 });
  }
}
