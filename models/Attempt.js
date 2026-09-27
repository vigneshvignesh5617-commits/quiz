import mongoose from 'mongoose';

const AttemptQuestionSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  optionOrder: { type: [Number], required: true },
  correctIndex: { type: Number, required: true },
  explanation: { type: String, default: '' },
  marks: { type: Number, default: 1 },
}, { _id: false });

const AttemptSchema = new mongoose.Schema({
  attemptId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  quizTitle: { type: String, required: true },
  questions: { type: [AttemptQuestionSchema], required: true },
  answers: { type: [Number], required: true },
  markedForReview: { type: [Boolean], required: true },
  negativeMarks: { type: Number, default: 0 },
  maxScore: { type: Number, required: true },
  timeLimitSeconds: { type: Number, required: true },
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['in-progress', 'submitted'], default: 'in-progress' },
  submittedAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.Attempt || mongoose.model('Attempt', AttemptSchema);
