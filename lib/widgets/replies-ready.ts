import {
  registerWidget,
  type Widget,
  type BriefItem,
  type FetchContext,
} from "./contract";
import {
  fetchEmailsNeedingReply as fetchFixtureEmails,
  fetchNote,
  type EmailThread,
} from "@/lib/data/fixtures";
import { complete } from "@/lib/llm/anthropic";
import { buildSystemPrompt } from "@/lib/personalization/profile";
import { loadWorkspace, saveWorkspace } from "@/lib/data/store";
import { fetchLiveEmailsNeedingReply, type LiveEmail } from "@/lib/connectors/gmail";

type WorkingEmail = {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  body: string;
  source: "live" | "fixture";
  priorContext: string;
  priorRefs: string[];
  sensitivity: "public" | "internal" | "confidential" | "pii";
};

export const repliesReady: Widget = {
  type: "replies_ready",
  title: "Replies ready",
  question: "Which messages should I respond to, and what would I say?",
  emptyState: "Inbox is clean. Nice.",

  async fetch(ctx: FetchContext): Promise<BriefItem[]> {
    const sys = buildSystemPrompt(ctx.profile);
    const emails = await loadEmails();

    return Promise.all(
      emails.map(async (e): Promise<BriefItem> => {
        const draft = await complete({
          systemPrompt: sys,
          userPrompt: [
            "Draft a reply to the email below in the team's voice.",
            "Use only the prior context provided; do not invent specifics.",
            "If a fact you'd want to cite is missing, write [TBD] instead.",
            "Keep it short. End with the user's first name placeholder.",
            "",
            "── Email ──",
            `From: ${e.fromName ? `${e.fromName} <${e.fromEmail}>` : e.fromEmail}`,
            `Subject: ${e.subject}`,
            `Body:\n${e.body}`,
            "",
            "── Prior context ──",
            e.priorContext || "(none)",
          ].join("\n"),
          maxTokens: 500,
        });

        return {
          id: e.id,
          title: e.subject,
          subtitle: `From ${e.fromName ? `${e.fromName} <${e.fromEmail}>` : e.fromEmail}`,
          bodyDraft: draft,
          actions: [
            { id: "draft_reply", label: "Edit draft", primary: true },
            { id: "send", label: "Send" },
            { id: "dismiss", label: "Dismiss" },
          ],
          confidence: e.priorContext ? 0.85 : 0.62,
          sensitivity: e.sensitivity,
          provenance: [
            { sourceType: e.source === "live" ? "gmail" : "fixture_email", sourceId: e.id },
            ...e.priorRefs.map((id) => ({ sourceType: "note", sourceId: id })),
          ],
        };
      }),
    );
  },

  rank(items, _profile) {
    return [...items].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  },

  async onAction({ item, actionId }) {
    if (actionId === "dismiss" || actionId === "send") {
      const ws = await loadWorkspace();
      if (ws) {
        await saveWorkspace({
          ...ws,
          dismissedItemIds: [...ws.dismissedItemIds, item.id],
        });
      }
    }
    return null;
  },
};

async function loadEmails(): Promise<WorkingEmail[]> {
  // 1. Live Gmail first.
  try {
    const live = await fetchLiveEmailsNeedingReply(5);
    if (live && live.length > 0) {
      return live.map(toWorkingLive);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[hermes] live gmail fetch failed; falling back:", err);
  }

  // 2. Fixture fallback.
  return fetchFixtureEmails().map(toWorkingFixture);
}

function toWorkingLive(e: LiveEmail): WorkingEmail {
  return {
    id: e.id,
    subject: e.subject,
    fromEmail: e.fromEmail,
    fromName: e.fromName,
    body: e.body || e.snippet,
    source: "live",
    priorContext: "",            // will be enriched once we wire Drive search
    priorRefs: [],
    sensitivity: "internal",
  };
}

function toWorkingFixture(e: EmailThread): WorkingEmail {
  const priorContext = e.priorContextNoteIds
    .map((id) => fetchNote(id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .map((n) => `[${n.id}] (${n.createdAt.slice(0, 10)}) ${n.body}`)
    .join("\n");
  return {
    id: e.id,
    subject: e.subject,
    fromEmail: e.fromEmail,
    fromName: "",
    body: e.body,
    source: "fixture",
    priorContext,
    priorRefs: e.priorContextNoteIds,
    sensitivity: e.sensitivity,
  };
}

registerWidget(repliesReady);
