import { z } from "zod";

export const Industry = z.enum([
  "saas",
  "agency",
  "ecommerce",
  "professional_services",
  "healthcare",
  "real_estate",
  "financial_services",
  "other",
]);
export type Industry = z.infer<typeof Industry>;

export const Capability = z.enum([
  "meeting_copilot",
  "inbox_triage",
  "team_commitments",
  "living_memory",
  "voice_command",
]);
export type Capability = z.infer<typeof Capability>;

export const ALL_CAPABILITIES: Capability[] = [
  "meeting_copilot",
  "inbox_triage",
  "team_commitments",
  "living_memory",
  "voice_command",
];

export const CAPABILITY_META: Record<
  Capability,
  { title: string; subtitle: string; widgetType?: string }
> = {
  meeting_copilot: {
    title: "Meeting copilot",
    subtitle: "Brief you before every meeting; capture decisions and action items after.",
    widgetType: "todays_meetings",
  },
  inbox_triage: {
    title: "Inbox triage",
    subtitle: "Surface what needs your reply. Draft each response in your team's voice.",
    widgetType: "replies_ready",
  },
  team_commitments: {
    title: "Team commitments",
    subtitle: "Track every promise across meetings, email, Slack — surface what's due.",
    widgetType: "open_commitments",
  },
  living_memory: {
    title: "Living memory",
    subtitle: "Hermes remembers how your team works. Recall anything in one keystroke.",
    widgetType: "living_memory",
  },
  voice_command: {
    title: "Voice anywhere",
    subtitle: "Talk to Hermes from any tab. ⌘K to type, mic to speak.",
  },
};

export const VoiceSignal = z.object({
  register: z.enum(["casual", "neutral", "formal"]),
  bulletPreference: z.enum(["bullets", "prose"]),
  signaturePhrases: z.array(z.string()).default([]),
  forbiddenPhrases: z.array(z.string()).default([]),
});
export type VoiceSignal = z.infer<typeof VoiceSignal>;

export const WorkspaceProfile = z.object({
  industry: Industry,
  presetId: z.string(),
  personaFragment: z.string(),
  domainFragment: z.string(),
  voiceFragment: z.string(),
  voice: VoiceSignal,
  glossary: z.record(z.string(), z.string()).default({}),
  morningBriefWidgetOrder: z.array(z.string()),
  enabledCapabilities: z.array(Capability).default([
    "meeting_copilot",
    "inbox_triage",
    "team_commitments",
    "living_memory",
    "voice_command",
  ]),
  completenessScore: z.number().min(0).max(1),
  profileVersion: z.number().int().min(1),
  lastRefinedAt: z.string(),
});
export type WorkspaceProfile = z.infer<typeof WorkspaceProfile>;

type Preset = {
  id: string;
  industry: Industry;
  displayName: string;
  personaFragment: string;
  domainFragment: string;
  morningBriefWidgetOrder: string[];
  defaultGlossary: Record<string, string>;
};

