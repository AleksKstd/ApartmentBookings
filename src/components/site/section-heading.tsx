export function SectionHeading({ eyebrow, title, text, id }: { eyebrow?: string; title: string; text?: string; id?: string }) {
  return (
    <div className="mb-10 max-w-2xl sm:mb-14">
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 id={id} className="text-4xl leading-[1.05] sm:text-5xl">
        {title}
      </h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-ink-muted">{text}</p>}
    </div>
  );
}
