import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateCommitStatus } from "@/lib/github";
import { DEFAULT_QUIZ_CONFIG } from "@/lib/claude";
import type { QuizConfig } from "@/lib/claude";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: { team: { select: { quizConfig: true } } },
  });
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  if (quiz.expiresAt < new Date()) {
    await prisma.quiz.update({
      where: { id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Quiz has expired" }, { status: 410 });
  }

  if (quiz.status === "PASSED") {
    return NextResponse.json(
      { error: "Quiz already passed", score: quiz.score },
      { status: 400 }
    );
  }

  if (quiz.status === "FAILED") {
    return NextResponse.json(
      { error: "Quiz failed — max attempts reached", score: quiz.score },
      { status: 400 }
    );
  }

  const config: QuizConfig = {
    ...DEFAULT_QUIZ_CONFIG,
    ...(quiz.team.quizConfig as Partial<QuizConfig> || {}),
  };

  const questions = quiz.questions as unknown as QuizQuestion[];
  const numQuestions = questions.length;

  let body: { answers: number[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { answers } = body;
  if (!Array.isArray(answers) || answers.length !== numQuestions) {
    return NextResponse.json(
      { error: `answers must be an array of ${numQuestions} numbers` },
      { status: 400 }
    );
  }

  let correctCount = 0;
  const results = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correct;
    if (isCorrect) correctCount++;
    return {
      question_id: q.id,
      correct: isCorrect,
      your_answer: answers[i],
      right_answer: q.correct,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correctCount / numQuestions) * 100);
  const newAttempts = quiz.attempts + 1;

  let newStatus: "PENDING" | "PASSED" | "FAILED" = "PENDING";
  if (score >= config.passingScore) {
    newStatus = "PASSED";
  } else if (newAttempts >= quiz.maxAttempts) {
    newStatus = "FAILED";
  }

  await prisma.quiz.update({
    where: { id },
    data: {
      score,
      attempts: newAttempts,
      status: newStatus,
      submittedAt: new Date(),
    },
  });

  // Update GitHub status
  try {
    if (newStatus === "PASSED") {
      await updateCommitStatus(
        quiz.repo,
        quiz.headSha,
        quiz.callbackToken,
        "success",
        config.language === "en"
          ? `Quiz passed — score ${score}/100`
          : `Quiz réussi — score ${score}/100`
      );
    } else if (newStatus === "FAILED") {
      await updateCommitStatus(
        quiz.repo,
        quiz.headSha,
        quiz.callbackToken,
        "failure",
        config.language === "en"
          ? `Quiz failed — score ${score}/100 (max attempts reached)`
          : `Quiz échoué — score ${score}/100 (max tentatives atteint)`
      );
    }
  } catch (error) {
    console.error("Failed to update GitHub status:", error);
  }

  return NextResponse.json({
    score,
    passed: newStatus === "PASSED",
    correct: correctCount,
    total: numQuestions,
    attempts_remaining:
      newStatus === "PENDING" ? quiz.maxAttempts - newAttempts : 0,
    results,
  });
}
