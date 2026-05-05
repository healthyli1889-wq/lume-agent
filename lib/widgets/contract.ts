import type { WorkspaceProfile } from "@/lib/personalization/profile";
import type { Identity } from "@/lib/data/identity";

export type ActionId = "open" | "draft_reply" | "send" | "dismiss" | "snooze";

export type WidgetAction = {
  id: ActionId;
  label: string;
  destructive?: boolean;
  primary?: boolean;
};

export type ProvenanceRef = { sourceType: string; sourceId: string };

export type BriefItem = {
  id: string;
  title: string;
  subtitle: string;
  bodyDraft?: string;
  actions: WidgetAction[];
  confidence: number;
  sensitivity: "public" | "internal" | "confidential" | "pii";
  provenance: ProvenanceRef[];
};

export type RenderedWidget = {
  type: string;
  title: string;
  question: string;
  items: BriefItem[];
  emptyState: string;
};

export type FetchContext = {
  identity: Identity;
  profile: WorkspaceProfile;
  asOf: Date;
};

export interface Widget {
  type: string;
  title: string;
  question: string;
  emptyState: string;

  fetch(ctx: FetchContext): Promise<BriefItem[]>;
  rank(items: BriefItem[], profile: WorkspaceProfile): BriefItem[];
  onAction(args: {
    item: BriefItem;
    actionId: ActionId;
    actor: Identity;
  }): Promise<BriefItem | null>;
}

const REGISTRY = new Map<string, Widget>();

export function registerWidget(w: Widget): Widget {
  if (REGISTRY.has(w.type)) {
    return REGISTRY.get(w.type)!;
  }
  REGISTRY.set(w.type, w);
  return w;
}

export function getWidget(type: string): Widget | null {
  return REGISTRY.get(type) ?? null;
}

export function allWidgets(): Widget[] {
  return [...REGISTRY.values()];
}

const ALWAYS_SHOW = new Set(["needs_attention"]);

export async function composeMorningBrief(
  ctx: FetchContext,
): Promise<RenderedWidget[]> {
  const order = ctx.profile.morningBriefWidgetOrder;
  const rendered: RenderedWidget[] = [];

  for (const type of order) {
    const w = getWidget(type);
    if (!w) continue;
    const raw = await w.fetch(ctx);
    const items = w.rank(raw, ctx.profile);
    if (items.length === 0 && !ALWAYS_SHOW.has(type)) continue;
    rendered.push({
      type: w.type,
      title: w.title,
      question: w.question,
      items,
      emptyState: w.emptyState,
    });
  }
  return rendered;
}
