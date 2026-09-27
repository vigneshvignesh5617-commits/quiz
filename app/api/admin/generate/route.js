import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { readSession } from '@/lib/auth';
import { validateQuizInput } from '@/lib/quizValidation';
import Quiz from '@/models/Quiz';

function parseJson(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

function interactionText(interaction) {
  if (typeof interaction.output_text === 'string') return interaction.output_text;
  return (interaction.steps || [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content || [])
    .filter((content) => content.type === 'text')
    .map((content) => content.text || '')
    .join('');
}

export async function POST(request) {
  const session = readSession(request);
  if (!session || !['admin', 'student'].includes(session.role)) {
    return NextResponse.json({ error: 'Sign in with a student or administrator account.' }, { status: 403 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI generation is not configured. Add GEMINI_API_KEY to the server environment.' }, { status: 503 });
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  const syllabus = typeof input.syllabus === 'string' ? input.syllabus.trim() : '';
  const category = typeof input.category === 'string' ? input.category.trim() : 'General';
  const difficulty = ['Easy', 'Medium', 'Hard'].includes(input.difficulty) ? input.difficulty : 'Medium';
  const questionCount = Math.min(15, Math.max(1, Number(input.questionCount) || 5));
  const duration = Math.min(240, Math.max(1, Number(input.duration) || 15));
  const negativeMarks = Math.min(1000, Math.max(0, Number(input.negativeMarks) || 0));

  if (!subject || subject.length > 120) return NextResponse.json({ error: 'Enter a subject or core topic.' }, { status: 400 });
  if (syllabus.length > 12000) return NextResponse.json({ error: 'Source material must be 12,000 characters or fewer.' }, { status: 400 });

  const prompt = `Create a rigorous multiple-choice mock exam about ${subject}. Difficulty: ${difficulty}. Generate exactly ${questionCount} questions. Each question must have exactly four plausible options and one correct answer. ${syllabus ? `Use this source material as the primary scope and do not invent topics outside it:\n${syllabus}` : 'Cover the most important concepts and vary the question styles.'}

Return only valid JSON matching this shape:
{"title":"...","description":"...","instructions":"...","questions":[{"questionText":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"...","marks":1}]}
Do not include markdown, commentary, or an answer key outside the JSON.`;

  try {
    const configuredModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const models = [configuredModel, 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'].filter((model, index, all) => all.indexOf(model) === index);
    let body;
    let lastError;
    for (const model of models) {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          model,
          input: prompt,
          system_instruction: 'You are an expert exam author. Follow the requested JSON shape exactly.',
          generation_config: { temperature: 0.5 },
          response_format: [{
            type: 'text',
            mime_type: 'application/json',
            schema: {
          type: 'object',
          required: ['title', 'description', 'instructions', 'questions'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            instructions: { type: 'string' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['questionText', 'options', 'correctIndex', 'explanation', 'marks'],
                properties: {
                  questionText: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
                  correctIndex: { type: 'integer', minimum: 0, maximum: 3 },
                  explanation: { type: 'string' },
                  marks: { type: 'number', minimum: 0.01 },
                },
              },
            },
          },
            },
          }],
          store: false,
        }),
      });
      body = await response.json();
      if (response.ok) {
        lastError = null;
        break;
      }
      lastError = new Error(body.error?.message || body.message || 'Gemini could not generate an exam.');
      if (![429, 500, 502, 503, 504].includes(response.status)) throw lastError;
    }
    if (!body || lastError) throw lastError || new Error('Gemini could not generate an exam.');

    const generated = parseJson(interactionText(body));
    const validated = validateQuizInput({
      ...generated,
      category,
      subject,
      topic: subject,
      difficulty,
      timeLimitMinutes: duration,
      negativeMarks,
      questionsPerAttempt: 0,
      randomizeQuestions: true,
      randomizeOptions: true,
      published: session.role === 'student',
    });
    if (validated.error) throw new Error(`Generated exam failed validation: ${validated.error}`);

    if (session.role === 'student') {
      await dbConnect();
      const quiz = await Quiz.create(validated.data);
      return NextResponse.json({ id: quiz._id.toString(), quiz: validated.data });
    }

    return NextResponse.json({ quiz: validated.data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Could not generate an exam.' }, { status: 502 });
  }
}
