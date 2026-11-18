"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { fmt, type Dictionary } from "@/i18n";
import { cn } from "@/lib/utils";

interface Slide {
  id: string;
  url: string;
  alt: string;
}

const INTERVAL_MS = 6000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function HeroCarousel({
  slides,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  t,
}: {
  slides: Slide[];
  title: string;
  subtitle: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
  t: Dictionary["carousel"];
}) {
  const [index, setIndex] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const [playChoice, setPlayChoice] = useState<boolean | null>(null);
  const playing = playChoice ?? !reducedMotion;
  const [hovered, setHovered] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (!playing || hovered || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, hovered, count]);

  return (
    <section
      className="relative isolate h-[82svh] min-h-[560px] overflow-hidden bg-sea-900"
      aria-roledescription="carousel"
      aria-label={t.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
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
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={slide.url}
            alt={slide.alt}
            fill
            sizes="100vw"
            className={cn("object-cover transition-transform duration-[7000ms] ease-out", i === index && "scale-105")}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/0" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent" aria-hidden />

      <div className="container relative flex h-full flex-col justify-end pb-32 sm:pb-36">
        <div className="max-w-3xl animate-rise-in">
          <h1 className="text-[2.75rem] leading-[1.02] text-white sm:text-7xl lg:text-[5.5rem]">{title}</h1>
          <p className="mt-5 max-w-xl text-lg text-white/85 sm:text-xl">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={primaryCta.href} className="btn-primary px-6 py-4">
              {primaryCta.label}
            </Link>
            <Link href={secondaryCta.href} className="btn border border-white/70 px-6 py-4 text-white hover:bg-white hover:text-ink">
              {secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-16 z-10 sm:bottom-20">
          <div className="container flex items-center justify-end gap-6">
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={fmt(t.slide, { n: i + 1, total: count })}
                  aria-current={i === index}
                  className={cn("h-0.5 bg-white/40 transition-all", i === index ? "w-10 bg-white" : "w-5 hover:bg-white/80")}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPlayChoice(!playing)} className="carousel-btn" aria-label={playing ? t.pause : t.play}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => go(index - 1)} className="carousel-btn" aria-label={t.previous}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => go(index + 1)} className="carousel-btn" aria-label={t.next}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
