"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Intent = {
  id: string;
  label: string;
  hint: string;
  group: "Today" | "Compose" | "Recall" | "Workspace";
  keywords: string[];
  // What the agent would do — for the demo we just return a confirmation line.
  responder: (query: string) => string;
};

const INTENTS: Intent[] = [
  {
    id: "find_meeting_time",
    label: "Find time for a meeting",
    hint: "Pick a participant — Hermes finds an open slot and drafts the invite.",
    group: "Today",
    keywords: ["meeting", "schedule", "calendar", "find time"],
    responder: (q) =>
      `Found three open slots on Thu 3:00–3:30, Fri 11:00–11:30, and Mon 9:30–10:00 that respect everyone's deep-work blocks. Drafted the invite${q ? ` for "${q}"` : ""} — review before send?`,
  },
  {
    id: "draft_followup",
    label: "Draft follow-up email",
    hint: "Reply in your team's voice, with prior context attached.",
    group: "Compose",
    keywords: ["email", "follow up", "reply", "draft"],
    responder: (q) =>
      `Drafted a follow-up${q ? ` about "${q}"` : ""} using the last conversation as context. Opening it inline so you can review and send.`,
  },
  {
    id: "summarize_meeting",
    label: "Summarize my last meeting",
    hint: "Capture decisions, action items, and who owns what.",
    group: "Recall",
    keywords: ["summary", "summarise", "summarize", "notes", "recap"],
    responder: () =>
      "Summary ready: 3 decisions, 5 action items (2 yours, 2 Devon's, 1 Marisa's), 1 open question on SOC2 timing.",
  },
  {
    id: "team_progress",
    label: "Show team progress this week",
    hint: "Open commitments, due dates, who's behind.",
    group: "Workspace",
    keywords: ["progress", "team", "commitments", "status"],
    responder: () =>
      "12 open commitments. 3 due today, 2 overdue, 7 on track. Devon is overloaded — consider moving the SOC2 packet to a quieter week.",
  },
  {
    id: "recall_context",
    label: "What did we last say about pricing?",
    hint: "Hermes searches meetings, emails, Slack, and docs.",
    group: "Recall",
    keywords: ["pricing", "remember", "history", "what did", "recall"],
    responder: () =>
      "Last touched 4 days ago on the Northwind call: Marisa pushed back on >$40/seat; we proposed tiered pricing above 100 seats. Decision was deferred pending the ramp-time write-up due today.",
  },
  {
    id: "prepare_briefing",
    label: "Prepare me for my next meeting",
    hint: "One-glance card with goals, risks, and talking points.",
    group: "Today",
    keywords: ["prepare", "brief", "next meeting"],
    responder: () =>
      "Northwind in 18 min. Goal: deliver ramp write-up + revisit pricing. Watch-outs: two skeptics (eng manager, security lead). Suggested ask: pilot expansion to 50 seats by month-end.",
  },
  {
    id: "delete_my_data",
    label: "Show & manage what Hermes remembers about me",
    hint: "Privacy console. Export or delete any memory.",
    group: "Workspace",
    keywords: ["privacy", "memory", "delete", "forget", "data"],
    responder: () =>
      "Opening the memory console. 47 facts stored: 29 about people, 12 about processes, 6 preferences. Nothing has left your tenant. You can export or delete anything.",
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{ intent: Intent; text: string } | null>(null);
  const [seedFromVoice, setSeedFromVoice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open via Cmd/Ctrl+K, close via Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen((o) => !o);
        setResponse(null);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // External openers (used by the voice button)
  useEffect(() => {
    const onOpenEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ query?: string }>).detail;
      setOpen(true);
      setResponse(null);
      if (detail?.query) {
        setQuery(detail.query);
        setSeedFromVoice(detail.query);
      }
    };
    window.addEventListener("hermes:open-palette", onOpenEvent);
    return () => window.removeEventListener("hermes:open-palette", onOpenEvent);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    if (!open) {
      setQuery("");
      setResponse(null);
      setSeedFromVoice(null);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return INTENTS;
    const q = query.toLowerCase();
    return INTENTS.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.hint.toLowerCase().includes(q) ||
        i.keywords.some((k) => k.includes(q)),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const g: Record<Intent["group"], Intent[]> = {
      Today: [],
      Compose: [],
      Recall: [],
      Workspace: [],
    };
    for (const i of filtered) g[i.group].push(i);
    return g;
  }, [filtered]);

  const runIntent = (intent: Intent) => {
    setResponse({ intent, text: intent.responder(query) });
  };

  const onEnter = () => {
    if (filtered.length === 0) return;
    runIntent(filtered[0]!);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[14vh] backdrop-blur-md fade-in"
      style={{ background: "rgba(4,4,8,0.55)" }}
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-strong ring-glow w-[680px] max-w-[92vw] overflow-hidden rounded-2xl float-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="pulse-dot relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter();
            }}
            placeholder={
              seedFromVoice
                ? `Heard: "${seedFromVoice}"`
                : "Ask Hermes anything, or pick an action…"
            }
            className="flex-1 bg-transparent text-base text-white placeholder:text-white/30 focus:outline-none"
          />
          <kbd className="kbd">esc</kbd>
        </div>

        {response ? (
          <div className="space-y-4 px-5 py-5 fade-in">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-300/70">
              {response.intent.group} · {response.intent.label}
            </p>
            <p className="text-[15px] leading-relaxed text-white/85">
              {response.text}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-white/90"
              >
                Looks good
              </button>
              <button
                onClick={() => setResponse(null)}
                className="rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-white/70 hover:bg-white/[0.06]"
              >
                Try again
              </button>
              <span className="ml-auto text-[11px] text-white/40">
                Hermes acted with your full context. Nothing left your tenant.
              </span>
            </div>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto px-2 py-2">
            {filtered.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-white/60">No matching action.</p>
                <p className="mt-1 text-xs text-white/35">
                  Press <kbd className="kbd">enter</kbd> to send freeform to Hermes.
                </p>
              </div>
            )}
            {(["Today", "Compose", "Recall", "Workspace"] as const).map((group) => {
              const items = grouped[group];
              if (items.length === 0) return null;
              return (
                <div key={group} className="px-2 py-2">
                  <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-white/35">
                    {group}
                  </p>
                  <ul className="space-y-1">
                    {items.map((intent) => (
                      <li key={intent.id}>
                        <button
                          onClick={() => runIntent(intent)}
                          className="group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/[0.04]"
                        >
                          <IntentIcon group={intent.group} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white/85">{intent.label}</p>
                            <p className="truncate text-xs text-white/40">
                              {intent.hint}
                            </p>
                          </div>
                          <kbd className="kbd opacity-0 transition group-hover:opacity-100">
                            ↵
                          </kbd>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.015] px-5 py-2.5 text-[11px] text-white/45">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd">↑</kbd>
              <kbd className="kbd">↓</kbd> navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="kbd">↵</kbd> run
            </span>
          </div>
          <span>
            Calling on memory · Slack · Calendar · Gmail — read-only by default.
          </span>
        </div>
      </div>
    </div>
  );
}

function IntentIcon({ group }: { group: Intent["group"] }) {
  const stroke = "currentColor";
  const cls =
    "mt-0.5 h-4 w-4 shrink-0 text-violet-300/80 transition group-hover:text-violet-200";
  if (group === "Today") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cls}>
        <rect x="3" y="5" width="18" height="16" rx="2" stroke={stroke} strokeWidth="1.4" />
        <path d="M3 10h18M8 3v4M16 3v4" stroke={stroke} strokeWidth="1.4" />
      </svg>
    );
  }
  if (group === "Compose") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cls}>
        <path d="M4 19l5-1 11-11-4-4L5 14l-1 5z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }
  if (group === "Recall") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cls}>
        <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.4" />
        <path d="M12 7v5l3 2" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cls}>
      <path
        d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
