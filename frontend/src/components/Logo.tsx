/** Wordmark with a basket glyph; text-only colors so it stays monochrome. */
export function Logo({ sub = "Taobao агент" }: { sub?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-white">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9h16l-1.5 10.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5L4 9Z" />
          <path d="M8.5 9 12 3l3.5 6" />
        </svg>
      </span>
      <b className="font-display text-lg font-bold tracking-tight">Сагс</b>
      {sub && <small className="hidden text-[11px] text-muted sm:inline">{sub}</small>}
    </span>
  );
}
