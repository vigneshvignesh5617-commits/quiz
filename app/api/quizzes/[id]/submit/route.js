import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { readSession } from '@/lib/auth';
import Attempt from '@/models/Attempt';
import Quiz from '@/models/Quiz';
import Result from '@/models/Result';

function resultResponse(result) {
  return {
    resultId: result._id.toString(),
    attemptId: result.attemptId,
    score: result.score,
    total: result.total,
    maxScore: result.maxScore,
    percentage: result.percentage,
    correctCount: result.correctCount,
    wrongCount: result.wrongCount,
    unansweredCount: result.unansweredCount,
    accuracy: result.accuracy,
    timeTakenSeconds: result.timeTakenSeconds,
    review: result.review,
  };
}

export async function POST(request, { params }) {
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: 'Sign in before submitting an exam.' }, { status: 401 });
  if (session.role !== 'student') return NextResponse.json({ error: 'Student access required.' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  if (!attemptId || attemptId.length > 100) return NextResponse.json({ error: 'A valid attempt id is required.' }, { status: 400 });

  try {
    await dbConnect();
    const existingResult = await Result.findOne({ attemptId, userId: session.userId }).lean();
    if (existingResult) return NextResponse.json(resultResponse(existingResult));

    const attempt = await Attempt.findOne({ attemptId, userId: session.userId, quizId: params.id });
    if (!attempt) return NextResponse.json({ error: 'Exam attempt not found.' }, { status: 404 });
    if (attempt.status !== 'in-progress') return NextResponse.json({ error: 'This exam has already been submitted.' }, { status: 409 });

    const now = new Date();
    const timeTakenSeconds = Math.min(attempt.timeLimitSeconds, Math.max(0, Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000)));
    const submittedAfterExpiry = now.getTime() >= attempt.expiresAt.getTime();
    let answers = [...attempt.answers];
    let markedForReview = [...attempt.markedForReview];
    const clientAnswers = body.answers;
    const clientReview = body.markedForReview;
    const clientStateIsValid = Array.isArray(clientAnswers)
      && Array.isArray(clientReview)
      && clientAnswers.length === attempt.questions.length
      && clientReview.length === attempt.questions.length
      && clientAnswers.every((answer, index) => Number.isInteger(answer) && answer >= -1 && answer < attempt.questions[index].options.length)
      && clientReview.every((value) => typeof value === 'boolean');
    if (clientStateIsValid && now.getTime() <= attempt.expiresAt.getTime() + 15000) {
      answers = clientAnswers;
      markedForReview = clientReview;
    }
    if (answers.length !== attempt.questions.length) return NextResponse.json({ error: 'Saved answer state is incomplete.' }, { status: 409 });
    if (!submittedAfterExpiry && answers.includes(-1)) {
      return NextResponse.json({ error: 'Answer every question before submitting.' }, { status: 400 });
    }
    attempt.answers = answers;
    attempt.markedForReview = markedForReview;

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let rawScore = 0;
    const review = attempt.questions.map((question, index) => {
      const selectedIndex = answers[index];
      const isCorrect = selectedIndex === question.correctIndex;
      const isUnanswered = selectedIndex === -1;
      if (isCorrect) correctCount += 1;
      else if (isUnanswered) unansweredCount += 1;
      else wrongCount += 1;

      const marksAwarded = isCorrect ? question.marks : isUnanswered ? 0 : -attempt.negativeMarks;
      rawScore += marksAwarded;
      return {
        questionText: question.questionText,
        options: question.options,
        correctIndex: question.correctIndex,
        selectedIndex,
        isCorrect,
        marksAwarded,
        maxMarks: question.marks,
        explanation: question.explanation || '',
      };
    });

    const score = Math.max(0, Number(rawScore.toFixed(2)));
    const maxScore = attempt.maxScore;
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const accuracy = correctCount + wrongCount > 0
      ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
      : 0;
    const studentName = session.name.slice(0, 100) || 'Student';
    const result = await Result.create({
      quizId: attempt.quizId,
      userId: session.userId,
      attemptId,
      quizTitle: attempt.quizTitle,
      studentName,
      userName: studentName,
      answers,
      review,
      score,
      total: attempt.questions.length,
      maxScore,
      percentage,
      correctCount,
      wrongCount,
      unansweredCount,
      accuracy,
      timeTakenSeconds,
      submittedAt: now,
    });

    attempt.status = 'submitted';
    attempt.submittedAt = now;
    await attempt.save();
    return NextResponse.json(resultResponse(result));
  } catch (error) {
    if (error.code === 11000) {
      const existingResult = await Result.findOne({ attemptId, userId: session.userId }).lean();
      if (existingResult) return NextResponse.json(resultResponse(existingResult));
    }
    console.error(error);
    return NextResponse.json({ error: 'Could not submit this exam.' }, { status: 500 });
  }
}
