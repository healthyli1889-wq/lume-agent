"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "./actions";
import { Entropy } from "@/components/ui/entropy";
import {
  ALL_CAPABILITIES,
  CAPABILITY_META,
  type Capability,
  type Industry,
} from "@/lib/personalization/profile";

const INDUSTRIES: { id: Industry; label: string; sub: string }[] = [
  { id: "saas", label: "SaaS startup", sub: "Engineering, product, sales" },
  { id: "agency", label: "Creative agency", sub: "Marketing, design, dev shops" },
  { id: "ecommerce", label: "E-commerce / DTC", sub: "Direct-to-consumer brands" },
  { id: "professional_services", label: "Professional services", sub: "Consulting, advisory" },
  { id: "healthcare", label: "Healthcare practice", sub: "Specialty clinic" },
  { id: "real_estate", label: "Real estate", sub: "Brokerage, property" },
  { id: "financial_services", label: "Financial services", sub: "RIA, advisory" },
  { id: "other", label: "Something else", sub: "We'll adapt as we observe" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [enabled, setEnabled] = useState<Set<Capability>>(
    new Set<Capability>(ALL_CAPABILITIES),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (c: Capability) => {
    setEnabled((s) => {
      const next = new Set(s);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const onContinue = () => {
    if (!industry || enabled.size === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const { next, initiatesOAuth } = await completeOnboarding({
          industry,
          capabilities: Array.from(enabled),
          workspaceName: "My workspace",
        });
        if (initiatesOAuth) {
          // Full-page nav so the OAuth redirect chain works correctly.
          window.location.href = next;
        } else {
          router.push(next);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-10">
      <header className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mark />
          <span className="text-sm font-medium tracking-tight text-white/85">
            Hermes
          </span>
          <span className="ml-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">
            workspace agent
          </span>
        </div>
        <span className="text-xs text-white/40">~60 seconds</span>
      </header>

      <section className="mb-2 flex flex-col items-center text-center fade-in">
        <Entropy size={300} className="rounded-2xl" />
        <p className="word-float mt-5 max-w-md font-mono text-[12px] italic leading-relaxed text-white/55">
          &ldquo;order from the chaos of how your team already works.&rdquo;
        </p>
      </section>

      <section className="mt-10 space-y-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-violet-300/70">
          Welcome
        </p>
        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
          A teammate that lives in your workspace
          <span className="text-white/40">
            {" "}— grows with you, protects your privacy.
          </span>
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-white/55">
          Always on. Learns how your team works from real signals.
          Speaks your voice. Hits ⌘K from anywhere.
        </p>
      </section>

      <section className="mt-12">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
            01
          </span>
          <h2 className="text-sm font-medium text-white/80">
            What does your team do?
          </h2>
        </div>
        <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INDUSTRIES.map((opt) => {
            const selected = industry === opt.id;
            return (
              <button
                key={opt.id}
                role="radio"
                aria-checked={selected}
                onClick={() => setIndustry(opt.id)}
                className={[
                  "group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all",
                  "focus:outline-none focus:ring-2 focus:ring-violet-400/50",
                  selected
                    ? "border-violet-400/60 bg-violet-400/[0.07] ring-glow"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-white/90">{opt.label}</span>
                  {selected && <Tick />}
                </div>
                <p className="mt-1 text-xs text-white/45">{opt.sub}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
            02
          </span>
          <h2 className="text-sm font-medium text-white/80">
            Pick what you want Hermes to do
          </h2>
          <span className="ml-auto text-[11px] text-white/35">
            You can change these anytime
          </span>
        </div>
        <ul className="space-y-2">
          {ALL_CAPABILITIES.map((cap) => {
            const meta = CAPABILITY_META[cap];
            const on = enabled.has(cap);
            return (
              <li key={cap}>
                <button
                  onClick={() => toggle(cap)}
                  aria-pressed={on}
                  className={[
                    "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    on
                      ? "border-violet-400/40 bg-violet-400/[0.05]"
                      : "border-white/[0.06] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.03]",
                  ].join(" ")}
                >
                  <CapabilityToggle on={on} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white/90">{meta.title}</p>
                    <p className="mt-0.5 text-xs text-white/50">{meta.subtitle}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 mb-6">
        <button
          disabled={!industry || enabled.size === 0 || pending}
          onClick={onContinue}
          className={[
            "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl px-5 py-3.5 text-sm font-medium transition-all",
            !industry || enabled.size === 0 || pending
              ? "cursor-not-allowed border border-white/[0.06] bg-white/[0.02] text-white/35"
              : "bg-white text-neutral-950 hover:bg-white/90",
          ].join(" ")}
        >
          <GoogleIcon />
          {pending
            ? "Setting up your workspace…"
            : "Connect Google Workspace & enter"}
          {!pending && industry && enabled.size > 0 && (
            <span className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-400/0 via-violet-400/20 to-violet-400/0 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
          )}
        </button>
        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-white/40">
          <Lock /> Read-only by default · nothing leaves your tenant · delete anything anytime
        </div>
        {error && (
          <p className="mt-3 text-center text-sm text-rose-300/90">{error}</p>
        )}
      </section>

      <footer className="mt-auto pt-8 text-[11px] text-white/30">
        Hermes runs in your browser, your Slack, and via voice. ⌘K opens it from any page.
      </footer>
    </main>
  );
}

function Mark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-gradient-to-br from-violet-500/30 via-white/5 to-transparent">
      <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(167,139,250,0.6)]" />
    </span>
  );
}

function Tick() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-violet-300">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CapabilityToggle({ on }: { on: boolean }) {
  return (
    <span
      className={[
        "mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-all",
        on
          ? "border-violet-400/50 bg-violet-400/[0.25]"
          : "border-white/[0.10] bg-white/[0.04]",
      ].join(" ")}
    >
      <span
        className={[
          "ml-0.5 inline-block h-3.5 w-3.5 rounded-full transition-all",
          on ? "translate-x-4 bg-violet-200" : "bg-white/40",
        ].join(" ")}
      />
    </span>
  );
}

function Lock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-white/35">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/>
      <path fill="currentColor" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.6-4.1H3v2.6A10 10 0 0 0 12 22z"/>
      <path fill="currentColor" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.4-2.6z"/>
      <path fill="currentColor" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3 7.5l3.4 2.6A6 6 0 0 1 12 6.1z"/>
    </svg>
  );
}
