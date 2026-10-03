"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Magnetic, ScrollText, StepCards, StickyFooter } from "@/components/Fx";
import { Logo } from "@/components/Logo";
import { MicIcon } from "@/components/Voice";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  ["01", "Хэлнэ", "Монголоор бичих эсвэл дуугаар хэлнэ. Oyu STT, OyuLLM хүсэлтийг тань ойлгоно.", "Oyu STT · OyuLLM"],
  ["02", "Хайна", "Агент Taobao-оос MCP-ээр бараа хайж, худалдагчийн үнэлгээ, борлуулалтыг шалгана.", "Taobao MCP"],
  ["03", "Харьцуулна", "Карго, шимтгэл орсон нийт үнийг ₮-өөр урьдчилан тооцож, шилдэг 3-ыг тайлбарлана.", "rankOffers · A2A карго"],
  ["04", "Та батална", "Төлбөрийн өмнө үнийг дахин шалгаж түгжинэ. QPay-ээр төлөөд явцаа нэг дороос харна.", "QPay"],
];

// Mini UI snippets on each step card, so the cards show the product instead of empty space.
const BARS = [3, 6, 10, 7, 12, 16, 9, 14, 18, 11, 7, 13, 17, 10, 6, 12, 15, 8, 5, 9, 4];
const STEP_VISUALS = [
  <div key="voice" className="rounded-2xl border border-line bg-tile p-5">
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-warn/60" />
        <span className="relative h-2 w-2 rounded-full bg-warn" />
      </span>
      <div className="flex h-6 flex-1 items-center gap-[3px]">
        {BARS.map((h, i) => (
          <span key={i} className="w-[3px] rounded-full bg-ink" style={{ height: h + 4 }} />
        ))}
      </div>
      <span className="font-mono text-[11px] text-muted">0:04</span>
    </div>
    <p className="mt-4 text-sm">“40 размерын хар пүүз, 150 мянгаас хэтрэхгүй”</p>
    <p className="mt-2 font-mono text-[11px] text-muted">→ пүүз · 40 · хар · ≤150,000₮</p>
  </div>,
  <div key="search" className="divide-y divide-line rounded-2xl border border-line bg-white">
    {[
      ["黑色轻便休闲鞋", "Хар, хөнгөн пүүз", "4.9"],
      ["简约黑色运动鞋", "Минимал спорт пүүз", "4.7"],
      ["软底跑步鞋", "Зөөлөн ултай пүүз", "4.5"],
    ].map(([cn, mn, r]) => (
      <div key={cn} className="flex items-center gap-3 px-4 py-3">
        <span className="h-9 w-9 shrink-0 rounded-lg bg-tile" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{mn}</p>
          <p className="truncate text-[11px] text-muted">{cn}</p>
        </div>
        <span className="text-xs text-muted">★ {r}</span>
      </div>
    ))}
  </div>,
  <div key="cost" className="rounded-2xl border border-line bg-white px-5 py-2 text-[13px] tabular-nums">
    {[
      ["Барааны үнэ (¥129)", "61,920₮"],
      ["Карго ≈1.2 кг", "12,000–15,000₮"],
      ["Үйлчилгээний хөлс", "5,000₮"],
    ].map(([k, v]) => (
      <p key={k} className="flex justify-between border-b border-line py-2.5 text-muted">
        {k} <span className="text-ink">{v}</span>
      </p>
    ))}
    <p className="flex justify-between py-3 font-semibold">
      Нийт <span>78,920–81,920₮</span>
    </p>
  </div>,
  <div key="pay" className="flex items-center gap-5 rounded-2xl border border-white/15 bg-white/5 p-5">
    <div className="grid h-24 w-24 shrink-0 grid-cols-6 gap-[3px] rounded-xl bg-white p-2.5">
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} className={`rounded-[1px] ${(i * 7 + (i % 5)) % 3 ? "bg-ink" : "bg-transparent"}`} />
      ))}
    </div>
    <div>
      <p className="font-display text-2xl font-bold tabular-nums">78,920₮</p>
      <p className="mt-1 text-xs text-white/60">QPay · invoice 15 мин</p>
      <p className="mt-3 text-xs text-white/80">✓ Үнэ түгжигдсэн</p>
    </div>
  </div>,
];

const MANIFESTO =
  "Монголчууд Хятадаас бараа авахдаа хятад апп дотор хайж, ханшаа гараар бодож, худалдагчид итгэх эсэхээ таамагладаг. Бид энэ бүхнийг нэг ярианд багтаасан — таны талд ажилладаг агент.";

