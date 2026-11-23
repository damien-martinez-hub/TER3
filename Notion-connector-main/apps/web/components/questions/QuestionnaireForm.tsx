"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useNotionConnection } from "@/hooks/useNotionConnection";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { NotionDatabase, NotionQueryResult } from "@/types/notion";

const QUESTIONS = [
  { id: "name", label: "Quel est votre nom complet ?", type: "text" },
  { id: "email", label: "Quelle est votre adresse e-mail ?", type: "email" },
  {
    id: "request",
    label: "Comment pouvons-nous vous aider ?",
    type: "textarea",
  },
] as const;

const QUESTIONS2 = [
  { id: "name", label: "Quel est votre nom complet ?", type: "text" },
  { id: "email", label: "Quelle est votre adresse e-mail ?", type: "email" },
  {
    id: "request",
    label: "Comment pouvons-nous vous aider XXX?",
    type: "textarea",
  },
] as const;

export function QuestionnaireForm({ company }: { company: string }) {
  const activeQuestions =
    company === "LARI EUROPE TEST" ? QUESTIONS2 : QUESTIONS;
  const { state } = useNotionConnection();
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [databaseId, setDatabaseId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPageUrl, setSavedPageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "connected") return;

    let cancelled = false;
    setLoadingDatabases(true);
    setError(null);

    apiClient
      .post<NotionQueryResult>("/notion/query", { action: "list_databases" })
      .then((result) => {
        if (cancelled) return;
        const availableDatabases = result.databases ?? [];
        setDatabases(availableDatabases);
        setDatabaseId(availableDatabases[0]?.id ?? "");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Impossible de charger les bases de données Notion."
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingDatabases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [state]);

  function updateAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSavedPageUrl(null);
    setSubmitting(true);

    try {
      const result = await apiClient.post<{ id: string; url: string }>(
        "/notion/query",
        {
          action: "create_page",
          params: {
            databaseId,
            title: `${company} — ${answers.name.trim()}`,
            answers: [
              { question: "Entreprise", answer: company },
              ...activeQuestions.map((question) => ({
                question: question.label,
                answer: (answers[question.id] ?? "").trim(),
              })),
            ],
          },
        }
      );
      setSavedPageUrl(result.url);
      setAnswers({});
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Une erreur est survenue pendant l'enregistrement des réponses."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" label="Vérification de la connexion Notion…" />
      </main>
    );
  }

  if (state !== "connected") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-neutral-950/70 p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Questionnaire</h1>
          <p className="mt-3 text-sm text-neutral-400">
            Connectez votre espace Notion pour choisir une base et enregistrer
            les réponses.
          </p>
          <Link
            href={state === "error" ? "/dashboard" : "/connect"}
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-medium text-black hover:bg-neutral-200"
          >
            {state === "error" ? "Réessayer" : "Connecter Notion"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <Link
            href="/questions"
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            ← Changer d’entreprise
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Questionnaire {company}
          </h1>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Répondez aux questions ci-dessous. Vos réponses seront enregistrées
            dans une nouvelle page de la base Notion sélectionnée.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-white/10 bg-neutral-950/70 p-6 sm:p-8"
        >
          <div>
            <label
              htmlFor="notion-database"
              className="mb-2 block text-sm font-medium text-neutral-200"
            >
              Base de données Notion
            </label>
            {loadingDatabases ? (
              <p className="text-sm text-neutral-400">Chargement des bases…</p>
            ) : databases.length > 0 ? (
              <select
                id="notion-database"
                required
                value={databaseId}
                onChange={(event) => setDatabaseId(event.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-neutral-500"
              >
                {databases.map((database) => (
                  <option key={database.id} value={database.id}>
                    {database.title || "Base sans titre"}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-neutral-400">
                Aucune base accessible trouvée. Partagez une base avec
                l’intégration Notion, puis actualisez cette page.
              </p>
            )}
          </div>
          {activeQuestions.map((question) => (
            <div key={question.id}>
              <label
                htmlFor={question.id}
                className="mb-2 block text-sm font-medium text-neutral-200"
              >
                {question.label}
              </label>
              {question.type === "textarea" ? (
                <textarea
                  id={question.id}
                  required
                  maxLength={2000}
                  rows={5}
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    updateAnswer(question.id, event.target.value)
                  }
                  className="w-full resize-y rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
                  placeholder="Écrivez votre réponse…"
                />
              ) : (
                <input
                  id={question.id}
                  type={question.type}
                  required
                  maxLength={2000}
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    updateAnswer(question.id, event.target.value)
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-500"
                  placeholder={
                    question.id === "email"
                      ? "vous@exemple.com"
                      : "Votre nom"
                  }
                />
              )}
            </div>
          ))}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {savedPageUrl && (
            <p
              role="status"
              className="rounded-xl border border-emerald-900/70 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
            >
              Réponses enregistrées.{" "}
              <a
                href={savedPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Ouvrir la page Notion
              </a>
            </p>
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              loadingDatabases ||
              databases.length === 0 ||
              !databaseId
            }
            className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Envoyer les réponses"}
          </button>
        </form>
      </div>
    </main>
  );
}
