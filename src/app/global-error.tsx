"use client";

import { useEffect } from "react";

// Last-resort error page (the root layout itself failed). It renders its own document without the
// global stylesheet, so styles are inline. Bilingual because the locale may be unknown here.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="bg">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fbf9f5", color: "#1f2a2e" }}>
        <title>Грешка · Error</title>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div role="alert">
            <h1 style={{ fontSize: 28, margin: 0, color: "#102c35" }}>Нещо се обърка</h1>
            <p lang="en" style={{ margin: "4px 0 0", color: "#5b6b70" }}>Something went wrong</p>
            <p style={{ marginTop: 16, color: "#5b6b70" }}>Моля, опитайте отново след малко. · Please try again in a moment.</p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ marginTop: 24, border: 0, borderRadius: 999, padding: "12px 24px", background: "#a14f2c", color: "white", fontWeight: 600, cursor: "pointer" }}
            >
              Опитай отново · Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
