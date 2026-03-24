import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { generateQuizQuestions, DEFAULT_QUIZ_CONFIG } from "@/lib/claude";
import type { QuizConfig } from "@/lib/claude";
import { updateCommitStatus } from "@/lib/github";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  // Auth
  const apiKey = request.headers.get("X-API-Key");
  const team = await validateApiKey(apiKey);
  if (!team) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Check team has Anthropic API key
  if (!team.anthropicApiKey) {
    return NextResponse.json(
      { error: "No Anthropic API key configured for this team. Set it in the dashboard." },
      { status: 400 }
    );
  }

  // Rate limiting: 10 requests/hour per API key
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentQuizCount = await prisma.quiz.count({
    where: {
      teamId: team.id,
      createdAt: { gte: oneHourAgo },
    },
  });
  if (recentQuizCount >= 10) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 quizzes per hour." },
      { status: 429 }
    );
  }

  // Parse body
  let body: {
    repo: string;
    pr_number: number;
    head_sha: string;
    pr_title: string;
    diff: string;
    files_changed: string[];
    callback_token: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repo, pr_number, head_sha, pr_title, diff, files_changed, callback_token } = body;

  if (!repo || !pr_number || !head_sha || !pr_title || !callback_token) {
    return NextResponse.json(
      { error: "Missing required fields: repo, pr_number, head_sha, pr_title, callback_token" },
      { status: 400 }
    );
  }

  // Skip if no meaningful diff
  if (!diff || diff.length < 50) {
    return NextResponse.json({ quiz_url: null, skipped: true });
  }

  // Load team config
  const config: QuizConfig = {
    ...DEFAULT_QUIZ_CONFIG,
    ...(team.quizConfig as Partial<QuizConfig> || {}),
  };

  // Generate questions via Claude with team's API key
  let questions;
  try {
    questions = await generateQuizQuestions(
      pr_title,
      files_changed || [],
      diff.slice(0, 12000),
      team.anthropicApiKey,
      config
    );
  } catch (error) {
    console.error("Claude generation failed:", error);
    return NextResponse.json(
      { error: "Quiz generation failed. PR is not blocked." },
      { status: 503 }
    );
  }

  // Save quiz
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const quiz = await prisma.quiz.create({
    data: {
      teamId: team.id,
      repo,
      prNumber: pr_number,
      headSha: head_sha,
      prTitle: pr_title,
      diff: diff.slice(0, 12000),
      questions: JSON.parse(JSON.stringify(questions)),
      callbackToken: callback_token,
      maxAttempts: config.maxAttempts,
      expiresAt,
    },
  });

  // Post pending status on GitHub
  try {
    await updateCommitStatus(
      repo,
      head_sha,
      callback_token,
      "pending",
      config.language === "en"
        ? "Quiz pending — complete it to unlock merge"
        : "Quiz en attente — complétez-le pour débloquer le merge"
    );
  } catch (error) {
    console.error("Failed to post GitHub status:", error);
  }

  return NextResponse.json(
    {
      quiz_id: quiz.id,
      quiz_url: `${process.env.NEXT_PUBLIC_APP_URL}/q/${quiz.id}`,
      expires_at: expiresAt.toISOString(),
    },
    { status: 201 }
  );
}
