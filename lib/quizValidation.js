const difficulties = new Set(['Easy', 'Medium', 'Hard']);

export function validateQuizInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Quiz data is required.' };

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const category = typeof input.category === 'string' ? input.category.trim() : '';
  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  const topic = typeof input.topic === 'string' ? input.topic.trim() : '';
  const difficulty = input.difficulty;
  const timeLimitMinutes = Number(input.timeLimitMinutes);
  const negativeMarks = Number(input.negativeMarks ?? 0);
  const questionsPerAttempt = Number(input.questionsPerAttempt ?? 0);
  const instructions = typeof input.instructions === 'string' ? input.instructions.trim() : '';

  if (!title || title.length > 120) return { error: 'Title is required and must be 120 characters or fewer.' };
  if (description.length > 1000) return { error: 'Description must be 1,000 characters or fewer.' };
  if (!category || category.length > 80) return { error: 'Category is required and must be 80 characters or fewer.' };
  if (subject.length > 80 || topic.length > 120) return { error: 'Subject or topic is too long.' };
  if (!difficulties.has(difficulty)) return { error: 'Choose Easy, Medium, or Hard difficulty.' };
  if (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 240) {
    return { error: 'Time limit must be between 1 and 240 minutes.' };
  }
  if (!Array.isArray(input.questions) || input.questions.length < 1 || input.questions.length > 200) {
    return { error: 'A quiz must have between 1 and 200 questions.' };
  }
  if (!Number.isFinite(negativeMarks) || negativeMarks < 0 || negativeMarks > 1000) return { error: 'Negative marks must be zero or greater.' };
  if (!Number.isInteger(questionsPerAttempt) || questionsPerAttempt < 0 || questionsPerAttempt > input.questions.length) {
    return { error: 'Questions per attempt must be 0 (all questions) or no more than the quiz question count.' };
  }
  if (instructions.length > 5000) return { error: 'Instructions must be 5,000 characters or fewer.' };

  const availableFrom = input.availableFrom ? new Date(input.availableFrom) : null;
  const availableUntil = input.availableUntil ? new Date(input.availableUntil) : null;
  if (availableFrom && Number.isNaN(availableFrom.getTime())) return { error: 'Start date is invalid.' };
  if (availableUntil && Number.isNaN(availableUntil.getTime())) return { error: 'End date is invalid.' };
  if (availableFrom && availableUntil && availableUntil <= availableFrom) return { error: 'End date must be after the start date.' };

  const questions = [];
  for (const [index, question] of input.questions.entries()) {
    const questionText = typeof question?.questionText === 'string' ? question.questionText.trim() : '';
    const options = Array.isArray(question?.options)
      ? question.options.map((option) => typeof option === 'string' ? option.trim() : '')
      : [];
    const correctIndex = Number(question?.correctIndex);
    const explanation = typeof question?.explanation === 'string' ? question.explanation.trim() : '';
    const marks = Number(question?.marks ?? 1);

    if (!questionText || questionText.length > 1000) return { error: `Question ${index + 1} needs text (up to 1,000 characters).` };
    if (options.length < 2 || options.length > 8 || options.some((option) => !option || option.length > 300)) {
      return { error: `Question ${index + 1} needs 2 to 8 non-empty options, each up to 300 characters.` };
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return { error: `Choose a valid correct answer for question ${index + 1}.` };
    }
    if (explanation.length > 2000) return { error: `Explanation ${index + 1} must be 2,000 characters or fewer.` };
    if (!Number.isFinite(marks) || marks <= 0 || marks > 1000) return { error: `Marks for question ${index + 1} must be greater than zero.` };
    questions.push({ questionText, options, correctIndex, explanation, marks });
  }

  return { data: {
    title,
    description,
    category,
    subject,
    topic,
    difficulty,
    timeLimitMinutes,
    negativeMarks,
    questionsPerAttempt,
    randomizeQuestions: input.randomizeQuestions !== false,
    randomizeOptions: input.randomizeOptions !== false,
    instructions,
    published: input.published !== false,
    availableFrom,
    availableUntil,
    questions,
  } };
}
