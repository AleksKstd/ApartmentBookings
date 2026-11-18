"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Read-only value with a copy-to-clipboard button (export URLs, webhook addresses). */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <input readOnly value={value} aria-label={label} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn-outline shrink-0 px-3"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        <span aria-live="polite">{copied ? "Копирано" : "Копирай"}</span>
      </button>
    </div>
  );
}
