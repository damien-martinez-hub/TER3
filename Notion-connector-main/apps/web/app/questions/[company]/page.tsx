import { notFound } from "next/navigation";
import { QuestionnaireForm } from "@/components/questions/QuestionnaireForm";

const COMPANIES: Record<string, string> = {
  "lari-europe-test": "LARI EUROPE TEST",
  "lari-test-inno": "LARI TEST INNO",
};

export default async function CompanyQuestionnairePage({
  params,
}: {
  params: Promise<{ company: string }>;
}) {
  const { company: slug } = await params;
  const company = COMPANIES[slug];

  if (!company) {
    notFound();
  }

  return <QuestionnaireForm company={company} />;
}
