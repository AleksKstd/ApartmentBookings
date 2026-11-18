import Link from "next/link";
import { CircleCheck, CircleDashed, CircleX, TriangleAlert } from "lucide-react";
import { testEmail, testStripe, testSupabase } from "@/app/admin/actions/integrations";
import { ActionButton } from "@/components/admin/form-kit";
import { PageHeader, Panel } from "@/components/admin/ui";
import { type CheckState, integrationReport, overallState } from "@/lib/integrations";
import { cn } from "@/lib/utils";

export const metadata = { title: "Интеграции" };

const STATE: Record<CheckState, { label: string; className: string; Icon: typeof CircleCheck }> = {
  ok: { label: "Готово", className: "bg-green-100 text-green-800", Icon: CircleCheck },
  warn: { label: "Проверете", className: "bg-amber-100 text-amber-800", Icon: TriangleAlert },
  missing: { label: "Не е настроено", className: "bg-red-100 text-red-800", Icon: CircleX },
  optional: { label: "По избор", className: "bg-sand-200 text-ink-muted", Icon: CircleDashed },
};

const TESTS = {
  supabase: { action: testSupabase, label: "Провери връзката" },
  stripe: { action: testStripe, label: "Провери Stripe и webhook" },
  email: { action: testEmail, label: "Изпрати тестов имейл" },
} as const;

const GUIDES: Partial<Record<string, React.ReactNode>> = {
  calendar: (
    <>
      Настройва се в <Link href="/admin/sync" className="text-sea-700 underline">Синхронизация</Link>: копирайте адреса за износ в
      Booking.com (Extranet → Цени и наличност → Синхронизиране на календари) и поставете тамошния адрес за износ тук.
    </>
  ),
};

export default function IntegrationsPage() {
  const report = integrationReport();
  const ready = report.filter((i) => overallState(i.checks) === "ok").length;

  return (
    <>
      <PageHeader
        title="Интеграции"
        description={`Готови ${ready} от ${report.length}. Стойностите се задават като променливи на средата във Vercel (Settings → Environment Variables) и влизат в сила след ново публикуване.`}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {report.map((integration) => {
          const state = STATE[overallState(integration.checks)];
          const test = TESTS[integration.id as keyof typeof TESTS];
          return (
            <Panel key={integration.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-sans text-lg font-semibold text-sea-900">{integration.title}</h2>
                  <p className="mt-1 text-sm text-ink-muted">{integration.summary}</p>
                </div>
                <span className={cn("badge gap-1", state.className)}>
                  <state.Icon className="h-3.5 w-3.5" aria-hidden />
                  {state.label}
                </span>
              </div>
              <ul className="mt-4 divide-y divide-sand-200 text-sm">
                {integration.checks.map((c) => {
                  const s = STATE[c.state];
                  return (
                    <li key={c.label} className="flex items-start gap-3 py-2.5">
                      <s.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", c.state === "ok" ? "text-green-700" : c.state === "warn" ? "text-amber-700" : c.state === "missing" ? "text-red-700" : "text-ink-muted")} aria-label={s.label} />
                      <div className="min-w-0">
                        <code className="text-xs font-semibold">{c.label}</code>
                        <p className="break-words text-ink-muted">{c.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {GUIDES[integration.id] && <p className="mt-3 text-sm text-ink-muted">{GUIDES[integration.id]}</p>}
              {test && (
                <div className="mt-4">
                  <ActionButton action={test.action} showSuccess>{test.label}</ActionButton>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        Пълните инструкции са в <code>docs/DEPLOYMENT.md</code> в хранилището. Тайните стойности никога не се показват тук.
      </p>
    </>
  );
}
