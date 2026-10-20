"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { fmt, type Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  url: string;
  alt: string;
}

export function Gallery({
  photos,
  t,
  carouselT,
  closeLabel,
  variant = "full",
}: {
  photos: Photo[];
  t: Dictionary["galleryPage"];
  carouselT: Dictionary["carousel"];
  closeLabel: string;
  variant?: "full" | "preview";
}) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const count = photos.length;

  const show = useCallback((i: number) => setOpen(((i % count) + count) % count), [count]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") show(open + 1);
      if (e.key === "ArrowLeft") show(open - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show]);

  if (count === 0) return <p className="text-ink-muted">{t.empty}</p>;

  return (
    <>
      <ul
        className={cn(
          "grid gap-3 sm:gap-4",
          variant === "preview" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3",
        )}
      >
        {photos.map((photo, i) => (
          <li
            key={photo.id}
            className={cn(variant === "preview" && i === 0 && "col-span-2 row-span-2", variant === "full" && i % 5 === 0 && "md:col-span-2 md:row-span-2")}
          >
            <button
              type="button"
              onClick={(e) => {
                lastTrigger.current = e.currentTarget;
                show(i);
              }}
              className="group block h-full w-full overflow-hidden rounded-2xl bg-sand-200"
              aria-label={fmt(t.open, { n: i + 1 })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from storage */}
              <img
                src={photo.url}
                alt={photo.alt}
                loading="lazy"
                className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={t.lightbox}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-sea-900/95"
        onClose={() => {
          setOpen(null);
          lastTrigger.current?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null);
        }}
      >
        {open !== null && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-4" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from storage */}
            <img src={photos[open].url} alt={photos[open].alt} className="max-h-[80svh] max-w-full rounded-xl object-contain shadow-2xl" />
            <p className="text-center text-sm text-sea-100">
              {photos[open].alt} · {fmt(carouselT.slide, { n: open + 1, total: count })}
            </p>
            <div className="flex gap-3">
              <button type="button" className="carousel-btn" onClick={() => show(open - 1)} aria-label={carouselT.previous}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" className="carousel-btn" onClick={() => setOpen(null)} aria-label={closeLabel} autoFocus>
                <X className="h-5 w-5" />
              </button>
              <button type="button" className="carousel-btn" onClick={() => show(open + 1)} aria-label={carouselT.next}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
