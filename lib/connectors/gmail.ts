import { google, gmail_v1 } from "googleapis";
import { getAuthedGoogleClient } from "./google-auth";

export type LiveEmail = {
  id: string;
  threadId: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  receivedAt: string;
  snippet: string;
  body: string;
  // Heuristic that maps roughly to "this looks like it needs my reply":
  needsResponse: boolean;
};

// Returns recent inbox threads that look like they need a reply.
// Heuristic: in INBOX, unread, not from "no-reply"-ish addresses, last 14 days.
export async function fetchLiveEmailsNeedingReply(
  limit = 6,
): Promise<LiveEmail[] | null> {
  const auth = await getAuthedGoogleClient();
  if (!auth) return null;
  const gmail = google.gmail({ version: "v1", auth });

  const list = await gmail.users.messages.list({
    userId: "me",
    q: "in:inbox is:unread newer_than:14d -from:(no-reply OR noreply OR notifications)",
    maxResults: limit,
  });

  const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);
  if (ids.length === 0) return [];

  const messages = await Promise.all(
    ids.map((id) =>
      gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      }),
    ),
  );

  return messages
    .map((r) => parseMessage(r.data))
    .filter((m): m is LiveEmail => Boolean(m));
}

function parseMessage(m: gmail_v1.Schema$Message): LiveEmail | null {
  const headers = m.payload?.headers ?? [];
  const get = (n: string) =>
    headers.find((h) => (h.name ?? "").toLowerCase() === n.toLowerCase())
      ?.value ?? "";

  const subject = get("Subject") || "(no subject)";
  const fromRaw = get("From");
  const date = get("Date");
  const { name, email } = parseFrom(fromRaw);

  const body = decodeBody(m.payload).slice(0, 4000);

  return {
    id: m.id ?? "",
    threadId: m.threadId ?? m.id ?? "",
    subject,
    fromEmail: email,
    fromName: name,
    receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
    snippet: m.snippet ?? "",
    body,
    needsResponse: true,
  };
}

function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) return { name: (m[1] ?? "").replace(/^"|"$/g, "").trim(), email: m[2] ?? "" };
  return { name: "", email: raw.trim() };
}

function decodeBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";
  // Walk parts depth-first; prefer text/plain over text/html.
  const stack: gmail_v1.Schema$MessagePart[] = [payload];
  let plain = "";
  let html = "";
  while (stack.length) {
    const node = stack.pop()!;
    const mime = node.mimeType ?? "";
    const data = node.body?.data;
    if (data) {
      const text = Buffer.from(data, "base64url").toString("utf8");
      if (mime === "text/plain") plain += text;
      else if (mime === "text/html") html += text;
    }
    for (const child of node.parts ?? []) stack.push(child);
  }
  if (plain) return plain;
  if (html) return stripHtml(html);
  return "";
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
