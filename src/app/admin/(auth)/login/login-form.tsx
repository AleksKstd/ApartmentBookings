"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { login } from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/form-kit";

export function LoginForm() {
  const [result, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="username">Потребителско име</label>
        <input id="username" name="username" className="input" autoComplete="username" required maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="password">Парола</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required maxLength={200} />
      </div>
      <ResultMessage result={result} />
      <button type="submit" className="btn-secondary w-full" disabled={pending}>
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
        Вход
      </button>
    </form>
  );
}
