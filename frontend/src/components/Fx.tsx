"use client";

// Minimal motion effects for the landing page, adapted from Olivier Larose's tutorials
// (blog.olivierlarose.com): text opacity on scroll, magnetic button, cards parallax, sticky footer.

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

/** Words light up one by one as the paragraph scrolls through the viewport. */
export function ScrollText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={`flex flex-wrap ${className ?? ""}`}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <span className="relative mr-[0.25em]">
      <motion.span style={{ opacity }}>{children}</motion.span>
    </span>
  );
}

/** Child drifts toward the cursor while hovered, springs back on leave. */
export function Magnetic({ children, strength = 0.35 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = ref.current!;
      const mm = gsap.matchMedia();
      mm.add("(hover: hover) and (prefers-reduced-motion: no-preference)", () => {
        const x = gsap.quickTo(el, "x", { duration: 1, ease: "elastic.out(1, 0.3)" });
        const y = gsap.quickTo(el, "y", { duration: 1, ease: "elastic.out(1, 0.3)" });
        const move = (e: MouseEvent) => {
          const r = el.getBoundingClientRect();
          x((e.clientX - (r.left + r.width / 2)) * strength);
          y((e.clientY - (r.top + r.height / 2)) * strength);
        };
        const leave = () => {
          x(0);
          y(0);
        };
        el.addEventListener("mousemove", move);
        el.addEventListener("mouseleave", leave);
        return () => {
          el.removeEventListener("mousemove", move);
          el.removeEventListener("mouseleave", leave);
        };
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className="inline-block">
      {children}
    </div>
  );
}

/** Steps as sticky cards that stack; earlier cards shrink slightly as later ones arrive. */
export function StepCards({ steps, visuals = [] }: { steps: string[][]; visuals?: React.ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <div ref={ref} className="relative">
      {steps.map((step, i) => (
        <StepCard key={step[0]} step={step} visual={visuals[i]} i={i} total={steps.length} progress={scrollYProgress} />
      ))}
    </div>
  );
}

type StepCardProps = { step: string[]; visual?: React.ReactNode; i: number; total: number; progress: MotionValue<number> };

function StepCard({ step: [n, title, body, tag], visual, i, total, progress }: StepCardProps) {
  const scale = useTransform(progress, [i / total, 1], [1, 1 - (total - 1 - i) * 0.04]);
  const dark = i === total - 1;
  return (
    <div className="sticky top-24 flex h-[55vh] min-h-[340px] items-start justify-center">
      <motion.div
        style={{ scale, top: `${i * 22}px` }}
        className={`relative grid w-full origin-top gap-8 rounded-3xl border p-7 md:grid-cols-[1fr_1fr] md:items-center md:gap-12 md:p-10 ${
          dark ? "border-ink bg-ink text-white" : "border-line bg-white"
        }`}
      >
        <div>
          <div className="flex items-center gap-3">
            <span className={`font-mono text-xs ${dark ? "text-white/50" : "text-muted"}`}>
              {n} / 0{total}
            </span>
            {tag && (
              <code className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${dark ? "border-white/20 text-white/70" : "border-line text-muted"}`}>
                {tag}
              </code>
            )}
          </div>
          <h3 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">{title}</h3>
          <p className={`mt-3 max-w-md text-[15px] leading-relaxed ${dark ? "text-white/70" : "text-muted"}`}>{body}</p>
        </div>
        {visual && <div className="hidden md:block">{visual}</div>}
      </motion.div>
    </div>
  );
}

/** Footer stays pinned underneath and is revealed as the page scrolls off it. */
export function StickyFooter({ children, height = 420 }: { children: React.ReactNode; height?: number }) {
  return (
    <div className="relative" style={{ height, clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}>
      <div className="relative -top-[100vh]" style={{ height: `calc(100vh + ${height}px)` }}>
        <div className="sticky" style={{ height, top: `calc(100vh - ${height}px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