const BEFORE = ["Хятад хэлтэй апп дотор өөрөө хайна", "Ханш, размерыг гараар хөрвүүлнэ", "Худалдагч найдвартай эсэхийг таамаглана", "Карго, нийт үнэ сүүлд нь тодорхой болно"];
const AFTER = ["Монголоор нэг өгүүлбэр хэлэхэд болно", "Нийт үнэ ₮-өөр, карго орсноор", "Худалдагч бүрийг яагаад сонгосныг тайлбарлана", "QPay-ээр төлж, явцаа нэг дороос хянана"];

const PRINCIPLES = [
  ["Таны зөвшөөрөлгүйгээр төлбөр хийгдэхгүй", "Агент санал болгоно, шийдвэрийг үргэлж та гаргана."],
  ["Үнийг төлбөрийн өмнө дахин шалгана", "Үнэ өөрчлөгдсөн бол дахин асууна, дууссан бол invoice үүсгэхгүй."],
  ["Алхам бүр ил тод", "Агент юу хийж, ямар хэрэгсэл ашигласныг timeline-д харуулна."],
];

const FAQ = [
  ["Taobao-гийн апп-аас юугаараа ялгаатай вэ?", "Монголоор ярилцаж хайна, карго орсон нийт үнийг урьдчилан харуулна, QPay-ээр төлнө. Олон улсын карт хэрэггүй."],
  ["Карго хэд вэ?", "Барааны жингээр тооцоод хүрээгээр нь харуулна. Каргоны төлбөрийг бараа Монголд ирэхэд төлнө."],
  ["Мөнгө минь аюулгүй юу?", "Төлбөр QPay-ээр, захиалга бүрт нэг invoice. Бараа дууссан бол мөнгийг буцаана."],
  ["Одоо ашиглаж болох уу?", "Хакатоны demo хувилбар: QPay sandbox, Taobao захиалга mock горимд ажиллана."],
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export default function Landing() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 md:px-6">
          <Link href="/" aria-label="Нүүр хуудас" className="rounded-lg transition-opacity outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ink/20">
            <Logo />
          </Link>
          <nav className="hidden gap-7 text-sm text-muted md:flex">
            <a href="#how" className="hover:text-ink">
              Хэрхэн ажилладаг
            </a>
            <a href="#why" className="hover:text-ink">
              Яагаад Сагс
            </a>
            <a href="#faq" className="hover:text-ink">
              Түгээмэл асуулт
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="h-10 rounded-lg px-3 text-sm leading-10 hover:bg-tile">
              Нэвтрэх
            </Link>
            <Link href="/agent" className="h-10 rounded-lg bg-ink px-4 text-sm leading-10 font-medium text-white hover:opacity-90">
              Эхлэх
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center">
          <motion.span
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-xs text-muted backdrop-blur"
          >
            Бээжин → Эрээн → Улаанбаатар · AI агент
          </motion.span>
          <h1 className="mt-7 text-5xl leading-[1.02] font-bold tracking-[-0.04em] md:text-7xl">
            {["Монголоор хэл.", "Агент Taobao-оос", "олж ирнэ."].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-1.5">
                <motion.span
                  className="block"
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease: EASE }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
            className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg"
          >
            Хайж, харьцуулж, карго орсон нийт үнийг тооцоод, зөвхөн таны зөвшөөрлөөр QPay-ээр захиална.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62, ease: EASE }}
            className="mt-9 flex flex-wrap justify-center gap-2.5"
          >
            <Magnetic>
              <Link href="/agent" className="flex h-12 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-white hover:opacity-90">
                <MicIcon size={16} /> Агенттай ярих
              </Link>
            </Magnetic>
            <a href="#how" className="flex h-12 items-center rounded-xl border border-line bg-white/70 px-5 text-sm backdrop-blur hover:bg-tile">
              Хэрхэн ажилладаг
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
            className="mt-14 flex items-center gap-3 rounded-2xl border border-line bg-white/80 py-2.5 pr-2.5 pl-4 text-left text-sm shadow-[0_1px_0_rgba(0,0,0,0.02)] backdrop-blur"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-warn/60" />
              <span className="relative h-2 w-2 rounded-full bg-warn" />
            </span>
            <span className="text-muted">“40 размерын хар пүүз, 150 мянгаас хэтрэхгүй”</span>
            <Link href="/agent" className="ml-2 h-9 rounded-lg bg-tile px-3 text-xs leading-9 hover:bg-line">
              Туршаад үзэх →
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.1 }}
            className="mt-16 font-mono text-[11px] tracking-widest text-muted"
          >
            OyuLLM · Oyu STT · MCP · A2A · MongoDB · QPay
          </motion.p>
        </section>

        {/* Manifesto */}
        <section className="border-t border-line bg-white">
          <div className="mx-auto max-w-5xl px-4 py-32 md:px-6 md:py-44">
            <ScrollText text={MANIFESTO} className="text-3xl leading-[1.25] font-semibold tracking-tight md:text-5xl" />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-t border-line bg-tile">
          <div className="mx-auto max-w-5xl px-4 pt-24 pb-12 md:px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.7, ease: EASE }} className="max-w-xl">
              <p className="text-[11px] tracking-widest text-muted">ХЭРХЭН АЖИЛЛАДАГ</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">Нэг өгүүлбэрээс захиалга хүртэл</h2>
            </motion.div>
            <div className="mt-12">
              <StepCards steps={STEPS} visuals={STEP_VISUALS} />
            </div>
          </div>
        </section>

        {/* Before / after */}
        <section id="why" className="scroll-mt-16 border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-24 md:px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.7, ease: EASE }} className="max-w-xl">
              <p className="text-[11px] tracking-widest text-muted">ЯАГААД САГС</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">Хятадаас захиалах хэцүү байх ёсгүй</h2>
            </motion.div>
            <div className="mt-14 grid gap-4 md:grid-cols-2">
              <motion.div {...fadeUp} transition={{ duration: 0.6, ease: EASE }} className="rounded-2xl border border-line p-7">
                <p className="text-sm text-muted">Одоо</p>
                <ul className="mt-5 space-y-3.5">
                  {BEFORE.map((x) => (
                    <li key={x} className="flex gap-3 text-[15px] text-muted">
                      <span className="text-line">—</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1, ease: EASE }} className="rounded-2xl bg-ink p-7 text-white">
                <p className="text-sm text-white/60">Сагстай</p>
                <ul className="mt-5 space-y-3.5">
                  {AFTER.map((x) => (
                    <li key={x} className="flex gap-3 text-[15px]">
                      <span className="text-white/50">✓</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <div className="mt-20 grid gap-10 md:grid-cols-3">
              {PRINCIPLES.map(([title, body], i) => (
                <motion.div key={title} {...fadeUp} transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }} className="border-t border-ink pt-5">
                  <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 border-t border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 md:grid-cols-[1fr_1.4fr] md:px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.7, ease: EASE }}>
              <p className="text-[11px] tracking-widest text-muted">ТҮГЭЭМЭЛ АСУУЛТ</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight">Асуулт байна уу?</h2>
            </motion.div>
            <div>
              {FAQ.map(([q, a]) => (
                <details key={q} className="group border-t border-line py-5 last:border-b">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                    {q}
                    <span className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-line bg-white">
          <motion.div {...fadeUp} transition={{ duration: 0.7, ease: EASE }} className="mx-auto max-w-3xl px-4 py-28 text-center">
            <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">Юу авмаар байна?</h2>
            <p className="mt-4 text-muted">Хэлээд үз. Үлдсэнийг агент хийнэ.</p>
            <div className="mt-8">
              <Magnetic>
                <Link href="/agent" className="inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-6 text-sm font-medium text-white hover:opacity-90">
                  <MicIcon size={16} /> Агенттай ярих
                </Link>
              </Magnetic>
            </div>
          </motion.div>
        </section>
      </main>

      <StickyFooter height={420}>
        <footer className="flex h-full flex-col justify-between bg-ink px-4 py-10 text-white md:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-10 text-sm">
            <div className="flex gap-16">
              <div className="flex flex-col gap-2">
                <p className="mb-1 text-[11px] tracking-widest text-white/40">ХУУДАС</p>
                <a href="#how" className="text-white/70 hover:text-white">Хэрхэн ажилладаг</a>
                <a href="#why" className="text-white/70 hover:text-white">Яагаад Сагс</a>
                <a href="#faq" className="text-white/70 hover:text-white">Түгээмэл асуулт</a>
              </div>
              <div className="flex flex-col gap-2">
                <p className="mb-1 text-[11px] tracking-widest text-white/40">АПП</p>
                <Link href="/agent" className="text-white/70 hover:text-white">Агент</Link>
                <Link href="/login" className="text-white/70 hover:text-white">Нэвтрэх</Link>
              </div>
            </div>
            <p className="max-w-xs text-white/40">Agentic Commerce Hackathon 2026 · Novelsoft × Applied AI Mongolia</p>
          </div>
          <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-6">
            <p className="font-display text-[22vw] leading-[0.8] font-bold tracking-[-0.06em] md:text-[200px]">Сагс</p>
            <p className="hidden pb-4 font-mono text-[11px] text-white/40 md:block">Бээжин → Эрээн → Улаанбаатар</p>
          </div>
        </footer>
      </StickyFooter>
    </>
  );
}
