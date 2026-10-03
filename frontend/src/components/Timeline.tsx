import type { Step } from "@/lib/mock";

const PHASE_MN: Record<Step["phase"], string> = {
  understand: "Ойлгох",
  search: "Хайх",
  compare: "Харьцуулах",
  cargo: "Карго",
  decide: "Шийдэх",
  recheck: "Дахин шалгах",
  pay: "Төлөх",
  order: "Захиалах",
};

export function Timeline({ steps, running }: { steps: Step[]; running: boolean }) {
  return (
    <ol>
      {steps.map((s, i) => (
        <li key={i} className="step-in border-t border-line py-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span>{PHASE_MN[s.phase]}</span>
            <code className="rounded border border-line px-1 font-mono text-[10px]">{s.protocol}</code>
            <code className="truncate font-mono text-[10px]">{s.actor}</code>
            <time className="ml-auto font-mono text-[10px]">{s.ms}ms</time>
          </div>
          <p className={`mt-1.5 text-[13px] font-medium ${s.ok ? "" : "text-warn"}`}>{s.title}</p>
          {s.detail && <p className="mt-0.5 text-xs text-muted">{s.detail}</p>}
        </li>
      ))}
      {running && (
        <li className="flex items-center gap-2 border-t border-line pt-3.5 text-[13px] text-muted">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
          Агент ажиллаж байна…
        </li>
      )}
    </ol>
  );
}
