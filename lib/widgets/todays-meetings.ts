import {
  registerWidget,
  type Widget,
  type BriefItem,
  type FetchContext,
} from "./contract";
import {
  fetchMeetingsForToday as fetchFixtureMeetings,
  fetchContact,
  fetchNotesForContact,
  type Meeting,
} from "@/lib/data/fixtures";
import { complete } from "@/lib/llm/anthropic";
import { buildSystemPrompt } from "@/lib/personalization/profile";
import { loadWorkspace, saveWorkspace } from "@/lib/data/store";
import { fetchLiveMeetingsForToday } from "@/lib/connectors/google-calendar";

type WorkingMeeting = {
  id: string;
  startsAt: string;
  durationMin: number;
  subject: string;
  description: string;
  attendeeEmails: string[];
  source: "live" | "fixture";
  // Optional fixture-only context (notes from the demo CRM).
  noteRefs: string[];
  noteText: string;
  contactName: string;
  contactCompany: string;
  contactRole: string;
};

export const todaysMeetings: Widget = {
  type: "todays_meetings",
  title: "Today's meetings",
  question: "What meetings do I have today, with what context?",
  emptyState: "No meetings on the calendar today.",

  async fetch(ctx: FetchContext): Promise<BriefItem[]> {
    const sys = buildSystemPrompt(ctx.profile);
    const meetings = await loadMeetings();

    return Promise.all(
      meetings.map(async (m): Promise<BriefItem> => {
        const subtitleBits = [
          formatTime(m.startsAt),
          `${m.durationMin} min`,
        ];
        if (m.contactCompany) subtitleBits.push(m.contactCompany);
        else if (m.attendeeEmails.length > 1) {
          subtitleBits.push(`${m.attendeeEmails.length} attendees`);
        }

        const contextSummary = await summarize(m, sys);

        return {
          id: m.id,
          title: m.subject,
          subtitle: subtitleBits.join(" · "),
          bodyDraft: contextSummary,
          actions: [
            { id: "open", label: "View context", primary: true },
            { id: "snooze", label: "Snooze" },
          ],
          confidence: m.noteRefs.length > 0 ? 0.92 : 0.7,
          sensitivity: "internal",
          provenance: [
            { sourceType: m.source === "live" ? "calendar" : "fixture_calendar", sourceId: m.id },
            ...m.noteRefs.map((id) => ({ sourceType: "note", sourceId: id })),
          ],
        };
      }),
    );
  },

  rank(items, _profile) {
    return [...items]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 6);
  },

  async onAction({ item, actionId }) {
    if (actionId === "snooze") {
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

async function loadMeetings(): Promise<WorkingMeeting[]> {
  // 1. Live first.
  try {
    const live = await fetchLiveMeetingsForToday();
    if (live && live.length > 0) {
      return live.map((m) => ({
        id: m.id,
        startsAt: m.startsAt,
        durationMin: m.durationMin,
        subject: m.subject,
        description: m.description,
        attendeeEmails: m.attendeeEmails,
        source: "live" as const,
        noteRefs: [],
        noteText: "",
        contactName: "",
        contactCompany: "",
        contactRole: "",
      }));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[hermes] live calendar fetch failed; falling back:", err);
  }

  // 2. Fixture fallback (always populated for the demo).
  return fetchFixtureMeetings().map(toWorkingFixture);
}

function toWorkingFixture(m: Meeting): WorkingMeeting {
  const contactId = m.relatedContactIds[0];
  const contact = contactId ? fetchContact(contactId) : undefined;
  const notes = contact ? fetchNotesForContact(contact.id).slice(0, 3) : [];
  const noteText = notes
    .map((n) => `[${n.id}] (${n.createdAt.slice(0, 10)}) ${n.body}`)
    .join("\n");
  return {
    id: m.id,
    startsAt: m.startsAt,
    durationMin: m.durationMin,
    subject: m.subject,
    description: m.description,
    attendeeEmails: m.attendeeEmails,
    source: "fixture",
    noteRefs: notes.map((n) => n.id),
    noteText,
    contactName: contact?.name ?? "",
    contactCompany: contact?.company ?? "",
    contactRole: contact?.role ?? "",
  };
}

async function summarize(m: WorkingMeeting, systemPrompt: string): Promise<string> {
  if (m.source === "live") {
    if (!m.description && m.attendeeEmails.length <= 1) {
      return "Internal time block — no external context to surface.";
    }
    return complete({
      systemPrompt,
      userPrompt: [
        "Three short bullets to brief me before this meeting.",
        "Use only the data below; if you don't know something, say [unknown].",
        "",
        `Title: ${m.subject}`,
        `When: ${m.startsAt} (${m.durationMin} min)`,
        `Attendees: ${m.attendeeEmails.join(", ") || "(none listed)"}`,
        `Description: ${m.description || "(none)"}`,
      ].join("\n"),
      maxTokens: 220,
    });
  }
  // Fixture: richer context using the synthetic CRM notes.
  if (m.noteRefs.length === 0) {
    return "Internal meeting — no external context to surface.";
  }
  return complete({
    systemPrompt,
    userPrompt: [
      "Context summary for this meeting. Three short bullets.",
      "Reference only the notes below; cite each as [n_id].",
      "",
      `Meeting: ${m.subject}`,
      `Counterparty: ${m.contactName} (${m.contactRole}, ${m.contactCompany})`,
      "",
      "Recent notes:",
      m.noteText,
    ].join("\n"),
    maxTokens: 250,
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

registerWidget(todaysMeetings);
