"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getWidget } from "@/lib/widgets/contract";
import { loadWorkspace, patchWorkspace } from "@/lib/data/store";
import { demoIdentity } from "@/lib/data/identity";
import {
  renderVoiceFragment,
  type WorkspaceProfile,
  type VoiceSignal,
} from "@/lib/personalization/profile";
import "@/lib/widgets"; // ensure registry is populated when actions execute

const ActionInput = z.object({
  widgetType: z.string(),
  itemId: z.string(),
  actionId: z.enum(["open", "draft_reply", "send", "dismiss", "snooze"]),
});

export async function dispatchAction(raw: unknown): Promise<void> {
  const input = ActionInput.parse(raw);
  const widget = getWidget(input.widgetType);
  if (!widget) return;

  const ws = await loadWorkspace();
  if (!ws) return;

  const items = await widget.fetch({
    identity: demoIdentity(),
    profile: ws.profile,
    asOf: new Date(),
  });
  const item = items.find((i) => i.id === input.itemId);
  if (!item) return;

  await widget.onAction({
    item,
    actionId: input.actionId,
    actor: demoIdentity(),
  });
  revalidatePath("/home");
}

const EditInput = z.object({
  itemId: z.string(),
  original: z.string(),
  edited: z.string(),
  artifactKind: z.enum(["email", "doc", "card", "summary"]),
});

export async function recordEdit(
  raw: unknown,
): Promise<{ learnedSummary: string }> {
  const input = EditInput.parse(raw);

  const updated = await patchWorkspace((ws) => {
    const corrections = [
      ...ws.corrections,
      { ...input, at: new Date().toISOString() },
    ];
    const refined = inferVoiceUpdate(ws.profile, input.original, input.edited);
    return {
      ...ws,
      corrections,
      profile: refined ?? ws.profile,
    };
  });

  return {
    learnedSummary: summarize(
      updated.profile.voice,
      input.original,
      input.edited,
    ),
  };
}

function inferVoiceUpdate(
  profile: WorkspaceProfile,
  original: string,
  edited: string,
): WorkspaceProfile | null {
  const shortened = edited.length < original.length * 0.75;
  const FLOWERY = ["delighted", "circle back", "synergize", "kindly", "as per"];
  const newForbidden = FLOWERY.filter(
    (p) =>
      original.toLowerCase().includes(p) && !edited.toLowerCase().includes(p),
  );

  if (!shortened && newForbidden.length === 0) return null;

  const voice: VoiceSignal = {
    ...profile.voice,
    forbiddenPhrases: Array.from(
      new Set([...profile.voice.forbiddenPhrases, ...newForbidden]),
    ).slice(0, 16),
    register: shortened ? "casual" : profile.voice.register,
  };
  return {
    ...profile,
    voice,
    voiceFragment: renderVoiceFragment(voice),
    profileVersion: profile.profileVersion + 1,
    lastRefinedAt: new Date().toISOString(),
    completenessScore: Math.min(1, profile.completenessScore + 0.02),
  };
}

function summarize(
  voice: VoiceSignal,
  original: string,
  edited: string,
): string {
  const parts: string[] = [];
  const lastForbidden = voice.forbiddenPhrases.at(-1);
  if (lastForbidden && original.toLowerCase().includes(lastForbidden)) {
    parts.push(`avoid "${lastForbidden}"`);
  }
  if (edited.length < original.length * 0.75) {
    parts.push("prefer shorter, more direct phrasing");
  }
  if (parts.length === 0) parts.push("noted your tone preference");
  return parts.join(", ");
}
