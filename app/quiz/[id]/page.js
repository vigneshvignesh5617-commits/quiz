import ExamClient from './ExamClient';

export default function QuizPage({ params }) {
  return <ExamClient quizId={params.id} />;
}
