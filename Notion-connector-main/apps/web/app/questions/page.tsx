import Link from "next/link";

const COMPANIES = [
  {
    name: "LARI EUROPE TEST",
    slug: "lari-europe-test",
  },
  {
    name: "LARI TEST INNO",
    slug: "lari-test-inno",
  },
] as const;

export default function QuestionsPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-white">
      <section className="w-full max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          Questionnaire
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          À quelle entreprise appartenez-vous ?
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-400">
          Sélectionnez votre entreprise pour accéder au questionnaire qui lui
          correspond.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {COMPANIES.map((company) => (
            <Link
              key={company.slug}
              href={`/questions/${company.slug}`}
              className="group rounded-2xl border border-white/10 bg-neutral-950/70 p-6 transition hover:border-neutral-500 hover:bg-neutral-900"
            >
              <span className="text-lg font-medium text-white">
                {company.name}
              </span>
              <span className="mt-3 block text-sm text-neutral-500 transition group-hover:text-neutral-300">
                Accéder au questionnaire →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
