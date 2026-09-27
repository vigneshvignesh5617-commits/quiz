import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { hashPassword, publicUser, readSession, setSessionCookie, verifyPassword } from '@/lib/auth';
import User from '@/models/User';

export async function GET(request) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: 'Sign in to view your profile.' }, { status: 401 });
  if (session.role !== 'student') return NextResponse.json({ error: 'Student access required.' }, { status: 403 });
  try {
    await dbConnect();
    const user = await User.findById(session.userId).lean();
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: 'Sign in to update your profile.' }, { status: 401 });
  if (session.role !== 'student') return NextResponse.json({ error: 'Student access required.' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'Name must be between 2 and 80 characters.' }, { status: 400 });
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (newPassword && (newPassword.length < 8 || newPassword.length > 128)) return NextResponse.json({ error: 'New password must be between 8 and 128 characters.' }, { status: 400 });

  try {
    await dbConnect();
    const user = await User.findById(session.userId).select('+passwordHash');
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (newPassword) {
      const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
      if (!(await verifyPassword(currentPassword, user.passwordHash))) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 });
      user.passwordHash = await hashPassword(newPassword);
    }
    user.name = name;
    await user.save();
    return setSessionCookie(NextResponse.json({ user: publicUser(user) }), user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not update your profile.' }, { status: 500 });
  }
}
