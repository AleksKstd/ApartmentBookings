"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fmt, type Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

interface Slide {
  id: string;
  url: string;
  alt: string;
}

/**
 * The photo band under the opening. It moves only when the visitor asks (buttons, dots or a swipe);
 * the controls sit below the photo as small enamel plates, so no scrim is needed over the image.
 */
export function HeroCarousel({ slides, t }: { slides: Slide[]; t: Dictionary["carousel"] }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = slides.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  return (
    <section aria-roledescription="carousel" aria-label={t.label}>
      <div
        className="relative isolate h-[42svh] min-h-[240px] overflow-hidden rounded-xl bg-sea-900 sm:h-[52svh] sm:max-h-[560px]"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={fmt(t.slide, { n: i + 1, total: count })}
            aria-hidden={i !== index}
            className={cn("absolute inset-0 transition-opacity duration-700 ease-out", i === index ? "opacity-100" : "opacity-0")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded images from storage */}
            <img
              src={slide.url}
              alt={slide.alt}
              className="h-full w-full object-cover"
              {...(i === 0 ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
            />
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {slides.map((s, i) => (
              // Each mark sits in a 24px hit area (WCAG 2.5.8).
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={fmt(t.slide, { n: i + 1, total: count })}
                aria-current={i === index}
                className="grid h-6 place-items-center px-1"
              >
                <span className={cn("block h-1.5 rounded-sm transition-all", i === index ? "w-8 bg-sea-700" : "w-4 bg-sand-400 hover:bg-sea-500")} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => go(index - 1)} className="carousel-btn" aria-label={t.previous}>
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(index + 1)} className="carousel-btn" aria-label={t.next}>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
