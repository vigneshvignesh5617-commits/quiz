import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Quiz from '@/models/Quiz';
import Result from '@/models/Result';

export async function GET(request, { params }) {
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: 'Invalid quiz id.' }, { status: 400 });

  try {
    await dbConnect();
    const quiz = await Quiz.findById(params.id).select('title').lean();
    if (!quiz) return NextResponse.json({ error: 'Quiz not found.' }, { status: 404 });
    const results = await Result.find({ quizId: params.id })
      .sort({ percentage: -1, score: -1, timeTakenSeconds: 1, submittedAt: 1 })
      .limit(100)
      .select('studentName userName score total percentage timeTakenSeconds submittedAt')
      .lean();
    return NextResponse.json({
      quizTitle: quiz.title,
      entries: results.map((result, index) => ({
        rank: index + 1,
        studentName: result.studentName || result.userName || 'Student',
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        timeTakenSeconds: result.timeTakenSeconds,
        submittedAt: result.submittedAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load the leaderboard.' }, { status: 500 });
  }
}
