export function SectionHeading({ eyebrow, title, text, id }: { eyebrow?: string; title: string; text?: string; id?: string }) {
  return (
    <div className="mb-8 max-w-2xl sm:mb-10">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h2 id={id} className="text-3xl sm:text-4xl">
        {title}
      </h2>
      {text && <p className="mt-3 text-lg leading-relaxed text-ink-muted">{text}</p>}
    </div>
  );
}
