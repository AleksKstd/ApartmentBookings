"use client";

import { useActionState, useTransition, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { ActionResult } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type FormAction = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export function ResultMessage({ result }: { result: ActionResult | null }) {
  if (!result?.message) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={cn("rounded-xl px-3 py-2 text-sm", result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700")}
    >
      {result.message}
    </p>
  );
}

/** Form bound to a server action, showing its result message and a pending state. */
export function AdminForm({
  action,
  children,
  submitLabel = "Запази",
  className,
  resetOnSuccess = false,
}: {
  action: FormAction;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={cn("space-y-4", className)}
      // React resets uncontrolled fields after an action; keep them unless told otherwise.
      onReset={(e) => {
        if (!resetOnSuccess) e.preventDefault();
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
          {submitLabel}
        </button>
        <ResultMessage result={result} />
      </div>
    </form>
  );
}

/** Button that calls a no-argument (pre-bound) server action, optionally after confirmation. */
export function ActionButton({
  action,
  children,
  confirm,
  className = "btn-outline",
  title,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={className}
        disabled={pending}
        title={title}
        aria-label={title}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => setResult(await action()));
        }}
      >
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </button>
      {result && !result.ok && <ResultMessage result={result} />}
    </span>
  );
}

export function Field({
  label,
  name,
  hint,
  className,
  ...input
}: { label: string; name: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      <input id={`f-${name}`} name={name} className="input" {...input} />
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/** Side-by-side Bulgarian / English inputs for a localized value. */
export function LocalizedField({
  label,
  name,
  value,
  multiline = false,
  rows = 3,
  maxLength,
}: {
  label: string;
  name: string;
  value: { bg: string; en: string };
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {(["bg", "en"] as const).map((lang) => (
          <div key={lang} className="relative">
            <span className="pointer-events-none absolute right-3 top-2.5 text-[10px] font-bold uppercase text-ink-soft">{lang}</span>
            {multiline ? (
              <textarea name={`${name}.${lang}`} defaultValue={value[lang]} rows={rows} maxLength={maxLength} className="input pr-10" aria-label={`${label} (${lang})`} />
            ) : (
              <input name={`${name}.${lang}`} defaultValue={value[lang]} maxLength={maxLength} className="input pr-10" aria-label={`${label} (${lang})`} />
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
