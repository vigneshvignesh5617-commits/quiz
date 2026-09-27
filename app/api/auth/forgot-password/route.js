import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { hashResetToken } from '@/lib/auth';
import User from '@/models/User';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.APP_URL) {
    return NextResponse.json({ error: 'Password recovery email is not configured on this server.' }, { status: 503 });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpires');
    if (!user) return NextResponse.json({ ok: true, message: 'If the account exists, a reset link will be sent.' });

    const token = randomBytes(32).toString('base64url');
    user.passwordResetTokenHash = hashResetToken(token);
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const resetUrl = `${process.env.APP_URL.replace(/\/$/, '')}/auth/reset?token=${encodeURIComponent(token)}`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [user.email],
        subject: 'Reset your QuizMaster password',
        html: `<p>A password reset was requested for your QuizMaster account.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>`,
      }),
    });
    if (!emailResponse.ok) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      console.error('Password reset email provider rejected the request:', emailResponse.status);
    }
    return NextResponse.json({ ok: true, message: 'If the account exists, a reset link will be sent.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not request a password reset.' }, { status: 500 });
  }
}
