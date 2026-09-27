import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { readSession } from '@/lib/auth';
import Attempt from '@/models/Attempt';
import Result from '@/models/Result';

export async function GET(request, { params }) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: 'Sign in to view this result.' }, { status: 401 });
  if (session.role !== 'student') return NextResponse.json({ error: 'Student access required.' }, { status: 403 });
  try {
    await dbConnect();
    if (!mongoose.isValidObjectId(params.resultId)) {
      const attempt = await Attempt.findOne({ attemptId: params.resultId, userId: session.userId, status: 'in-progress' }).lean();
      if (!attempt) return NextResponse.json({ error: 'Active exam not found.' }, { status: 404 });
      return NextResponse.json({
        attempt: {
          attemptId: attempt.attemptId,
          quizId: attempt.quizId.toString(),
          title: attempt.quizTitle,
          maxScore: attempt.maxScore,
          negativeMarks: attempt.negativeMarks,
          expiresAt: attempt.expiresAt,
          startedAt: attempt.startedAt,
          questions: attempt.questions.map((question, index) => ({
            index,
            questionText: question.questionText,
            options: question.options,
            marks: question.marks,
          })),
          answers: attempt.answers,
          markedForReview: attempt.markedForReview,
        },
      });
    }
    const result = await Result.findOne({ _id: params.resultId, userId: session.userId }).lean();
    if (!result) return NextResponse.json({ error: 'Result not found.' }, { status: 404 });
    return NextResponse.json({
      result: {
        id: result._id.toString(),
        quizId: result.quizId.toString(),
        quizTitle: result.quizTitle,
        score: result.score,
        total: result.total,
        maxScore: result.maxScore || result.total,
        percentage: result.percentage,
        correctCount: result.correctCount || 0,
        wrongCount: result.wrongCount || 0,
        unansweredCount: result.unansweredCount || 0,
        accuracy: result.accuracy || 0,
        timeTakenSeconds: result.timeTakenSeconds || 0,
        submittedAt: result.submittedAt,
        review: result.review || [],
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load this result.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: 'Sign in to save your exam progress.' }, { status: 401 });
  if (session.role !== 'student') return NextResponse.json({ error: 'Student access required.' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  if (!Array.isArray(body.answers) || !Array.isArray(body.markedForReview) || body.answers.length !== body.markedForReview.length) {
    return NextResponse.json({ error: 'Answer and review state is invalid.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const attempt = await Attempt.findOne({ attemptId: params.resultId, userId: session.userId, status: 'in-progress' });
    if (!attempt) return NextResponse.json({ error: 'Active exam attempt not found.' }, { status: 404 });
    if (body.answers.length !== attempt.questions.length) return NextResponse.json({ error: 'Answer count does not match this exam.' }, { status: 400 });
    if (Date.now() > attempt.expiresAt.getTime() + 15000) return NextResponse.json({ error: 'The exam timer has expired.' }, { status: 410 });

    for (let index = 0; index < attempt.questions.length; index += 1) {
      const selectedIndex = body.answers[index];
      if (!Number.isInteger(selectedIndex) || selectedIndex < -1 || selectedIndex >= attempt.questions[index].options.length || typeof body.markedForReview[index] !== 'boolean') {
        return NextResponse.json({ error: `Invalid response for question ${index + 1}.` }, { status: 400 });
      }
    }
    attempt.answers = body.answers;
    attempt.markedForReview = body.markedForReview;
    await attempt.save();
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not save exam progress.' }, { status: 500 });
  }
}
