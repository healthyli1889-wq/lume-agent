import { NextResponse } from "next/server";
import {
  exchangeCode,
  persistGoogleConnection,
  readGoogleEnv,
} from "@/lib/connectors/google-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Build a redirect to /home or /onboarding with a status flag.
  const back = (status: string, detail?: string) => {
    const ws = new URL(req.url);
    ws.pathname = "/home";
    ws.search = "";
    ws.searchParams.set("connection", status);
    if (detail) ws.searchParams.set("detail", detail);
    return NextResponse.redirect(ws);
  };

  if (oauthError) return back("denied", oauthError);
  if (!code) return back("error", "missing_code");

  // CSRF check.
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("hermes_oauth_state="));
  const expected = cookie?.split("=")[1];
  if (!state || !expected || state !== expected) {
    return back("error", "state_mismatch");
  }

  const env = readGoogleEnv();
  if (!env) return back("error", "google_not_configured");

  try {
    const conn = await exchangeCode(env, code);
    await persistGoogleConnection(conn);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message.slice(0, 160) : "exchange_failed";
    return back("error", encodeURIComponent(msg));
  }

  // Clear the state cookie + redirect to home.
  const res = back("ok");
  res.cookies.set("hermes_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
