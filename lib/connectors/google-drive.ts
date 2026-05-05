import { google } from "googleapis";
import { getAuthedGoogleClient } from "./google-auth";

export type LiveDoc = {
  id: string;
  name: string;
  modifiedAt: string;
  url: string;
  ownerEmail?: string;
  snippet: string;
};

// Returns recently modified Google Docs (used as semantic memory source).
export async function fetchRecentDocs(limit = 8): Promise<LiveDoc[] | null> {
  const auth = await getAuthedGoogleClient();
  if (!auth) return null;
  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.document' and trashed=false",
    orderBy: "modifiedTime desc",
    pageSize: limit,
    fields: "files(id, name, modifiedTime, webViewLink, owners(emailAddress))",
  });

  return (res.data.files ?? []).map((f): LiveDoc => ({
    id: f.id ?? "",
    name: f.name ?? "(untitled)",
    modifiedAt: f.modifiedTime ?? new Date().toISOString(),
    url: f.webViewLink ?? "",
    ownerEmail: f.owners?.[0]?.emailAddress ?? undefined,
    snippet: "",
  }));
}
