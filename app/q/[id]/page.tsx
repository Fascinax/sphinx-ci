import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import QuizPlayer from "@/components/QuizPlayer";

export const dynamic = "force-dynamic";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

function sanitizeQuestions(questions: QuizQuestion[]) {
  return questions.map(({ id, question, options }) => ({
    id,
    question,
    options,
  }));
}

function QuizNav({ repo, prNumber }: { repo: string; prNumber: number }) {
  return (
    <nav
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ borderColor: "#252036" }}
    >
      <Link href="/" className="flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
          <path d="M50 8L90 35V65L50 92L10 65V35L50 8Z" stroke="#c9a84c" strokeWidth="4" fill="#c9a84c" fillOpacity="0.1" />
          <circle cx="38" cy="45" r="5" fill="#c9a84c" />
          <circle cx="62" cy="45" r="5" fill="#c9a84c" />
          <path d="M35 62C35 62 42 70 50 70C58 70 65 62 65 62" stroke="#c9a84c" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-lg font-bold" style={{ color: "#c9a84c" }}>
          sphinx-ci
        </span>
      </Link>
      <div className="text-sm" style={{ color: "#b0a8c4" }}>
        {repo} <span style={{ color: "#8b85a0" }}>#{prNumber}</span>
      </div>
    </nav>
  );
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await prisma.quiz.findUnique({ where: { id } });

  if (!quiz) {
    notFound();
  }

  const questions = quiz.questions as unknown as QuizQuestion[];
  const isExpired = quiz.expiresAt < new Date();

  // Expired
  if (isExpired || quiz.status === "EXPIRED") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0c1a" }}>
        <QuizNav repo={quiz.repo} prNumber={quiz.prNumber} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="text-6xl mb-6">&#x23F3;</div>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
              Quiz expire
            </h1>
            <p style={{ color: "#b0a8c4" }}>
              Ce quiz a expire. Commente <code style={{ color: "#c9a84c" }}>/sphinx</code> sur la PR pour en generer un nouveau.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Already passed
  if (quiz.status === "PASSED") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0c1a" }}>
        <QuizNav repo={quiz.repo} prNumber={quiz.prNumber} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="text-6xl mb-6">&#x1F3DB;</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#c9a84c", fontFamily: "Georgia, serif" }}>
              Quiz reussi — {quiz.score}/100
            </h1>
            <p style={{ color: "#b0a8c4" }}>
              Le merge est debloque.
            </p>
            <p className="text-sm mt-4" style={{ color: "#8b85a0" }}>
              {quiz.repo} — PR #{quiz.prNumber}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Failed definitively
  if (quiz.status === "FAILED") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0f0c1a" }}>
        <QuizNav repo={quiz.repo} prNumber={quiz.prNumber} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="text-6xl mb-6">&#x1F480;</div>
            <h1 className="text-2xl font-bold text-red-400 mb-2" style={{ fontFamily: "Georgia, serif" }}>
              Quiz echoue — {quiz.score}/100
            </h1>
            <p style={{ color: "#b0a8c4" }}>
              Toutes les tentatives ont ete utilisees. Le merge reste bloque.
            </p>
            <p className="text-sm mt-4" style={{ color: "#8b85a0" }}>
              {quiz.repo} — PR #{quiz.prNumber}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pending — show interactive quiz
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0f0c1a" }}>
      <QuizNav repo={quiz.repo} prNumber={quiz.prNumber} />
      <div className="flex-1 p-4 md:p-8">
        <QuizPlayer
          quizId={quiz.id}
          questions={sanitizeQuestions(questions)}
          prTitle={quiz.prTitle}
          repo={quiz.repo}
          attempts={quiz.attempts}
          maxAttempts={quiz.maxAttempts}
        />
      </div>
    </div>
  );
}
