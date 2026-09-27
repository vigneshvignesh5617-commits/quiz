import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { hashPassword, publicUser, safeSecretMatches, setSessionCookie } from '@/lib/auth';
import User from '@/models/User';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const adminToken = typeof body.adminToken === 'string' ? body.adminToken : '';

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: 'Name must be between 2 and 80 characters.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 });
  }
  if (!process.env.AUTH_SECRET || Buffer.byteLength(process.env.AUTH_SECRET) < 32) {
    return NextResponse.json({ error: 'The server is missing a valid AUTH_SECRET.' }, { status: 503 });
  }

  let role = 'student';
  if (adminToken) {
    if (!safeSecretMatches(adminToken, process.env.ADMIN_BOOTSTRAP_TOKEN)) {
      return NextResponse.json({ error: 'Admin setup token is invalid.' }, { status: 403 });
    }
    role = 'admin';
  }

  try {
    await dbConnect();
    const existing = await User.exists({ email });
    if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

    const user = await User.create({ name, email, passwordHash: await hashPassword(password), role });
    return setSessionCookie(NextResponse.json({ user: publicUser(user) }, { status: 201 }), user);
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Could not create your account.' }, { status: 500 });
  }
}
