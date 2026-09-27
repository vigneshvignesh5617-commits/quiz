import { randomInt, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { readSession } from '@/lib/auth';
import Attempt from '@/models/Attempt';
import Quiz from '@/models/Quiz';

function shuffled(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export async function POST(request, { params }) {
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: 'Sign in before starting an exam.' }, { status: 401 });
  if (session.role !== 'student') return NextResponse.json({ error: 'Student access required.' }, { status: 403 });

  try {
    await dbConnect();
    const quiz = await Quiz.findById(params.id).lean();
    if (!quiz || quiz.published === false) return NextResponse.json({ error: 'Exam not found.' }, { status: 404 });

    const now = new Date();
    if (quiz.availableFrom && quiz.availableFrom > now) {
      return NextResponse.json({ error: 'This exam has not opened yet.', availableFrom: quiz.availableFrom }, { status: 409 });
    }
    if (quiz.availableUntil && quiz.availableUntil <= now) {
      return NextResponse.json({ error: 'This exam is closed.' }, { status: 410 });
    }
    if (!quiz.questions?.length) return NextResponse.json({ error: 'This exam has no questions.' }, { status: 400 });

    const questionPool = quiz.questions.map((_, index) => index);
    const orderedPool = quiz.randomizeQuestions === false ? questionPool : shuffled(questionPool);
    const requestedCount = Number.isInteger(quiz.questionsPerAttempt) && quiz.questionsPerAttempt > 0
      ? Math.min(quiz.questionsPerAttempt, questionPool.length)
      : questionPool.length;
    const selectedQuestions = orderedPool.slice(0, requestedCount);
    const snapshots = selectedQuestions.map((questionIndex) => {
      const question = quiz.questions[questionIndex];
      const sourceOptions = question.options.map((_, index) => index);
      const optionOrder = quiz.randomizeOptions === false ? sourceOptions : shuffled(sourceOptions);
      return {
        questionIndex,
        questionText: question.questionText,
        options: optionOrder.map((optionIndex) => question.options[optionIndex]),
        optionOrder,
        correctIndex: optionOrder.indexOf(question.correctIndex),
        explanation: question.explanation || '',
        marks: question.marks || 1,
      };
    });

    const timeLimitSeconds = quiz.timeLimitMinutes * 60;
    const expiresAt = new Date(now.getTime() + timeLimitSeconds * 1000);
    const attemptId = randomUUID();
    const maxScore = snapshots.reduce((total, question) => total + question.marks, 0);
    const attempt = await Attempt.create({
      attemptId,
      userId: session.userId,
      quizId: quiz._id,
      quizTitle: quiz.title,
      questions: snapshots,
      answers: snapshots.map(() => -1),
      markedForReview: snapshots.map(() => false),
      negativeMarks: quiz.negativeMarks || 0,
      maxScore,
      timeLimitSeconds,
      startedAt: now,
      expiresAt,
    });

    return NextResponse.json({
      attemptId: attempt.attemptId,
      quizId: quiz._id.toString(),
      title: quiz.title,
      subject: quiz.subject || '',
      topic: quiz.topic || '',
      difficulty: quiz.difficulty,
      instructions: quiz.instructions || '',
      negativeMarks: attempt.negativeMarks,
      maxScore,
      totalQuestions: snapshots.length,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      questions: snapshots.map((question, index) => ({
        index,
        questionText: question.questionText,
        options: question.options,
        marks: question.marks,
      })),
    }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not start this exam.' }, { status: 500 });
  }
}
