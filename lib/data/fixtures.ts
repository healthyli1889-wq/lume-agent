// Mock data shaped like what real connector adapters would return.
// Realistic enough that the widgets look populated; tagged with sensitivity
// so the redaction path can be exercised.

export type Sensitivity = "public" | "internal" | "confidential" | "pii";

export type Contact = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  notes: string;
  sensitivity: Sensitivity;
  lastInteractionAt: string;
};

export type Meeting = {
  id: string;
  startsAt: string;
  durationMin: number;
  subject: string;
  attendeeEmails: string[];
  description: string;
  relatedContactIds: string[];
  recentNoteIds: string[];
};

export type EmailThread = {
  id: string;
  subject: string;
  fromEmail: string;
  receivedAt: string;
  snippet: string;
  body: string;
  sensitivity: Sensitivity;
  needsResponse: boolean;
  priorContextNoteIds: string[];
};

export type Note = {
  id: string;
  contactId: string | null;
  createdAt: string;
  body: string;
  sensitivity: Sensitivity;
};

const today = new Date();
today.setHours(0, 0, 0, 0);
const t = (h: number, m = 0) =>
  new Date(today.getTime() + h * 3600_000 + m * 60_000).toISOString();
const daysAgo = (n: number) =>
  new Date(today.getTime() - n * 86_400_000).toISOString();

export const CONTACTS: Contact[] = [
  {
    id: "c_1",
    name: "Marisa Chen",
    email: "marisa@northwind.io",
    company: "Northwind",
    role: "VP Eng",
    notes:
      "Evaluating us against Glean. Budget approved Q2. Pricing pushback last call: 'over $40/seat is hard to defend'.",
    sensitivity: "confidential",
    lastInteractionAt: daysAgo(4),
  },
  {
    id: "c_2",
    name: "Devon Park",
    email: "devon@orbital.com",
    company: "Orbital",
    role: "Head of Ops",
    notes:
      "Renewing in 3 weeks. Asked about SOC2. Sent report Mar 1. Champion since pilot.",
    sensitivity: "internal",
    lastInteractionAt: daysAgo(8),
  },
  {
    id: "c_3",
    name: "Priya Subramaniam",
    email: "priya@delta-pay.com",
    company: "Delta Pay",
    role: "Founder",
    notes:
      "Cold inbound. Series A fintech. Probably 6-month buying cycle but high LTV if won.",
    sensitivity: "internal",
    lastInteractionAt: daysAgo(2),
  },
  {
    id: "c_4",
    name: "Sam Reyes",
    email: "sam@meadowlark.co",
    company: "Meadowlark",
    role: "COO",
    notes:
      "Churned competitor user. Pricing-sensitive. Wants annual contract discount.",
    sensitivity: "internal",
    lastInteractionAt: daysAgo(1),
  },
];

export const NOTES: Note[] = [
  {
    id: "n_1",
    contactId: "c_1",
    createdAt: daysAgo(4),
    body:
      "Marisa raised concerns about ramp time for non-technical users. We promised a write-up by today.",
    sensitivity: "confidential",
  },
  {
    id: "n_2",
    contactId: "c_1",
    createdAt: daysAgo(11),
    body:
      "First demo. Strong fit. Two skeptics on her team — engineering manager and security lead.",
    sensitivity: "internal",
  },
  {
    id: "n_3",
    contactId: "c_2",
    createdAt: daysAgo(8),
    body:
      "Devon wants a renewal proposal with 3 pricing tiers. Multi-year discount is the lever.",
    sensitivity: "confidential",
  },
  {
    id: "n_4",
    contactId: "c_3",
    createdAt: daysAgo(2),
    body:
      "Priya found us via a Hacker News post. Wants a 30-min intro. Background is ex-Stripe payments.",
    sensitivity: "internal",
  },
  {
    id: "n_5",
    contactId: "c_4",
    createdAt: daysAgo(1),
    body:
      "Sam wants ROI numbers from comparable Meadowlark-stage customers. We owe him a one-pager.",
    sensitivity: "internal",
  },
];

