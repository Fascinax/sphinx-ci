import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sphinx-ci.vercel.app";

export const metadata: Metadata = {
  title: "sphinx-ci — Code comprehension quizzes before merge",
  description:
    "The Sphinx makes you understand your own code. AI-powered quizzes generated from PR diffs — so you ship code you truly understand.",
  icons: {
    icon: "/sphinx-favicon.png",
  },
  openGraph: {
    title: "sphinx-ci — The Sphinx that makes you understand your own code",
    description:
      "Every PR is a learning moment. sphinx-ci generates a quiz from your actual diff — so you ship code you truly understand.",
    url: appUrl,
    siteName: "sphinx-ci",
    images: [
      {
        url: `${appUrl}/api/og`,
        width: 1200,
        height: 630,
        alt: "sphinx-ci — Code comprehension quizzes before merge",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "sphinx-ci — The Sphinx that makes you understand your own code",
    description:
      "Every PR is a learning moment. AI-powered quizzes from your PR diff.",
    images: [`${appUrl}/api/og`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
