export function SectionHeading({ title, text, id }: { title: string; text?: string; id?: string }) {
  return (
    <div className="mb-8 max-w-2xl sm:mb-10">
      <h2 id={id} className="text-4xl sm:text-5xl">
        {title}
      </h2>
      {text && <p className="mt-3 text-lg leading-relaxed text-ink-muted">{text}</p>}
    </div>
  );
}
