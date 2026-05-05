import {
  registerWidget,
  type Widget,
  type BriefItem,
  type FetchContext,
} from "./contract";
import { fetchMemoryFacts } from "@/lib/data/fixtures";
import { fetchRecentNotionPages } from "@/lib/connectors/notion";
import { fetchRecentDocs } from "@/lib/connectors/google-drive";

export const livingMemory: Widget = {
  type: "living_memory",
  title: "What Hermes has learned",
  question: "Living memory of how your team works.",
  emptyState: "No durable memory yet — Hermes learns as you work.",

  async fetch(_ctx: FetchContext): Promise<BriefItem[]> {
    const items: BriefItem[] = [];

    // 1. Live Notion pages (if connected).
    try {
      const pages = await fetchRecentNotionPages(6);
      if (pages && pages.length > 0) {
        for (const p of pages) {
          items.push({
            id: `nt_${p.id}`,
            title: p.title,
            subtitle: `Notion · last edited ${ago(p.lastEditedAt)}`,
            actions: [{ id: "open", label: "Open", primary: true }],
            confidence: 0.9,
            sensitivity: "internal",
            provenance: [{ sourceType: "notion", sourceId: p.id }],
          });
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[hermes] notion fetch failed:", err);
    }

    // 2. Live Drive docs (if connected).
    try {
      const docs = await fetchRecentDocs(4);
      if (docs && docs.length > 0) {
        for (const d of docs) {
          items.push({
            id: `gd_${d.id}`,
            title: d.name,
            subtitle: `Google Doc · last edited ${ago(d.modifiedAt)}`,
            actions: [{ id: "open", label: "Open", primary: true }],
            confidence: 0.85,
            sensitivity: "internal",
            provenance: [{ sourceType: "gdrive", sourceId: d.id }],
          });
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[hermes] drive fetch failed:", err);
    }

    // 3. Always include some learned facts (fixture-driven; in production
    //    these come from the post-turn extractor / corrections pipeline).
    if (items.length < 6) {
      const facts = fetchMemoryFacts();
      for (const f of facts.slice(0, 6 - items.length)) {
        items.push({
          id: f.id,
          title: f.content,
          subtitle: `${categoryLabel(f.category)} · learned from ${f.source} · ${ago(f.learnedAt)}`,
          actions: [
            { id: "open", label: "Source", primary: true },
            { id: "dismiss", label: "Forget" },
          ],
          confidence: f.confidence,
          sensitivity: "internal",
          provenance: [{ sourceType: "memory", sourceId: f.id }],
        });
      }
    }

    return items;
  },

  rank(items) {
    return [...items].sort((a, b) => b.confidence - a.confidence).slice(0, 6);
  },

  async onAction() {
    return null;
  },
};

function categoryLabel(c: string): string {
  return (
    {
      people: "About people",
      process: "Process",
      preference: "Preference",
      fact: "Fact",
    } as Record<string, string>
  )[c] ?? c;
}

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.round(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

registerWidget(livingMemory);
