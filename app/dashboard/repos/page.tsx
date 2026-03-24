import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserRepos } from "@/lib/github-api";
import RepoCard from "@/components/RepoCard";

export const dynamic = "force-dynamic";

export default async function ReposPage() {
  const session = await auth();
  if (!session?.user || !session.accessToken) redirect("/login");

  const repos = await getUserRepos(session.accessToken);

  const teams = await prisma.team.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, apiKey: true, quizConfig: true },
  });

  const configuredRepos = new Map(teams.map((t) => [t.name, t]));

  const configured = repos.filter((r) => configuredRepos.has(r.full_name));
  const available = repos.filter((r) => !configuredRepos.has(r.full_name));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Georgia, serif" }}>
        Tes repos
      </h1>
      <p className="text-sm mb-8" style={{ color: "#b0a8c4" }}>
        Tes repos configures et ceux disponibles a proteger.
      </p>

      {/* Configured repos */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2" style={{ fontFamily: "Georgia, serif" }}>
          Repos configures
          <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
            {configured.length}
          </span>
        </h2>

        {configured.length === 0 ? (
          <div className="rounded-lg p-6 text-center border" style={{ background: "#1a1628", borderColor: "#252036" }}>
            <p style={{ color: "#b0a8c4" }}>
              Aucun repo configure. Choisis un repo ci-dessous pour commencer.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {configured.map((repo) => {
              const team = configuredRepos.get(repo.full_name)!;
              return (
                <RepoCard
                  key={repo.id}
                  repoFullName={repo.full_name}
                  repoName={repo.name}
                  isPrivate={repo.private}
                  language={repo.language}
                  description={repo.description}
                  configured={true}
                  apiKey={team.apiKey}
                  teamId={team.id}
                  initialConfig={team.quizConfig as any}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Available repos */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2" style={{ fontFamily: "Georgia, serif" }}>
          Repos disponibles
          <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: "rgba(94,88,120,0.2)", color: "#8b85a0" }}>
            {available.length}
          </span>
        </h2>

        {available.length === 0 ? (
          <div className="rounded-lg p-6 text-center border" style={{ background: "#1a1628", borderColor: "#252036" }}>
            <p style={{ color: "#b0a8c4" }}>
              Tous tes repos sont deja configures.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {available.map((repo) => (
              <RepoCard
                key={repo.id}
                repoFullName={repo.full_name}
                repoName={repo.name}
                isPrivate={repo.private}
                language={repo.language}
                description={repo.description}
                configured={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
