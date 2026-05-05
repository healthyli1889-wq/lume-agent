import { NextResponse } from "next/server";
import { z } from "zod";
import "@/lib/widgets";
import { composeMorningBrief, getWidget } from "@/lib/widgets/contract";
import { loadWorkspace } from "@/lib/data/store";
import { demoIdentity } from "@/lib/data/identity";
import { fetchLiveMeetingsForToday } from "@/lib/connectors/google-calendar";
import { fetchLiveEmailsNeedingReply } from "@/lib/connectors/gmail";
import { fetchRecentDocs } from "@/lib/connectors/google-drive";
import { fetchRecentNotionPages } from "@/lib/connectors/notion";
import { complete } from "@/lib/llm/anthropic";
import { buildSystemPrompt } from "@/lib/personalization/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Programmable agent surface.
 *
 *   POST /api/agent/run
 *   Content-Type: application/json
 *   {
 *     "intent": "morning_brief" | "list_meetings" | "list_emails" |
 *               "list_docs"     | "list_notion"   | "ask",
 *     "args":   { ...intent-specific... }
 *   }
 *
 * Examples:
 *   curl -s localhost:3000/api/agent/run \
 *        -H 'content-type: application/json' \
 *        -d '{"intent":"morning_brief"}' | jq
 *
 *   curl -s localhost:3000/api/agent/run \
 *        -H 'content-type: application/json' \
 *        -d '{"intent":"ask","args":{"prompt":"summarize my day in 3 bullets"}}'
 */

const Body = z.object({
  intent: z.enum([
    "morning_brief",
    "list_meetings",
    "list_emails",
    "list_docs",
    "list_notion",
    "ask",
    "widget",
  ]),
  args: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", detail: (e as Error).message },
      { status: 400 },
    );
  }

  const ws = await loadWorkspace();
  if (!ws) {
    return NextResponse.json(
      {
        ok: false,
        error: "not_onboarded",
        hint: "Visit /onboarding first, or POST nothing — this surface needs an initialized workspace.",
      },
      { status: 409 },
    );
  }

  const ctx = {
    identity: demoIdentity(),
    profile: ws.profile,
    asOf: new Date(),
  };

  try {
    switch (parsed.intent) {
      case "morning_brief": {
        const widgets = await composeMorningBrief(ctx);
        return NextResponse.json({ ok: true, widgets });
      }
      case "list_meetings": {
        const live = await fetchLiveMeetingsForToday();
        return NextResponse.json({
          ok: true,
          source: live ? "live_calendar" : "fixture",
          meetings: live ?? (await import("@/lib/data/fixtures")).fetchMeetingsForToday(),
        });
      }
      case "list_emails": {
        const live = await fetchLiveEmailsNeedingReply(8);
        return NextResponse.json({
          ok: true,
          source: live ? "live_gmail" : "fixture",
          emails: live ?? (await import("@/lib/data/fixtures")).fetchEmailsNeedingReply(),
        });
      }
      case "list_docs": {
        const docs = await fetchRecentDocs(10);
        return NextResponse.json({
          ok: true,
          source: docs ? "live_drive" : "none",
          docs: docs ?? [],
        });
      }
      case "list_notion": {
        const pages = await fetchRecentNotionPages(20);
        return NextResponse.json({
          ok: true,
          source: pages ? "live_notion" : "none",
          pages: pages ?? [],
        });
      }
      case "widget": {
        const type = String(parsed.args.type ?? "");
        const w = getWidget(type);
        if (!w) {
          return NextResponse.json(
            { ok: false, error: "unknown_widget", type },
            { status: 404 },
          );
        }
        const items = await w.fetch(ctx);
        return NextResponse.json({
          ok: true,
          widget: { type: w.type, title: w.title, question: w.question },
          items: w.rank(items, ctx.profile),
        });
      }
      case "ask": {
        const prompt = String(parsed.args.prompt ?? "").trim();
        if (!prompt) {
          return NextResponse.json(
            { ok: false, error: "missing_prompt" },
            { status: 400 },
          );
        }
        const text = await complete({
          systemPrompt: buildSystemPrompt(ctx.profile),
          userPrompt: prompt,
          maxTokens: 800,
        });
        return NextResponse.json({ ok: true, text });
      }
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "intent_failed",
        intent: parsed.intent,
        detail: (e as Error).message,
      },
      { status: 500 },
    );
  }
}
