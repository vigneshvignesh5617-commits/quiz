import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { publicUser, setSessionCookie, verifyPassword } from '@/lib/auth';
import User from '@/models/User';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });

  try {
    await dbConnect();
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
    }
    return setSessionCookie(NextResponse.json({ user: publicUser(user) }), user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not sign in right now.' }, { status: 500 });
  }
}
