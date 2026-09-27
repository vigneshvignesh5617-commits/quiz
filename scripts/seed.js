/**
 * Seed the database with sample quizzes.
 * Run with: npm run seed
 */
require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
  require('dotenv').config({ path: '.env' });
}

const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    questionText: String,
    options: [String],
    correctIndex: Number,
    explanation: String,
    marks: { type: Number, default: 1 },
  },
  { _id: false }
);

const QuizSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    category: String,
    subject: { type: String, default: '' },
    topic: { type: String, default: '' },
    difficulty: String,
    timeLimitMinutes: Number,
    negativeMarks: { type: Number, default: 0 },
    questionsPerAttempt: { type: Number, default: 0 },
    randomizeQuestions: { type: Boolean, default: true },
    randomizeOptions: { type: Boolean, default: true },
    instructions: { type: String, default: '' },
    published: { type: Boolean, default: true },
    availableFrom: { type: Date, default: null },
    availableUntil: { type: Date, default: null },
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', QuizSchema);

const quizzes = [
  {
    title: 'JavaScript Fundamentals',
    description: 'Test your knowledge of core JavaScript concepts.',
    category: 'Programming',
    difficulty: 'Easy',
    timeLimitMinutes: 5,
    questions: [
      {
        questionText: "What does 'typeof []' return in JavaScript?",
        options: ['array', 'object', 'undefined', 'list'],
        correctIndex: 1,
        explanation: "Arrays are a type of object in JavaScript, so typeof returns 'object'.",
      },
      {
        questionText: 'Which keyword declares a block-scoped variable?',
        options: ['var', 'let', 'function', 'global'],
        correctIndex: 1,
        explanation: "'let' (and 'const') are block-scoped, unlike 'var' which is function-scoped.",
      },
      {
        questionText: "What is the output of '2' + 2 in JavaScript?",
        options: ['4', '22', 'NaN', 'Error'],
        correctIndex: 1,
        explanation: "The '+' operator concatenates when one operand is a string, giving '22'.",
      },
      {
        questionText: 'Which method adds an element to the end of an array?',
        options: ['push()', 'pop()', 'shift()', 'unshift()'],
        correctIndex: 0,
        explanation: 'push() appends one or more elements to the end of an array.',
      },
      {
        questionText: "What does '===' check for?",
        options: [
          'Value only',
          'Type only',
          'Value and type',
          'Reference only',
        ],
        correctIndex: 2,
        explanation: "'===' is the strict equality operator; it compares both value and type.",
      },
    ],
  },
  {
    title: 'React Basics',
    description: 'A quick check on fundamental React concepts.',
    category: 'Programming',
    difficulty: 'Medium',
    timeLimitMinutes: 6,
    questions: [
      {
        questionText: 'Which hook is used to manage state in a function component?',
        options: ['useEffect', 'useState', 'useRef', 'useMemo'],
        correctIndex: 1,
        explanation: 'useState returns a stateful value and a function to update it.',
      },
      {
        questionText: 'What does JSX stand for?',
        options: [
          'JavaScript XML',
          'Java Syntax Extension',
          'JSON XML',
          'JavaScript Extra',
        ],
        correctIndex: 0,
        explanation: 'JSX stands for JavaScript XML, a syntax extension for JavaScript.',
      },
      {
        questionText: 'Which hook runs side effects after render?',
        options: ['useState', 'useContext', 'useEffect', 'useReducer'],
        correctIndex: 2,
        explanation: 'useEffect lets you perform side effects after the component renders.',
      },
      {
        questionText: 'How do you pass data from a parent to a child component?',
        options: ['State', 'Props', 'Context only', 'Refs'],
        correctIndex: 1,
        explanation: 'Props are the standard way to pass data down to child components.',
      },
      {
        questionText: "What is the virtual DOM?",
        options: [
          'A browser API',
          'A lightweight copy of the real DOM used for diffing',
          'A CSS framework',
          'A database',
        ],
        correctIndex: 1,
        explanation: 'React uses a virtual DOM to efficiently compute minimal real DOM updates.',
      },
    ],
  },
  {
    title: 'General Knowledge',
    description: 'A mixed bag of general awareness questions.',
    category: 'General',
    difficulty: 'Easy',
    timeLimitMinutes: 5,
    questions: [
      {
        questionText: 'Which is the largest planet in our solar system?',
        options: ['Earth', 'Jupiter', 'Saturn', 'Mars'],
        correctIndex: 1,
        explanation: 'Jupiter is the largest planet by both mass and volume.',
      },
      {
        questionText: 'Who wrote the play "Romeo and Juliet"?',
        options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Leo Tolstoy'],
        correctIndex: 1,
        explanation: 'William Shakespeare wrote Romeo and Juliet in the early 1590s.',
      },
      {
        questionText: 'What is the capital of Japan?',
        options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'],
        correctIndex: 2,
        explanation: 'Tokyo has been the capital of Japan since 1868.',
      },
      {
        questionText: 'How many continents are there on Earth?',
        options: ['5', '6', '7', '8'],
        correctIndex: 2,
        explanation: 'The commonly taught model has seven continents.',
      },
      {
        questionText: 'Which gas do plants primarily absorb for photosynthesis?',
        options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
        correctIndex: 2,
        explanation: 'Plants absorb carbon dioxide and release oxygen during photosynthesis.',
      },
    ],
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Create a .env.local file first (see .env.example).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await Quiz.deleteMany({});
  console.log('Cleared existing quizzes');

  const inserted = await Quiz.insertMany(quizzes);
  console.log(`Inserted ${inserted.length} quizzes:`);
  inserted.forEach((q) => console.log(`  - ${q.title} (${q._id})`));

  await mongoose.disconnect();
  console.log('Done. Disconnected.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
