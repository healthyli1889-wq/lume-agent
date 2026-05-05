import { redirect } from "next/navigation";
import "@/lib/widgets"; // side-effect: registers all widgets
import { composeMorningBrief } from "@/lib/widgets/contract";
import { loadWorkspace } from "@/lib/data/store";
import { demoIdentity } from "@/lib/data/identity";
import { fetchMemoryFacts } from "@/lib/data/fixtures";
import { CAPABILITY_META } from "@/lib/personalization/profile";
import { readGoogleEnv } from "@/lib/connectors/google-auth";
import { BriefClient } from "./components/brief-client";
import { ManageMemoryLink } from "./components/manage-memory-link";
import { EntropyMark } from "./components/entropy-mark";
import { AgentPresence } from "@/app/components/agent-presence";
import { CmdKHint } from "@/app/components/cmdk-hint";

export const dynamic = "force-dynamic";

type Search = { connection?: string; detail?: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Search;
}) {
  const ws = await loadWorkspace();
  if (!ws?.onboardedAt) redirect("/onboarding");

  const widgets = await composeMorningBrief({
    identity: demoIdentity(),
    profile: ws.profile,
    asOf: new Date(),
  });

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const itemCount = widgets.reduce((n, w) => n + w.items.length, 0);
  const memoryCount = fetchMemoryFacts().length + ws.corrections.length;

  const googleConfigured = Boolean(readGoogleEnv());
  const googleConnected = Boolean(ws.connections?.google);
  const notionConnected = Boolean(
    ws.connections?.notion || process.env.NOTION_INTEGRATION_TOKEN,
  );
  const banner = bannerFor(searchParams);

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-8">
      <TopBar
        dateLabel={dateLabel}
        memoryCount={memoryCount}
        profileVersion={ws.profile.profileVersion}
        completeness={ws.profile.completenessScore}
      />

      {banner && (
        <div
          className={`glass-card mt-6 flex items-center justify-between px-5 py-3 text-sm ${
            banner.kind === "success"
              ? "border-emerald-400/20 text-emerald-200/90"
              : "border-rose-400/20 text-rose-200/90"
          }`}
        >
          <span>{banner.text}</span>
        </div>
      )}

      <div className="mt-8 grid grid-cols-12 gap-6">
        {/* Main column */}
        <div className="col-span-12 lg:col-span-8">
          <Greeting itemCount={itemCount} dateLabel={dateLabel} />
          <div className="mt-6">
            <BriefClient widgets={widgets} />
          </div>
          {ws.corrections.length > 0 && (
            <div className="glass-card mt-5 px-5 py-3.5 text-[11px] text-white/55">
              <span className="font-medium text-white/80">
                {ws.corrections.length} correction
                {ws.corrections.length === 1 ? "" : "s"} captured
              </span>{" "}
              · profile v{ws.profile.profileVersion}
              {ws.profile.voice.forbiddenPhrases.length > 0 && (
                <>
                  {" "}
                  · now avoiding:{" "}
                  {ws.profile.voice.forbiddenPhrases
                    .slice(-3)
                    .map((p) => `"${p}"`)
                    .join(", ")}
                </>
              )}
            </div>
          )}
        </div>

        {/* Side column */}
        <aside className="col-span-12 space-y-5 lg:col-span-4">
          <AgentCard
            industry={ws.profile.industry}
            capabilities={ws.profile.enabledCapabilities}
          />
          <ConnectionsCard
            googleConfigured={googleConfigured}
            googleConnected={googleConnected}
            googleEmail={ws.connections?.google?.email}
            notionConnected={notionConnected}
          />
          <PrivacyCard />
        </aside>
      </div>

      <FloatingChrome />
    </div>
  );
}

function TopBar({
  dateLabel,
  memoryCount,
  profileVersion,
  completeness,
}: {
  dateLabel: string;
  memoryCount: number;
  profileVersion: number;
  completeness: number;
}) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Mark />
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-medium text-white/90">Hermes</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            workspace agent · {dateLabel}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 text-[11px] text-white/55 sm:inline-flex">
          <AgentPresence status="idle" />
          <span className="tabular-nums">
            {memoryCount} facts learned
          </span>
          <span className="text-white/25">·</span>
          <span className="tabular-nums">
            v{profileVersion} · {Math.round(completeness * 100)}%
          </span>
        </span>
        <CmdKHint />
      </div>
    </header>
  );
}

function Greeting({
  itemCount,
  dateLabel,
}: {
  itemCount: number;
  dateLabel: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300/70">
        {dateLabel}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {greet()}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        Hermes prepared {itemCount} item{itemCount === 1 ? "" : "s"} for you,
        ranked by what's about to matter. Edit anything — every correction
        teaches your agent.
      </p>
    </div>
  );
}

