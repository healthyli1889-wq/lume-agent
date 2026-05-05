import { google, Auth } from "googleapis";
import { patchWorkspace, loadWorkspace, type GoogleConnection } from "@/lib/data/store";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/drive.readonly",
];

export type GoogleEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function readGoogleEnv(): GoogleEnv | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/oauth/google/callback";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export function makeOAuthClient(env: GoogleEnv): Auth.OAuth2Client {
  return new google.auth.OAuth2(env.clientId, env.clientSecret, env.redirectUri);
}

export function buildAuthUrl(env: GoogleEnv, state: string): string {
  const client = makeOAuthClient(env);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",                 // force refresh_token return on first connect
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(
  env: GoogleEnv,
  code: string,
): Promise<GoogleConnection> {
  const client = makeOAuthClient(env);
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error("Google did not return an access token.");
  if (!tokens.refresh_token) {
    // Most common cause: the user previously authorized this app; revoke it
    // at https://myaccount.google.com/permissions and retry.
    throw new Error(
      "No refresh_token from Google. Revoke prior consent at myaccount.google.com/permissions and reconnect.",
    );
  }
  const expiresAt = tokens.expiry_date ?? Date.now() + 3500 * 1000;

  // Ask Google who this is, for nice display.
  client.setCredentials(tokens);
  const userinfo = await google
    .oauth2({ version: "v2", auth: client })
    .userinfo.get();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
    email: userinfo.data.email ?? undefined,
    connectedAt: new Date().toISOString(),
  };
}

export async function persistGoogleConnection(conn: GoogleConnection): Promise<void> {
  const { getOrInitWorkspace } = await import("@/lib/data/store");
  await getOrInitWorkspace();
  await patchWorkspace((ws) => ({
    ...ws,
    connections: { ...ws.connections, google: conn },
  }));
}

// Returns an authenticated OAuth2 client; transparently refreshes the
// access token when ≤60s from expiry and persists the new value.
export async function getAuthedGoogleClient(): Promise<Auth.OAuth2Client | null> {
  const env = readGoogleEnv();
  if (!env) return null;
  const ws = await loadWorkspace();
  const conn = ws?.connections.google;
  if (!conn) return null;

  const client = makeOAuthClient(env);
  client.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken,
    expiry_date: conn.expiresAt,
  });

  const skewMs = 60_000;
  if (conn.expiresAt - Date.now() < skewMs) {
    try {
      const { credentials } = await client.refreshAccessToken();
      const newAccess = credentials.access_token ?? conn.accessToken;
      const newExpiry = credentials.expiry_date ?? Date.now() + 3500 * 1000;
      client.setCredentials({
        access_token: newAccess,
        refresh_token: conn.refreshToken,
        expiry_date: newExpiry,
      });
      await patchWorkspace((w) => ({
        ...w,
        connections: {
          ...w.connections,
          google: { ...conn, accessToken: newAccess, expiresAt: newExpiry },
        },
      }));
    } catch (err) {
      // Refresh failed (revoked, expired). Drop the connection so the UI re-prompts.
      // eslint-disable-next-line no-console
      console.error("[hermes] google token refresh failed:", err);
      await patchWorkspace((w) => ({
        ...w,
        connections: { ...w.connections, google: null },
      }));
      return null;
    }
  }
  return client;
}
