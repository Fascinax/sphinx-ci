import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const errorMessages: Record<string, { title: string; desc: string }> = {
    Configuration: {
      title: "Configuration error",
      desc: "There's a problem with the server configuration. This usually means the database is unreachable or OAuth is misconfigured.",
    },
    AccessDenied: {
      title: "Access denied",
      desc: "You don't have permission to sign in. Make sure your GitHub account has access.",
    },
    Verification: {
      title: "Verification error",
      desc: "The verification link has expired or has already been used.",
    },
    Default: {
      title: "Authentication error",
      desc: "Something went wrong during sign in. Please try again.",
    },
  };

  const { title, desc } = errorMessages[error || ""] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0f0c1a" }}>
      <div className="max-w-md text-center">
        
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sphinx-logo.svg" alt="" width="48" height="48" className="mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-red-400 mb-2" style={{ fontFamily: "Georgia, serif" }}>
          {title}
        </h1>
        <p className="mb-6" style={{ color: "#b0a8c4" }}>
          {desc}
        </p>
        {error && (
          <p className="text-xs mb-6 font-mono px-3 py-2 rounded" style={{ color: "#8b85a0", background: "#1a1628" }}>
            Error code: {error}
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: "#c9a84c", color: "#0f0c1a" }}
          >
            Try again
          </Link>
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "#b0a8c4" }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
