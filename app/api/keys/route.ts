import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    repo: string;
    anthropicApiKey: string;
    config?: {
      numQuestions?: number;
      passingScore?: number;
      maxAttempts?: number;
      language?: "fr" | "en";
      keyword?: string;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.repo || typeof body.repo !== "string") {
    return NextResponse.json({ error: "Missing repo field" }, { status: 400 });
  }

  if (!body.anthropicApiKey || typeof body.anthropicApiKey !== "string") {
    return NextResponse.json(
      { error: "Missing anthropicApiKey field" },
      { status: 400 }
    );
  }

  // Check if already configured
  const existing = await prisma.team.findFirst({
    where: { name: body.repo, userId: session.user.id },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This repo is already configured", apiKey: existing.apiKey },
      { status: 409 }
    );
  }

  const apiKey = `spx_${randomBytes(24).toString("hex")}`;

  const quizConfig = {
    numQuestions: body.config?.numQuestions ?? 10,
    passingScore: body.config?.passingScore ?? 70,
    maxAttempts: body.config?.maxAttempts ?? 3,
    language: body.config?.language ?? "fr",
    keyword: body.config?.keyword ?? "/sphinx",
  };

  const team = await prisma.team.create({
    data: {
      name: body.repo,
      apiKey,
      userId: session.user.id,
      anthropicApiKey: body.anthropicApiKey,
      quizConfig,
    },
  });

  return NextResponse.json(
    { id: team.id, apiKey: team.apiKey, repo: team.name },
    { status: 201 }
  );
}