export const MEETINGS: Meeting[] = [
  {
    id: "m_1",
    startsAt: t(9, 30),
    durationMin: 30,
    subject: "Marisa Chen — Northwind follow-up",
    attendeeEmails: ["you@hermes.demo", "marisa@northwind.io"],
    description: "Walk through the ramp-time write-up; revisit pricing.",
    relatedContactIds: ["c_1"],
    recentNoteIds: ["n_1", "n_2"],
  },
  {
    id: "m_2",
    startsAt: t(11, 0),
    durationMin: 45,
    subject: "Devon Park — Orbital renewal",
    attendeeEmails: ["you@hermes.demo", "devon@orbital.com"],
    description: "Present 3 renewal options. He wants multi-year discount.",
    relatedContactIds: ["c_2"],
    recentNoteIds: ["n_3"],
  },
  {
    id: "m_3",
    startsAt: t(14, 0),
    durationMin: 30,
    subject: "Priya — Delta Pay intro call",
    attendeeEmails: ["you@hermes.demo", "priya@delta-pay.com"],
    description: "First call. Inbound from HN.",
    relatedContactIds: ["c_3"],
    recentNoteIds: ["n_4"],
  },
  {
    id: "m_4",
    startsAt: t(16, 30),
    durationMin: 30,
    subject: "Internal — Sprint review",
    attendeeEmails: ["you@hermes.demo", "eng@hermes.demo"],
    description: "What shipped, what's blocked, demo-ready features.",
    relatedContactIds: [],
    recentNoteIds: [],
  },
];

export const EMAILS: EmailThread[] = [
  {
    id: "e_1",
    subject: "Re: Quick question on enterprise pricing",
    fromEmail: "marisa@northwind.io",
    receivedAt: daysAgo(0.1),
    snippet:
      "Following up — can you send the per-seat breakdown for tiers above 100 users?",
    body:
      "Hi — following up on Tuesday's call. Can you send the per-seat breakdown for tiers above 100 users? Also, our security lead asked whether you support BYOK. Thanks.",
    sensitivity: "confidential",
    needsResponse: true,
    priorContextNoteIds: ["n_1", "n_2"],
  },
  {
    id: "e_2",
    subject: "Renewal — checking in",
    fromEmail: "devon@orbital.com",
    receivedAt: daysAgo(0.5),
    snippet:
      "Wanted to confirm we're on for tomorrow at 11. Also a question on the SOC2 report timing.",
    body:
      "Hey — confirming our 11am tomorrow. Also: when does the next SOC2 Type 2 report drop? My security review needs it before we can sign multi-year. Thanks!",
    sensitivity: "internal",
    needsResponse: true,
    priorContextNoteIds: ["n_3"],
  },
  {
    id: "e_3",
    subject: "Saw your HN post — would love to chat",
    fromEmail: "priya@delta-pay.com",
    receivedAt: daysAgo(2),
    snippet:
      "Founder at Delta Pay. We're in early eval mode for an AI ops layer.",
    body:
      "Hey — saw your Hacker News post. I'm the founder at Delta Pay (ex-Stripe). We're in early eval mode for an AI ops layer for our team. Open to a quick call?",
    sensitivity: "internal",
    needsResponse: true,
    priorContextNoteIds: ["n_4"],
  },
  {
    id: "e_4",
    subject: "Newsletter: Tuesday digest",
    fromEmail: "newsletter@firstround.com",
    receivedAt: daysAgo(0.3),
    snippet: "This week in startup news…",
    body: "(newsletter content)",
    sensitivity: "public",
    needsResponse: false,
    priorContextNoteIds: [],
  },
];

export type Commitment = {
  id: string;
  title: string;
  owner: string;
  source: { kind: "meeting" | "email" | "slack"; sourceId: string; on: string };
  promisedTo: string;
  dueAt: string;
  status: "open" | "due_today" | "overdue" | "done";
  sensitivity: Sensitivity;
};

export type MemoryFact = {
  id: string;
  category: "people" | "process" | "preference" | "fact";
  content: string;
  source: string;
  learnedAt: string;
  confidence: number;
};

