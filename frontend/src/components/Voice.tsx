"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { mockApi } from "@/lib/mock";

const BARS = 28;
const MAX_MS = 15000;

export type VoiceState = "idle" | "recording" | "transcribing";

/**
 * Mic capture with live levels. Audio goes to Oyu STT (mocked for now);
 * the text comes back through `onText` so the normal plan flow handles it.
 */
export function useVoice(onText: (text: string, ms: number) => void) {
  const [state, setState] = useState<VoiceState>("idle");
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Only used to stop/cancel from outside; onstop reads its own closure, never this ref.
  const rec = useRef<{ recorder: MediaRecorder; cancelled: boolean } | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });
  // Unmount (or Fast Refresh) mid-recording: stop the mic, skip transcription.
  useEffect(() => () => stop(true), []);

  async function start() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Микрофон ашиглах зөвшөөрөл өгөөгүй байна");
      return;
    }
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    const self = { recorder, cancelled: false };
    const started = Date.now();
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
      setLevels((prev) => [...prev.slice(1), level]);
      const ms = Date.now() - started;
      setElapsed(ms);
      if (ms >= MAX_MS && recorder.state === "recording") recorder.stop();
    }, 60);

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      const ms = Date.now() - started;
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      if (rec.current === self) rec.current = null;
      setLevels(Array(BARS).fill(0));
      if (self.cancelled) return setState("idle");
      setState("transcribing");
      try {
        const text = await mockApi.transcribe(new Blob(chunks, { type: recorder.mimeType }));
        if (text) onTextRef.current(text, ms);
        else setError("Дуу сонсогдсонгүй, дахин оролдоно уу");
      } catch {
        setError("Oyu STT ажиллахгүй байна");
      } finally {
        setState("idle");
      }
    };

    rec.current = self;
    recorder.start();
    setElapsed(0);
    setState("recording");
  }

  function stop(cancel = false) {
    const r = rec.current;
    if (!r || r.recorder.state !== "recording") return;
    r.cancelled = cancel;
    r.recorder.stop();
  }

  return { state, levels, elapsed, error, start, stop };
}

export function MicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

/** Replaces the input while recording: pulse, live bars, timer, cancel and send. */
export function VoiceBar({ voice }: { voice: ReturnType<typeof useVoice> }) {
  const secs = Math.floor(voice.elapsed / 1000);
  if (voice.state === "transcribing") {
    return (
      <div className="flex flex-1 items-center gap-2.5 text-sm text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" />
        Oyu STT таньж байна…
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-warn/60" />
        <span className="relative h-2 w-2 rounded-full bg-warn" />
      </span>
      <div className="flex h-8 min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
        {voice.levels.map((l, i) => (
          <motion.span
            key={i}
            animate={{ scaleY: 0.12 + l * 0.88 }}
            transition={{ duration: 0.08 }}
            className="h-full w-[3px] shrink-0 origin-center rounded-full bg-ink"
          />
        ))}
      </div>
      <span className="font-mono text-xs text-muted tabular-nums">
        0:{String(secs).padStart(2, "0")}
      </span>
      <button type="button" onClick={() => voice.stop(true)} aria-label="Цуцлах" className="grid h-10 w-10 place-items-center rounded-lg text-lg text-muted hover:bg-tile">
        ×
      </button>
    </div>
  );
}
