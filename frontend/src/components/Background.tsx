"use client";

import { useRef } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(MotionPathPlugin);

// Coordinates in a 1376×768 frame (route-map.webp is the same framing at any size); the SVG uses the same viewBox
// and "slice" so it lines up with the object-cover image at any screen size.
const CITIES = [
  { id: "bj", x: 995, y: 605, name: "Бээжин", dx: 14, anchor: "start" },
  { id: "er", x: 812, y: 398, name: "Эрээн", dx: 14, anchor: "start" },
  { id: "ub", x: 622, y: 173, name: "Улаанбаатар", dx: -14, anchor: "end" },
] as const;
const LEG_1 = "M995,605 C970,590 945,585 935,578 C905,560 880,550 875,535 C868,505 855,470 840,445 C830,425 822,410 812,398";
const LEG_2 = "M812,398 C790,380 778,370 770,350 C750,330 720,295 690,270 C670,245 650,215 645,195 C640,185 630,178 622,173";
const TAIL = 0.18; // comet tail, fraction of a leg

const EASE = "power2.inOut";

/**
 * Ambient backdrop, grey only so the UI stays monochrome. Tells the product story
 * on loop: a parcel leaves Beijing, pauses at the Ereen border (cargo), arrives in UB.
 * Plus subtle cursor parallax and a cursor spotlight.
 */
export function Background() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Intro: map settles in, route draws, labels fade up.
        gsap.fromTo(".map", { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1.04, duration: 2.4, ease: "expo.out" });
        gsap.fromTo(".route", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: EASE, stagger: 1.4, delay: 0.5 });
        gsap.from(".city", { opacity: 0, scale: 0, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(2)", stagger: 0.7, delay: 0.5 });
        gsap.from(".label", { opacity: 0, y: 6, duration: 0.8, ease: "power2.out", stagger: 0.7, delay: 0.8 });

        gsap.to(".blob-a", { xPercent: 30, yPercent: 20, scale: 1.15, duration: 18, ease: "sine.inOut", repeat: -1, yoyo: true });
        gsap.to(".blob-b", { xPercent: -25, yPercent: -30, scale: 0.9, duration: 22, ease: "sine.inOut", repeat: -1, yoyo: true });

        // Parcel journey loop.
        const ping = (id: string, r: number) =>
          gsap.fromTo(`.ping-${id}`, { attr: { r: 4 }, opacity: 0.7 }, { attr: { r }, opacity: 0, duration: 1.4, ease: "power2.out" });
        const leg = (n: 1 | 2, duration: number) => [
          gsap.to(".parcel", { motionPath: { path: `.leg-${n}`, align: `.leg-${n}`, alignOrigin: [0.5, 0.5] }, duration, ease: EASE }),
          gsap.fromTo(`.tail-${n}`, { strokeDashoffset: TAIL }, { strokeDashoffset: TAIL - 1, duration, ease: EASE }),
          // Tail retracts into the city once the parcel arrives.
          gsap.to(`.tail-${n}`, { strokeDashoffset: -1, duration: 0.5, ease: "power1.out", delay: duration }),
        ];
        gsap
          .timeline({ repeat: -1, repeatDelay: 1.6, delay: 3.6 })
          .set(".parcel", { opacity: 0 })
          .add(ping("bj", 22))
          .to(".parcel", { opacity: 1, duration: 0.3 }, "<")
          .add(leg(1, 2.6), "<0.1")
          .add(ping("er", 22), "-=0.5")
          .to(".parcel", { scale: 1.6, transformOrigin: "50% 50%", duration: 0.25, yoyo: true, repeat: 1 }, "<")
          .add(leg(2, 3), "+=0.3")
          .add(ping("ub", 34), "-=0.5")
          .to(".parcel", { opacity: 0, duration: 0.6 }, "<0.2");

        // Cursor: map drifts opposite the pointer (parallax), spotlight follows it.
        const mx = gsap.quickTo(".map", "x", { duration: 1.4, ease: "power3.out" });
        const my = gsap.quickTo(".map", "y", { duration: 1.4, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          mx((e.clientX / innerWidth - 0.5) * -18);
          my((e.clientY / innerHeight - 0.5) * -12);
          gsap.to(el, { "--x": `${e.clientX}px`, "--y": `${e.clientY}px`, duration: 0.8, ease: "power3.out", overwrite: true });
        };
        window.addEventListener("pointermove", move);
        return () => window.removeEventListener("pointermove", move);
      });
    },
    { scope: root },
  );

  const stroke = { fill: "none", vectorEffect: "non-scaling-stroke", strokeLinecap: "round" } as const;

  return (
    <div
      ref={root}
      aria-hidden
      style={{ "--x": "50vw", "--y": "-20vh" } as React.CSSProperties}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="blob-a absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-zinc-200/70 blur-[120px]" />
      <div className="blob-b absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-zinc-100 blur-[120px]" />

      <div className="map absolute inset-0 scale-[1.04] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative static backdrop */}
        <img src="/route-map.webp" alt="" decoding="async" className="h-full w-full object-cover opacity-90 mix-blend-multiply" />
        <svg viewBox="0 0 1376 768" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
          {[LEG_1, LEG_2].map((d, i) => (
            <g key={d}>
              <path className={`route leg-${i + 1}`} d={d} pathLength={1} strokeDasharray={1} stroke="#a1a1aa" strokeWidth={1.25} {...stroke} />
              <path
                className={`tail-${i + 1}`}
                d={d}
                pathLength={1}
                strokeDasharray={`${TAIL} 2`}
                strokeDashoffset={TAIL}
                stroke="#18181b"
                strokeOpacity={0.55}
                strokeWidth={2}
                {...stroke}
              />
            </g>
          ))}
          {CITIES.map((c) => (
            <g key={c.id}>
              <circle className={`ping-${c.id}`} cx={c.x} cy={c.y} r={4} stroke="#71717a" strokeWidth={1} opacity={0} {...stroke} />
              <circle className="city" cx={c.x} cy={c.y} r={3.5} fill="#fff" stroke="#71717a" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
              <text
                className="label"
                x={c.x + c.dx}
                y={c.y + 4}
                textAnchor={c.anchor}
                fill="#71717a"
                fontSize={12}
                letterSpacing={0.4}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {c.name}
              </text>
            </g>
          ))}
          <circle className="parcel" cx={0} cy={0} r={4} fill="#18181b" opacity={0} />
        </svg>
      </div>

      <div className="absolute inset-0 [background-image:radial-gradient(#a1a1aa_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(220px_circle_at_var(--x)_var(--y),black,transparent)] opacity-60" />
    </div>
  );
}
