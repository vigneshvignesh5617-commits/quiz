import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Result from '@/models/Result';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const entries = await Result.aggregate([
      { $match: { userId: { $exists: true, $ne: null } } },
      { $group: {
        _id: '$userId',
        studentName: { $last: '$studentName' },
        attemptCount: { $sum: 1 },
        totalScore: { $sum: '$score' },
        totalMaxScore: { $sum: { $ifNull: ['$maxScore', '$total'] } },
        averagePercentage: { $avg: '$percentage' },
        submittedAt: { $max: '$submittedAt' },
      } },
      { $sort: { totalScore: -1, averagePercentage: -1, attemptCount: -1 } },
      { $limit: 100 },
    ]);
    return NextResponse.json({ entries: entries.map((entry, index) => ({
      rank: index + 1,
      studentName: entry.studentName || 'Student',
      attemptCount: entry.attemptCount,
      totalScore: Number(entry.totalScore.toFixed(2)),
      totalMaxScore: entry.totalMaxScore,
      averagePercentage: Math.round(entry.averagePercentage || 0),
      submittedAt: entry.submittedAt,
    })) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Could not load the overall leaderboard.' }, { status: 500 });
  }
}
