import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { readSession } from '@/lib/auth';
import { validateQuizInput } from '@/lib/quizValidation';
import Quiz from '@/models/Quiz';

function adminOnly(request) {
  const session = readSession(request);
  return session?.role === 'admin' ? null : NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
}

export async function PUT(request, { params }) {
  const denied = adminOnly(request);
  if (denied) return denied;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid quiz id.' }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const validated = validateQuizInput(body);
  if (validated.error) return NextResponse.json({ error: validated.error }, { status: 400 });

  try {
    await dbConnect();
    const quiz = await Quiz.findByIdAndUpdate(params.id, validated.data, { new: true, runValidators: true }).lean();
    if (!quiz) return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not update quiz.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const denied = adminOnly(request);
  if (denied) return denied;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid quiz id.' }, { status: 400 });

  try {
    await dbConnect();
    const quiz = await Quiz.findByIdAndDelete(params.id);
    if (!quiz) return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not delete quiz.' }, { status: 500 });
  }
}
