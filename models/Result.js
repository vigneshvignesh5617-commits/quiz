import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true },
  selectedIndex: { type: Number, default: -1 },
  isCorrect: { type: Boolean, required: true },
  marksAwarded: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 1 },
  explanation: { type: String, default: '' },
}, { _id: false });

const ResultSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    attemptId: { type: String, unique: true, sparse: true },
    quizTitle: { type: String, required: true },
    studentName: { type: String, default: 'Anonymous' },
    userName: { type: String, default: 'Anonymous' },
    answers: { type: [Number], default: [] },
    review: { type: [ReviewSchema], default: [] },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    maxScore: { type: Number, default: 0 },
    percentage: { type: Number, required: true },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    unansweredCount: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Result || mongoose.model('Result', ResultSchema);
