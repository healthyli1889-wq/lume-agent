"use server";

import { z } from "zod";
import {
  Industry,
  Capability,
  buildInitialProfile,
} from "@/lib/personalization/profile";
import { saveWorkspace, loadWorkspace } from "@/lib/data/store";
import { readGoogleEnv } from "@/lib/connectors/google-auth";

const Input = z.object({
  industry: Industry,
  capabilities: z.array(Capability).min(1),
  workspaceName: z.string().min(1).max(80).default("My workspace"),
});

export type CompleteResult = {
  /** Where the client should navigate next. */
  next: string;
  /** True if the next URL initiates Google OAuth. */
  initiatesOAuth: boolean;
};

export async function completeOnboarding(raw: unknown): Promise<CompleteResult> {
  const { industry, capabilities, workspaceName } = Input.parse(raw);
  const existing = await loadWorkspace();
  await saveWorkspace({
    id: existing?.id ?? "ws_demo",
    name: workspaceName,
    onboardedAt: new Date().toISOString(),
    profile: buildInitialProfile(industry, capabilities),
    corrections: existing?.corrections ?? [],
    dismissedItemIds: existing?.dismissedItemIds ?? [],
    connections: existing?.connections ?? { google: null, notion: null },
  });

  const wantsGoogle =
    capabilities.includes("meeting_copilot") ||
    capabilities.includes("inbox_triage") ||
    capabilities.includes("living_memory");

  // If Google OAuth is configured AND the user picked a capability that
  // benefits from it, jump them straight into consent. Otherwise, take
  // them to /home where they can see the demo populated by fixtures and
  // connect later from the side panel.
  if (wantsGoogle && readGoogleEnv()) {
    return { next: "/api/oauth/google/start", initiatesOAuth: true };
  }
  return { next: "/home", initiatesOAuth: false };
}
