import { NextResponse } from 'next/server';
import { publicUser, readSession } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function GET(request) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ user: null });

  try {
    await dbConnect();
    const user = await User.findById(session.userId).lean();
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load the current account.' }, { status: 500 });
  }
}
