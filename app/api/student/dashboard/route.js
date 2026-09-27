import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { readSession } from '@/lib/auth';
import Quiz from '@/models/Quiz';
import Result from '@/models/Result';

export async function GET(request) {
  const session = readSession(request);
  if (!session) return NextResponse.json({ error: 'Sign in to view your dashboard.' }, { status: 401 });
  if (session.role !== 'student') return NextResponse.json({ error: 'Student access required.' }, { status: 403 });

  try {
    await dbConnect();
    const now = new Date();
    const [quizzes, attempts] = await Promise.all([
      Quiz.find({
        published: { $ne: false },
        $or: [{ availableUntil: null }, { availableUntil: { $gt: now } }],
      }).sort({ createdAt: -1 }).select('title category subject topic difficulty timeLimitMinutes questions availableFrom availableUntil instructions negativeMarks').lean(),
      Result.find({ userId: session.userId }).sort({ submittedAt: -1 }).select('quizId quizTitle score total percentage timeTakenSeconds submittedAt').lean(),
    ]);
    const quizSummaries = quizzes.map((quiz) => ({
      id: quiz._id.toString(),
      title: quiz.title,
      category: quiz.category,
      subject: quiz.subject || '',
      topic: quiz.topic || '',
      difficulty: quiz.difficulty,
      timeLimitMinutes: quiz.timeLimitMinutes,
      questionCount: quiz.questions.length,
      totalMarks: quiz.questions.reduce((total, question) => total + (question.marks || 1), 0),
      availableFrom: quiz.availableFrom || null,
      availableUntil: quiz.availableUntil || null,
      instructions: quiz.instructions || '',
      negativeMarks: quiz.negativeMarks || 0,
    }));
    const attemptsData = attempts.map((attempt) => ({
      id: attempt._id.toString(),
      quizId: attempt.quizId.toString(),
      quizTitle: attempt.quizTitle,
      score: attempt.score,
      maxScore: attempt.maxScore || attempt.total,
      total: attempt.total,
      percentage: attempt.percentage,
      timeTakenSeconds: attempt.timeTakenSeconds,
      submittedAt: attempt.submittedAt,
    }));
    const availableExams = quizSummaries.filter((quiz) => !quiz.availableFrom || quiz.availableFrom <= now);
    const upcomingExams = quizSummaries.filter((quiz) => quiz.availableFrom && quiz.availableFrom > now);
    const averageScore = attemptsData.length
      ? Math.round(attemptsData.reduce((sum, attempt) => sum + attempt.percentage, 0) / attemptsData.length)
      : 0;
    const bestScore = attemptsData.length
      ? Math.max(...attemptsData.map((attempt) => attempt.percentage))
      : 0;
    return NextResponse.json({
      user: { id: session.userId, name: session.name, email: session.email },
      quizzes: quizSummaries,
      availableExams,
      upcomingExams,
      attempts: attemptsData,
      completedCount: attemptsData.length,
      attemptCount: attemptsData.length,
      bestScore,
      averageScore,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load your dashboard.' }, { status: 500 });
  }
}
