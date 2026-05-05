import {
  registerWidget,
  type Widget,
  type BriefItem,
  type FetchContext,
} from "./contract";
import { fetchOpenCommitments } from "@/lib/data/fixtures";
import { loadWorkspace, saveWorkspace } from "@/lib/data/store";

export const openCommitments: Widget = {
  type: "open_commitments",
  title: "Open commitments",
  question: "What did I promise — and what's due?",
  emptyState: "No open commitments. Rare and beautiful.",

  async fetch(_ctx: FetchContext): Promise<BriefItem[]> {
    const items = fetchOpenCommitments();

    return items.map((c): BriefItem => {
      const dueLabel = formatDue(c.dueAt, c.status);
      return {
        id: c.id,
        title: c.title,
        subtitle: `Promised to ${c.promisedTo} · ${sourceLabel(c.source)} · ${dueLabel}`,
        actions: [
          { id: "open", label: "Take action", primary: true },
          { id: "snooze", label: "Defer" },
          { id: "dismiss", label: "Mark done" },
        ],
        confidence: c.status === "overdue" ? 1 : c.status === "due_today" ? 0.95 : 0.8,
        sensitivity: c.sensitivity,
        provenance: [{ sourceType: c.source.kind, sourceId: c.source.sourceId }],
      };
    });
  },

  rank(items, _profile) {
    // Overdue and due_today first, then by id for stability.
    const order: Record<string, number> = { overdue: 0, due_today: 1 };
    return [...items].sort((a, b) => {
      const ra = order[deriveStatusFromConfidence(a)] ?? 2;
      const rb = order[deriveStatusFromConfidence(b)] ?? 2;
      if (ra !== rb) return ra - rb;
      return a.id.localeCompare(b.id);
    });
  },

  async onAction({ item, actionId }) {
    if (actionId === "snooze" || actionId === "dismiss") {
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

function deriveStatusFromConfidence(item: BriefItem): "overdue" | "due_today" | "open" {
  if (item.confidence >= 1) return "overdue";
  if (item.confidence >= 0.95) return "due_today";
  return "open";
}

function sourceLabel(s: { kind: string; on: string }): string {
  const when = new Date(s.on);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - when.setHours(0, 0, 0, 0)) / 86_400_000,
  );
  const ago =
    diffDays === 0 ? "today" : diffDays === 1 ? "yesterday" : `${diffDays}d ago`;
  return `from ${s.kind} ${ago}`;
}

function formatDue(iso: string, status: string): string {
  const due = new Date(iso);
  const now = new Date();
  const diffH = (due.getTime() - now.getTime()) / 3_600_000;

  if (status === "overdue") {
    const days = Math.max(1, Math.round(-diffH / 24));
    return `overdue · ${days}d late`;
  }
  if (status === "due_today" || (diffH > 0 && diffH < 12)) {
    return "due today";
  }
  if (diffH > 0) {
    const days = Math.round(diffH / 24);
    return `due in ${days}d`;
  }
  return "due now";
}

registerWidget(openCommitments);
