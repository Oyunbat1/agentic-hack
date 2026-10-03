"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Logo } from "@/components/Logo";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Mock phone + OTP login: any 8-digit number and any 4-digit code pass. */
export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);

  const validPhone = /^\d{8}$/.test(phone);
  const validCode = /^\d{4}$/.test(code);

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    if (step === "phone") setStep("code");
    else router.push("/agent");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="w-full max-w-sm rounded-2xl border border-line bg-white/85 p-8 backdrop-blur-xl"
      >
        <Link href="/" aria-label="Нүүр хуудас" className="rounded-lg transition-opacity outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ink/20">
          <Logo />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">{step === "phone" ? "Нэвтрэх" : "Код оруулах"}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {step === "phone" ? "Утасны дугаараа оруулбал нэг удаагийн код илгээнэ." : `+976 ${phone} дугаарт илгээсэн 4 оронтой код.`}
        </p>

        <form onSubmit={submit} className="mt-7">
          <AnimatePresence mode="wait" initial={false}>
            {step === "phone" ? (
              <motion.label
                key="phone"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="flex h-12 items-center gap-2 rounded-xl border border-line px-4 focus-within:border-ink"
              >
                <span className="text-sm text-muted">+976</span>
                <input
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="9911 2233"
                  aria-label="Утасны дугаар"
                  className="min-w-0 flex-1 bg-transparent tracking-wide outline-none"
                />
              </motion.label>
            ) : (
              <motion.div key="code" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25 }}>
                <input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••"
                  aria-label="Нэг удаагийн код"
                  className="h-12 w-full rounded-xl border border-line text-center font-mono text-xl tracking-[0.6em] outline-none focus:border-ink"
                />
                <button type="button" onClick={() => setStep("phone")} className="mt-3 text-xs text-muted underline hover:text-ink">
                  Дугаар солих
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            disabled={busy || (step === "phone" ? !validPhone : !validCode)}
            className="mt-5 h-12 w-full rounded-xl bg-ink text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Түр хүлээнэ үү…" : step === "phone" ? "Код авах" : "Нэвтрэх"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted">Demo: ямар ч 8 оронтой дугаар, 4 оронтой код ажиллана.</p>
      </motion.div>
      <Link href="/" className="mt-6 text-xs text-muted hover:text-ink">
        ← Нүүр хуудас
      </Link>
    </main>
  );
}
