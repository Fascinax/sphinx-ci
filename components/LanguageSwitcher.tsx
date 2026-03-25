"use client";

import { useRouter } from "next/navigation";

export default function LanguageSwitcher({ locale }: { locale: "en" | "fr" }) {
  const router = useRouter();

  function switchLocale() {
    const newLocale = locale === "en" ? "fr" : "en";
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    router.refresh();
  }

  return (
    <button
      onClick={switchLocale}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors"
      style={{ borderColor: "#252036", color: "#b0a8c4" }}
      title={locale === "en" ? "Passer en français" : "Switch to English"}
    >
      <span className="text-sm leading-none">{locale === "en" ? "🇫🇷" : "🇬🇧"}</span>
      {locale === "en" ? "FR" : "EN"}
    </button>
  );
}