const PRESETS: Record<string, Preset> = {
  saas_startup: {
    id: "saas_startup",
    industry: "saas",
    displayName: "SaaS startup",
    personaFragment:
      "This team builds and sells software. They move fast, value brevity, ship in iterations, and prefer concrete decisions over discussion.",
    domainFragment:
      "Common entities: customer (paying), prospect (in pipeline), user (uses product), MRR/ARR, churn, NPS, sprint, ticket, deploy, incident.",
    morningBriefWidgetOrder: [
      "todays_meetings",
      "replies_ready",
      "open_commitments",
      "living_memory",
    ],
    defaultGlossary: {
      deal: "an opportunity in HubSpot or equivalent",
      ticket: "a Linear or Jira issue",
      demo: "a scheduled product demo with a prospect",
    },
  },
  creative_agency: {
    id: "creative_agency",
    industry: "agency",
    displayName: "Creative agency",
    personaFragment:
      "This is a client services agency. Work is organized by client and project. Voice is polished, deliverable-focused, deadline-aware.",
    domainFragment:
      "Common entities: client, project, brief, scope, deliverable, retainer, milestone, creative review, change request.",
    morningBriefWidgetOrder: [
      "todays_meetings",
      "replies_ready",
      "open_commitments",
      "living_memory",
    ],
    defaultGlossary: {
      scope: "agreed deliverables in current SOW",
      retainer: "monthly fixed engagement",
    },
  },
  ecommerce_brand: {
    id: "ecommerce_brand",
    industry: "ecommerce",
    displayName: "E-commerce brand",
    personaFragment:
      "This team runs a consumer brand. Focus is conversion, inventory, support, ad performance. Tone is brand-aligned, customer-first.",
    domainFragment:
      "Common entities: SKU, order, customer, AOV, CAC, LTV, ROAS, refund, supplier, drop, restock, campaign.",
    morningBriefWidgetOrder: [
      "replies_ready",
      "todays_meetings",
      "open_commitments",
      "living_memory",
    ],
    defaultGlossary: { AOV: "average order value", ROAS: "return on ad spend" },
  },
  general: {
    id: "general",
    industry: "other",
    displayName: "General",
    personaFragment:
      "This is a small operating team. Adapt to their voice and workflow as you observe them; default to concise, action-oriented output.",
    domainFragment: "",
    morningBriefWidgetOrder: [
      "todays_meetings",
      "replies_ready",
      "open_commitments",
      "living_memory",
    ],
    defaultGlossary: {},
  },
};

export function presetForIndustry(industry: Industry): Preset {
  const direct = Object.values(PRESETS).find((p) => p.industry === industry);
  return direct ?? PRESETS.general!;
}

export function buildInitialProfile(
  industry: Industry,
  enabledCapabilities: Capability[] = ALL_CAPABILITIES,
): WorkspaceProfile {
  const preset = presetForIndustry(industry);
  const voice: VoiceSignal = {
    register: "neutral",
    bulletPreference: "prose",
    signaturePhrases: [],
    forbiddenPhrases: [],
  };

  // Filter widget order to only those whose capability is enabled.
  const enabledWidgetTypes = new Set(
    enabledCapabilities
      .map((c) => CAPABILITY_META[c].widgetType)
      .filter((w): w is string => Boolean(w)),
  );
  const order = preset.morningBriefWidgetOrder.filter((w) => enabledWidgetTypes.has(w));

  return {
    industry,
    presetId: preset.id,
    personaFragment: preset.personaFragment,
    domainFragment: preset.domainFragment,
    voiceFragment: renderVoiceFragment(voice),
    voice,
    glossary: preset.defaultGlossary,
    morningBriefWidgetOrder: order.length > 0 ? order : preset.morningBriefWidgetOrder,
    enabledCapabilities,
    completenessScore: 0.4,
    profileVersion: 1,
    lastRefinedAt: new Date().toISOString(),
  };
}

export function renderVoiceFragment(v: VoiceSignal): string {
  const bits = [
    `${v.register} register`,
    v.bulletPreference === "bullets" ? "prefer bullets" : "prefer prose",
  ];
  if (v.forbiddenPhrases.length > 0) {
    bits.push(
      `avoid: ${v.forbiddenPhrases.slice(0, 5).map((p) => `"${p}"`).join(", ")}`,
    );
  }
  if (v.signaturePhrases.length > 0) {
    bits.push(
      `team often uses: ${v.signaturePhrases.slice(0, 5).map((p) => `"${p}"`).join(", ")}`,
    );
  }
  return `Voice: ${bits.join("; ")}.`;
}

export function buildSystemPrompt(profile: WorkspaceProfile): string {
  return [
    "You are Hermes, an AI teammate embedded in this team.",
    "",
    "── About this team ──",
    profile.personaFragment,
    profile.domainFragment ? `Industry context: ${profile.domainFragment}` : "",
    "",
    "── Voice ──",
    profile.voiceFragment,
    Object.keys(profile.glossary).length > 0 ? renderGlossary(profile.glossary) : "",
    "",
    "── Hard rules ──",
    "- Never invent facts you weren't shown in the retrieved context.",
    "- For external side effects, propose first; the user approves before you act.",
    "- Cite the source id (in [brackets]) for any claim from retrieved context.",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderGlossary(g: Record<string, string>): string {
  const lines = Object.entries(g)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join("\n");
  return `── This team's terms ──\n${lines}`;
}
