import { Client } from "@notionhq/client";
import { loadWorkspace, patchWorkspace } from "@/lib/data/store";

export type NotionPageRef = {
  id: string;
  title: string;
  url: string;
  lastEditedAt: string;
  excerpt: string;
};

function readEnvToken(): string | null {
  return process.env.NOTION_INTEGRATION_TOKEN ?? null;
}

// Returns a Notion client preferring the persisted token (if the user
// connected via UI) and falling back to the env token (developer setup).
async function getClient(): Promise<Client | null> {
  const ws = await loadWorkspace();
  const token = ws?.connections.notion?.token ?? readEnvToken();
  if (!token) return null;
  return new Client({ auth: token });
}

// One-time persist when the user supplies a token through settings/onboarding.
export async function connectNotion(token: string): Promise<void> {
  const client = new Client({ auth: token });
  // Probe — `users.me` requires a valid token.
  const me = await client.users.me({});
  await patchWorkspace((w) => ({
    ...w,
    connections: {
      ...w.connections,
      notion: {
        token,
        workspaceName: (me as { name?: string }).name,
        connectedAt: new Date().toISOString(),
      },
    },
  }));
}

// Returns pages this integration can see, ordered by recency.
export async function fetchRecentNotionPages(
  limit = 12,
): Promise<NotionPageRef[] | null> {
  const client = await getClient();
  if (!client) return null;

  const res = await client.search({
    sort: { direction: "descending", timestamp: "last_edited_time" },
    page_size: limit,
    filter: { property: "object", value: "page" },
  });

  return res.results.map((p): NotionPageRef => {
    const page = p as {
      id: string;
      url?: string;
      last_edited_time?: string;
      properties?: Record<string, unknown>;
    };
    const title = extractTitle(page.properties);
    return {
      id: page.id,
      title: title || "(untitled)",
      url: page.url ?? "",
      lastEditedAt: page.last_edited_time ?? new Date().toISOString(),
      excerpt: "",
    };
  });
}

function extractTitle(properties: Record<string, unknown> | undefined): string {
  if (!properties) return "";
  for (const v of Object.values(properties)) {
    const prop = v as { type?: string; title?: Array<{ plain_text?: string }> };
    if (prop?.type === "title" && Array.isArray(prop.title)) {
      return prop.title.map((t) => t.plain_text ?? "").join("");
    }
  }
  return "";
}
