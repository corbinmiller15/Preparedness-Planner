import { DEFAULT_LOCALE, t } from "@/lib/i18n";

const locale = DEFAULT_LOCALE;

export default function Home() {
  return (
    <div className="min-h-full">
      <p
        data-testid="disclaimer"
        className="bg-alert px-5 py-3 text-center text-sm font-semibold tracking-wide text-alert-ink sm:text-base"
      >
        {t("home.disclaimer", locale)}
      </p>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-5 py-12 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            {t("home.eyebrow", locale)}
          </p>
          <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
            {t("home.title", locale)}
          </h1>
          <p className="text-base leading-7 text-ink sm:text-lg">{t("home.lede", locale)}</p>
        </header>
        <ul className="flex flex-col gap-3 border-t border-line pt-6 text-sm leading-6 text-ink sm:text-base">
          <li>{t("home.point.water", locale)}</li>
          <li>{t("home.point.calories", locale)}</li>
          <li>{t("home.point.kit", locale)}</li>
        </ul>
        <p className="text-sm leading-6 text-muted">{t("home.pending", locale)}</p>
      </main>
      <footer className="mx-auto w-full max-w-xl px-5 pb-12 text-sm leading-6 text-muted">
        {t("home.footer", locale)}
      </footer>
    </div>
  );
}
