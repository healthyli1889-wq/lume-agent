import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { WorkspaceProfile } from "@/lib/personalization/profile";

const FILE = path.join(process.cwd(), "data", "workspace.json");

const Correction = z.object({
  at: z.string(),
  artifactKind: z.enum(["email", "doc", "card", "summary"]),
  original: z.string(),
  edited: z.string(),
  itemId: z.string(),
});
export type Correction = z.infer<typeof Correction>;

const GoogleConnection = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),                       // ms epoch
  scopes: z.array(z.string()),
  email: z.string().email().optional(),
  connectedAt: z.string(),
});
export type GoogleConnection = z.infer<typeof GoogleConnection>;

const NotionConnection = z.object({
  token: z.string(),
  workspaceName: z.string().optional(),
  connectedAt: z.string(),
});
export type NotionConnection = z.infer<typeof NotionConnection>;

const Connections = z.object({
  google: GoogleConnection.nullable().default(null),
  notion: NotionConnection.nullable().default(null),
});
export type Connections = z.infer<typeof Connections>;

const Workspace = z.object({
  id: z.string(),
  name: z.string(),
  onboardedAt: z.string().nullable(),
  profile: WorkspaceProfile,
  corrections: z.array(Correction).default([]),
  dismissedItemIds: z.array(z.string()).default([]),
  connections: Connections.default({ google: null, notion: null }),
});
export type Workspace = z.infer<typeof Workspace>;

async function ensureDir() {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
}

export async function loadWorkspace(): Promise<Workspace | null> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return Workspace.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveWorkspace(w: Workspace): Promise<void> {
  await ensureDir();
  await fs.writeFile(FILE, JSON.stringify(w, null, 2), "utf8");
}

export async function patchWorkspace(
  patch: (w: Workspace) => Workspace | Promise<Workspace>,
): Promise<Workspace> {
  const current = await loadWorkspace();
  if (!current) throw new Error("Workspace not initialized");
  const next = await patch(current);
  await saveWorkspace(next);
  return next;
}

// Convenience: get-or-create a draft workspace, used by OAuth callbacks
// that may run before a user has completed onboarding.
export async function getOrInitWorkspace(): Promise<Workspace> {
  const ws = await loadWorkspace();
  if (ws) return ws;
  const blank: Workspace = {
    id: "ws_demo",
    name: "My workspace",
    onboardedAt: null,
    profile: {
      industry: "other",
      presetId: "general",
      personaFragment: "",
      domainFragment: "",
      voiceFragment: "Voice: neutral; prefer prose.",
      voice: { register: "neutral", bulletPreference: "prose", signaturePhrases: [], forbiddenPhrases: [] },
      glossary: {},
      morningBriefWidgetOrder: ["todays_meetings", "replies_ready", "open_commitments", "living_memory"],
      enabledCapabilities: ["meeting_copilot", "inbox_triage", "team_commitments", "living_memory", "voice_command"],
      completenessScore: 0.2,
      profileVersion: 1,
      lastRefinedAt: new Date().toISOString(),
    },
    corrections: [],
    dismissedItemIds: [],
    connections: { google: null, notion: null },
  };
  await saveWorkspace(blank);
  return blank;
}
