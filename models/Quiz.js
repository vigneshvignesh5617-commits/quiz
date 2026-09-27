import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: (v) => Array.isArray(v) && v.length >= 2,
    },
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: '' },
    marks: { type: Number, min: 0.01, default: 1 },
  },
  { _id: false }
);

const QuizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    subject: { type: String, default: '' },
    topic: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    timeLimitMinutes: { type: Number, default: 10 },
    negativeMarks: { type: Number, min: 0, default: 0 },
    questionsPerAttempt: { type: Number, min: 0, default: 0 },
    randomizeQuestions: { type: Boolean, default: true },
    randomizeOptions: { type: Boolean, default: true },
    instructions: { type: String, default: '' },
    published: { type: Boolean, default: true },
    availableFrom: { type: Date, default: null },
    availableUntil: { type: Date, default: null },
    questions: { type: [QuestionSchema], required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);
