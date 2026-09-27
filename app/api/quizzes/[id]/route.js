import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Quiz from '@/models/Quiz';

export async function GET(request, { params }) {
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  try {
    await dbConnect();
    const quiz = await Quiz.findById(params.id).lean();

    if (!quiz || quiz.published === false) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const safeQuiz = {
      id: quiz._id.toString(),
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      difficulty: quiz.difficulty,
      timeLimitMinutes: quiz.timeLimitMinutes,
      subject: quiz.subject || '',
      topic: quiz.topic || '',
      questionCount: quiz.questions.length,
      questionsPerAttempt: quiz.questionsPerAttempt || 0,
      totalMarks: quiz.questions.reduce((total, question) => total + (question.marks || 1), 0),
      negativeMarks: quiz.negativeMarks || 0,
      instructions: quiz.instructions || '',
      availableFrom: quiz.availableFrom || null,
      availableUntil: quiz.availableUntil || null,
      upcoming: Boolean(quiz.availableFrom && quiz.availableFrom > new Date()),
      expired: Boolean(quiz.availableUntil && quiz.availableUntil <= new Date()),
    };

    return NextResponse.json({ quiz: safeQuiz });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to load quiz' },
      { status: 500 }
    );
  }
}
