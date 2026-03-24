import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface QuizConfig {
  numQuestions?: number;
  passingScore?: number;
  maxAttempts?: number;
  language?: string;
  keyword?: string;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teams = await prisma.team.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { quizzes: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const quizStats = await prisma.quiz.groupBy({
    by: ["status"],
    where: { team: { userId: session.user.id } },
    _count: true,
  });

  const totalQuizzes = quizStats.reduce((sum, s) => sum + s._count, 0);
  const passedQuizzes =
    quizStats.find((s) => s.status === "PASSED")?._count || 0;
  const passRate =
    totalQuizzes > 0 ? Math.round((passedQuizzes / totalQuizzes) * 100) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg p-4 border" style={{ background: "#1a1628", borderColor: "#252036" }}>
          <p className="text-sm text-gray-400">Repos configures</p>
          <p className="text-2xl font-bold text-white">{teams.length}</p>
        </div>
        <div className="rounded-lg p-4 border" style={{ background: "#1a1628", borderColor: "#252036" }}>
          <p className="text-sm text-gray-400">Quiz total</p>
          <p className="text-2xl font-bold text-white">{totalQuizzes}</p>
        </div>
        <div className="rounded-lg p-4 border" style={{ background: "#1a1628", borderColor: "#252036" }}>
          <p className="text-sm text-gray-400">Taux de reussite</p>
          <p className="text-2xl font-bold" style={{ color: "#c9a84c" }}>{passRate}%</p>
        </div>
      </div>

      {/* API Keys */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Tes repos</h2>
          <Link
            href="/dashboard/repos"
            className="text-sm px-4 py-2 font-medium rounded-lg transition-all"
            style={{ background: "#c9a84c", color: "#0f0c1a" }}
          >
            + Configurer un repo
          </Link>
        </div>

        {teams.length === 0 ? (
          <div className="rounded-lg p-6 text-center border" style={{ background: "#1a1628", borderColor: "#252036" }}>
            <p className="text-gray-400 mb-3">
              Aucun repo configure. Ajoute ton premier repo pour commencer.
            </p>
            <Link
              href="/dashboard/repos"
              className="text-sm"
              style={{ color: "#c9a84c" }}
            >
              Voir tes repos →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => {
              const config = (team.quizConfig || {}) as QuizConfig;
              return (
                <div
                  key={team.id}
                  className="rounded-lg p-4 border"
                  style={{ background: "#1a1628", borderColor: "#252036" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{team.name}</p>
                      <p className="text-sm text-gray-400 font-mono">
                        {team.apiKey.slice(0, 12)}...{team.apiKey.slice(-6)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-400">
                      {team._count.quizzes} quiz
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                      {config.numQuestions || 10} questions
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                      Score min {config.passingScore || 70}%
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                      {config.maxAttempts || 3} tentatives
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                      {config.language === "en" ? "EN" : "FR"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                      {config.keyword || "/sphinx"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
