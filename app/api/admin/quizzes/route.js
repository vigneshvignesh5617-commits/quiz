import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { readSession } from '@/lib/auth';
import { validateQuizInput } from '@/lib/quizValidation';
import Quiz from '@/models/Quiz';

function adminOnly(request) {
  const session = readSession(request);
  return session?.role === 'admin' ? null : NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
}

export async function GET(request) {
  const denied = adminOnly(request);
  if (denied) return denied;

  try {
    await dbConnect();
    const quizzes = await Quiz.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ quizzes: quizzes.map((quiz) => ({ ...quiz, id: quiz._id.toString(), _id: undefined })) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load quizzes.' }, { status: 500 });
  }
}

export async function POST(request) {
  const denied = adminOnly(request);
  if (denied) return denied;

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
    const quiz = await Quiz.create(validated.data);
    return NextResponse.json({ id: quiz._id.toString() }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not create quiz.' }, { status: 500 });
  }
}
