import { PageHeader, Panel, showDateTime } from "@/components/admin/ui";
import { getRepository } from "@/lib/data";
import { isEmailConfigured } from "@/lib/email";

export const metadata = { title: "Имейли" };

const STATUS = { sent: ["Изпратен", "bg-green-100 text-green-800"], logged: ["Само записан", "bg-sand-200 text-ink-muted"], failed: ["Грешка", "bg-red-100 text-red-800"] } as const;

export default async function EmailsPage() {
  const emails = await getRepository().listEmails(100);
  return (
    <>
      <PageHeader
        title="Имейли"
        description={isEmailConfigured() ? "Имейлите се изпращат чрез Resend." : "Изпращането не е конфигурирано (RESEND_API_KEY, EMAIL_FROM) — имейлите само се записват тук."}
      />
      <Panel>
        {emails.length === 0 ? (
          <p className="text-sm text-ink-muted">Няма изпратени имейли.</p>
        ) : (
          <ul className="divide-y divide-sand-200">
            {emails.map((e) => (
              <li key={e.id} className="py-3">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                    <span className={`badge ${STATUS[e.status][1]}`}>{STATUS[e.status][0]}</span>
                    <span className="font-medium">{e.subject}</span>
                    <span className="text-ink-muted">→ {e.to}</span>
                    <span className="ml-auto text-xs text-ink-muted">{showDateTime(e.createdAt)}</span>
                  </summary>
                  {e.error && <p className="mt-2 text-sm text-red-700">{e.error}</p>}
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-sand-100 p-4 text-xs">{e.text}</pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
