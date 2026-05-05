"use client";
import { useEffect, useRef, useState } from "react";

// Minimal local types so we don't need the lib.dom.iterable Web Speech extras.
type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

type Phase = "idle" | "listening" | "processing";

export function VoiceButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const start = () => {
    if (phase !== "idle") return;
    setTranscript("");
    const W = window as unknown as {
      SpeechRecognition?: { new (): SpeechRecognitionLike };
      webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
    };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;

    if (!SR) {
      // Browser without Web Speech: simulate.
      setPhase("listening");
      setTimeout(() => {
        const fake = "Find a time with Marisa next week";
        setTranscript(fake);
        setPhase("processing");
        setTimeout(() => {
          handTranscriptToPalette(fake);
          setPhase("idle");
        }, 600);
      }, 1400);
      return;
    }

    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) {
        const alt = e.results[i]?.[0];
        if (alt) txt += alt.transcript;
      }
      setTranscript(txt);
    };
    r.onerror = () => {
      setPhase("idle");
    };
    r.onend = () => {
      setPhase((p) => {
        // Use latest transcript via callback to avoid stale closure.
        return p;
      });
      const finalText = transcriptRef.current.trim();
      if (finalText) {
        setPhase("processing");
        setTimeout(() => {
          handTranscriptToPalette(finalText);
          setPhase("idle");
        }, 400);
      } else {
        setPhase("idle");
      }
    };
    recognitionRef.current = r;
    setPhase("listening");
    try {
      r.start();
    } catch {
      setPhase("idle");
    }
  };

  // Keep a ref of the latest transcript so onend can read it without closure issues.
  const transcriptRef = useRef("");
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
      {phase === "listening" && (
        <div className="glass-strong max-w-[280px] rounded-xl px-3 py-2 text-xs text-white/80 fade-in">
          <p className="text-[10px] font-medium uppercase tracking-wider text-rose-300/80">
            Listening
          </p>
          <p className="mt-0.5 truncate">{transcript || "go ahead…"}</p>
        </div>
      )}
      {phase === "processing" && (
        <div className="glass-strong max-w-[280px] rounded-xl px-3 py-2 text-xs text-white/80 fade-in">
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-300/80">
            Thinking
          </p>
          <p className="mt-0.5 truncate">"{transcript}"</p>
        </div>
      )}
      <button
        onClick={phase === "idle" ? start : stop}
        aria-label={phase === "idle" ? "Talk to Hermes" : "Stop listening"}
        className={[
          "glass-strong relative flex h-12 w-12 items-center justify-center rounded-full transition",
          phase === "listening" ? "listening-ring" : "",
          phase === "idle" ? "hover:bg-white/[0.08]" : "",
        ].join(" ")}
      >
        <MicIcon active={phase !== "idle"} />
      </button>
    </div>
  );
}

function handTranscriptToPalette(text: string) {
  window.dispatchEvent(
    new CustomEvent("hermes:open-palette", { detail: { query: text } }),
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className={active ? "text-rose-300" : "text-white/85"}
    >
      <rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
