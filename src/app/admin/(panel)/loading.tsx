import { LoaderCircle } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status">
      <LoaderCircle className="h-8 w-8 animate-spin text-sea-700" aria-hidden />
      <span className="sr-only">Зареждане…</span>
    </div>
  );
}