export const COMMITMENTS: Commitment[] = [
  {
    id: "k_1",
    title: "Send ramp-time write-up to Marisa",
    owner: "you",
    source: { kind: "meeting", sourceId: "m_1", on: daysAgo(4) },
    promisedTo: "Marisa Chen (Northwind)",
    dueAt: t(17),
    status: "due_today",
    sensitivity: "confidential",
  },
  {
    id: "k_2",
    title: "Share SOC2 bridge letter with Devon",
    owner: "you",
    source: { kind: "email", sourceId: "e_2", on: daysAgo(0.5) },
    promisedTo: "Devon Park (Orbital)",
    dueAt: t(48),
    status: "open",
    sensitivity: "internal",
  },
  {
    id: "k_3",
    title: "ROI one-pager for Meadowlark-stage customers",
    owner: "you",
    source: { kind: "meeting", sourceId: "m_4", on: daysAgo(1) },
    promisedTo: "Sam Reyes (Meadowlark)",
    dueAt: daysAgo(-3),
    status: "open",
    sensitivity: "internal",
  },
  {
    id: "k_4",
    title: "Send Priya the Delta Pay tailored demo deck",
    owner: "you",
    source: { kind: "meeting", sourceId: "m_3", on: t(14) },
    promisedTo: "Priya Subramaniam (Delta Pay)",
    dueAt: daysAgo(-7),
    status: "open",
    sensitivity: "internal",
  },
  {
    id: "k_5",
    title: "Book the security walkthrough w/ Northwind security lead",
    owner: "you",
    source: { kind: "email", sourceId: "e_1", on: daysAgo(0.1) },
    promisedTo: "Marisa Chen (Northwind)",
    dueAt: daysAgo(-2),
    status: "open",
    sensitivity: "confidential",
  },
  {
    id: "k_6",
    title: "Sprint review notes circulated",
    owner: "Devon (you)",
    source: { kind: "meeting", sourceId: "m_4", on: daysAgo(2) },
    promisedTo: "Engineering",
    dueAt: daysAgo(1),
    status: "overdue",
    sensitivity: "internal",
  },
];

export const MEMORY_FACTS: MemoryFact[] = [
  {
    id: "f_1",
    category: "preference",
    content: 'Founder prefers replies under 90 words; ends with their first name only — no signature block.',
    source: "12 sent emails",
    learnedAt: daysAgo(3),
    confidence: 0.93,
  },
  {
    id: "f_2",
    category: "process",
    content: "Quarterly business reviews use 3 sections: Wins, Misses, Asks.",
    source: "Q4-2025 QBR doc",
    learnedAt: daysAgo(11),
    confidence: 0.97,
  },
  {
    id: "f_3",
    category: "people",
    content: "Marisa Chen (Northwind) is price-sensitive above $40/seat — anchor below before naming a tier.",
    source: "2 meeting transcripts, 1 email",
    learnedAt: daysAgo(4),
    confidence: 0.88,
  },
  {
    id: "f_4",
    category: "preference",
    content: "Team avoids the phrase 'circle back'; uses 'follow up' instead.",
    source: "5 corrections this week",
    learnedAt: daysAgo(1),
    confidence: 0.84,
  },
  {
    id: "f_5",
    category: "fact",
    content: "Pricing tiers above 100 seats: $32 / $28 / $22–25 (custom).",
    source: "Pricing doc v3.2",
    learnedAt: daysAgo(8),
    confidence: 0.99,
  },
  {
    id: "f_6",
    category: "process",
    content: "Renewal motion: send 3 tier proposal 21 days before contract end; multi-year discount is the lever.",
    source: "Past 4 renewals",
    learnedAt: daysAgo(7),
    confidence: 0.91,
  },
  {
    id: "f_7",
    category: "people",
    content: "Devon Park (Orbital) is a champion since pilot; SOC2 is his security review's only blocker.",
    source: "Email + 3 meetings",
    learnedAt: daysAgo(5),
    confidence: 0.9,
  },
  {
    id: "f_8",
    category: "fact",
    content: "Next SOC2 Type 2 report drops April 15; bridge letter from auditor available now.",
    source: "Compliance Notion page",
    learnedAt: daysAgo(2),
    confidence: 0.98,
  },
];

export function fetchMeetingsForToday(): Meeting[] {
  return MEETINGS;
}

export function fetchEmailsNeedingReply(): EmailThread[] {
  return EMAILS.filter((e) => e.needsResponse);
}

export function fetchContact(id: string): Contact | undefined {
  return CONTACTS.find((c) => c.id === id);
}

export function fetchNote(id: string): Note | undefined {
  return NOTES.find((n) => n.id === id);
}

export function fetchNotesForContact(contactId: string): Note[] {
  return NOTES.filter((n) => n.contactId === contactId).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function fetchOpenCommitments(): Commitment[] {
  return COMMITMENTS.filter((c) => c.status !== "done");
}

export function fetchMemoryFacts(): MemoryFact[] {
  return MEMORY_FACTS;
}
