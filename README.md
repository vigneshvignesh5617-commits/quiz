# QuizMaster — Next.js + MongoDB Quiz / Mock Test App

A full-stack dynamic quiz/mock test web application:

- **Next.js 14 (App Router)** for the frontend and API routes
- **MongoDB + Mongoose** for storing quizzes and results
- **Tailwind CSS** for styling
- Timed quizzes, per-question navigation, instant scoring, and an answer review screen

## Features

- Home page lists all quizzes from the database (title, category, difficulty, question count, time limit)
- Take a quiz with a live countdown timer that auto-submits when it hits zero
- Server-side scoring (correct answers never sent to the client until after submission)
- Result screen with score, percentage, and a full review showing correct vs. selected answers
- Every attempt is saved to a `results` collection in MongoDB
- Seed script with 3 ready-made sample quizzes (JavaScript, React, General Knowledge)
- Student registration, signed sessions, dashboard, and attempt history
- Password recovery and student profile management
- Admin quiz/question management, scheduling, publication controls, and marking rules
- Randomized question/option order, answer autosave, question palette, and review flags
- Per-quiz and overall leaderboards
- Search and filters for category and difficulty
- Upcoming exams, exam instructions, and per-attempt result analysis

## Project Structure

```
quiz-app/
├── app/
│   ├── api/
│   │   └── quizzes/
│   │       ├── route.js              # GET  /api/quizzes            → list quizzes
│   │       └── [id]/
│   │           ├── route.js          # GET  /api/quizzes/:id         → quiz (no answers)
│   │           └── submit/route.js   # POST /api/quizzes/:id/submit  → score + review
│   ├── quiz/[id]/
│   │   ├── page.js                   # Server component: fetches quiz
│   │   └── QuizClient.js             # Client component: timer, UI, submission
│   ├── layout.js
│   ├── page.js                       # Home page (quiz list)
│   └── globals.css
├── lib/dbConnect.js                  # Cached Mongoose connection helper
├── models/
│   ├── Quiz.js
│   └── Result.js
├── scripts/seed.js                   # Seeds sample quizzes into MongoDB
├── .env.example
└── package.json
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure MongoDB

Copy `.env.example` to `.env.local` and set your connection string:

```bash
cp .env.example .env.local
```

```
MONGODB_URI=mongodb://127.0.0.1:27017/quizmaster
AUTH_SECRET=replace-with-a-random-secret-of-at-least-32-characters
ADMIN_BOOTSTRAP_TOKEN=replace-with-a-separate-admin-setup-token
RESEND_API_KEY=re_replace-with-your-resend-api-key
EMAIL_FROM=QuizMaster <onboarding@resend.dev>
APP_URL=http://localhost:3000
```

Generate a session secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Keep `AUTH_SECRET` and `ADMIN_BOOTSTRAP_TOKEN` server-side and never commit `.env.local`. To create the initial administrator, register with the configured admin setup token; all other registrations become student accounts.

Password recovery requires a Resend API key, a verified sender address in `EMAIL_FROM`, and the public site origin in `APP_URL`. Reset links are single-use and expire after 30 minutes.

You can use a local MongoDB instance, Docker (`docker run -d -p 27017:27017 mongo`), or a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster (use its `mongodb+srv://...` URI).

### 3. Seed sample quizzes

```bash
npm run seed
```

This clears any existing quizzes and inserts 3 sample quizzes (5–6 questions each).

### 4. Run the dev server

```bash
npm run dev
```

Visit **http://localhost:3000** — you'll see the quiz list, and can click into any quiz to take it.

### 5. Build for production

```bash
npm run build
npm start
```

## Adding Your Own Quizzes

Edit `scripts/seed.js` and add more objects to the `quizzes` array, following the same shape:

```js
{
  title: 'My Quiz',
  description: 'Short description',
  category: 'Category',
  difficulty: 'Easy' | 'Medium' | 'Hard',
  timeLimitMinutes: 10,
  questions: [
    {
      questionText: 'Question text?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,        // index into options[]
      explanation: 'Optional explanation shown after submission',
    },
    // ...more questions
  ],
}
```

Then re-run `npm run seed` (note: this clears the `quizzes` collection first — adapt the script if
you want to insert without wiping existing data).

Alternatively, insert documents directly into the `quizzes` collection using MongoDB Compass,
`mongosh`, or your own admin script — the app just reads whatever is in that collection.

## Notes

- Correct answers are stripped from the payload sent to the browser when a quiz is fetched;
  scoring happens server-side against the randomized question and option snapshot stored for each attempt.
- Attempt answers and review flags autosave to MongoDB while the exam is active.
- `npm run seed` clears the `quizzes` collection before inserting the sample set. Use the
  protected admin dashboard for normal quiz authoring.