function greet(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

function AgentCard({
  industry,
  capabilities,
}: {
  industry: string;
  capabilities: string[];
}) {
  return (
    <section className="glass-card overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div>
          <h2 className="text-sm font-medium text-white/90">Your agent</h2>
          <p className="text-[11px] text-white/45">Personalized for {industry}</p>
        </div>
        <AgentPresence status="idle" label="online" />
      </header>
      <ul className="divide-y divide-white/[0.05]">
        {capabilities.map((c) => {
          const meta = CAPABILITY_META[c as keyof typeof CAPABILITY_META];
          if (!meta) return null;
          return (
            <li key={c} className="flex items-start gap-3 px-5 py-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              <div className="min-w-0">
                <p className="text-sm text-white/85">{meta.title}</p>
                <p className="text-[11px] text-white/45">{meta.subtitle}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ConnectionsCard({
  googleConfigured,
  googleConnected,
  googleEmail,
  notionConnected,
}: {
  googleConfigured: boolean;
  googleConnected: boolean;
  googleEmail?: string;
  notionConnected: boolean;
}) {
  const googleStatus = googleConnected ? "live" : googleConfigured ? "off" : "unconfigured";
  const googleNote = googleConnected
    ? `${googleEmail ?? "connected"} · Calendar · Gmail · Drive`
    : googleConfigured
      ? "ready to connect"
      : "set GOOGLE_CLIENT_ID + SECRET in .env.local";

  const notionStatus = notionConnected ? "live" : "off";
  const notionNote = notionConnected
    ? "pages shared with the integration"
    : "set NOTION_INTEGRATION_TOKEN in .env.local";

  const conns: { name: string; status: "live" | "off" | "unconfigured"; note: string; href?: string }[] = [
    {
      name: "Google Workspace",
      status: googleStatus,
      note: googleNote,
      href: googleConfigured && !googleConnected ? "/api/oauth/google/start" : undefined,
    },
    { name: "Notion", status: notionStatus, note: notionNote },
    { name: "Slack", status: "off", note: "coming next round" },
  ];
  const dot = (s: string) =>
    s === "live"
      ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
      : s === "off"
        ? "bg-white/25"
        : "bg-rose-400/70";
  return (
    <section className="glass-card overflow-hidden">
      <header className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-sm font-medium text-white/90">Connected</h2>
        <p className="text-[11px] text-white/45">
          Hermes lives where your team works.
        </p>
      </header>
      <ul className="divide-y divide-white/[0.05]">
        {conns.map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between px-5 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className={`h-1.5 w-1.5 rounded-full ${dot(c.status)}`} />
              <div>
                <p className="text-sm text-white/85">{c.name}</p>
                <p className="text-[11px] text-white/45">{c.note}</p>
              </div>
            </div>
            {c.href ? (
              <a
                href={c.href}
                className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/70 hover:bg-white/[0.08]"
              >
                connect
              </a>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-white/35">
                {c.status === "unconfigured" ? "needs setup" : c.status}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function bannerFor(s?: { connection?: string; detail?: string }) {
  if (!s?.connection) return null;
  if (s.connection === "ok") {
    return { kind: "success" as const, text: "Connected to Google Workspace. Pulling your real Calendar + Gmail + Drive." };
  }
  if (s.connection === "denied") {
    return { kind: "error" as const, text: "Google sign-in was canceled. The demo will keep using fixtures until you connect." };
  }
  const detail = s.detail ? `: ${decodeURIComponent(s.detail)}` : "";
  return { kind: "error" as const, text: `Couldn't complete connection${detail}.` };
}

function PrivacyCard() {
  return (
    <section className="glass-card overflow-hidden">
      <header className="border-b border-white/[0.06] px-5 py-3.5">
        <h2 className="text-sm font-medium text-white/90">Privacy state</h2>
        <p className="text-[11px] text-white/45">Schema-only execution active.</p>
      </header>
      <div className="px-5 py-4 text-[12px] leading-relaxed text-white/65">
        <p>
          Sensitive fields are read inside a sandbox you control. Only
          policy-approved aggregates reach the model. Nothing has left your
          tenant.
        </p>
        <ManageMemoryLink />
      </div>
    </section>
  );
}

function FloatingChrome() {
  // Subtle hint at the bottom-left mirroring the voice button on the right.
  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-40 hidden items-center gap-2 text-[11px] text-white/35 sm:flex">
      <span>Press</span>
      <kbd className="kbd">⌘K</kbd>
      <span>or hit the mic to talk to Hermes anywhere</span>
    </div>
  );
}

function Mark() {
  return (
    <span className="relative inline-flex h-9 w-9 overflow-hidden rounded-lg border border-white/[0.08] bg-black">
      {/* tiny Entropy: the brand mark IS the live agent state */}
      <EntropyMark />
    </span>
  );
}
