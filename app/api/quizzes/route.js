import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Quiz from '@/models/Quiz';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const now = new Date();
    const quizzes = await Quiz.find({
      published: { $ne: false },
      $or: [{ availableUntil: null }, { availableUntil: { $gt: now } }],
    }).sort({ createdAt: -1 }).lean();

    const summaries = quizzes.map((q) => ({
      id: q._id.toString(),
      title: q.title,
      description: q.description,
      category: q.category,
      difficulty: q.difficulty,
      timeLimitMinutes: q.timeLimitMinutes,
      questionCount: q.questions.length,
      questionsPerAttempt: q.questionsPerAttempt || 0,
      subject: q.subject || '',
      topic: q.topic || '',
      availableFrom: q.availableFrom || null,
      availableUntil: q.availableUntil || null,
      upcoming: Boolean(q.availableFrom && q.availableFrom > now),
      totalMarks: q.questions.reduce((total, question) => total + (question.marks || 1), 0),
      instructions: q.instructions || '',
    }));

    return NextResponse.json({ quizzes: summaries });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to load quizzes' },
      { status: 500 }
    );
  }
}
