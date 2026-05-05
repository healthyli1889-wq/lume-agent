import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { readGoogleEnv, buildAuthUrl } from "@/lib/connectors/google-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const env = readGoogleEnv();
  if (!env) {
    const url = new URL(req.url);
    url.pathname = "/onboarding";
    url.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = buildAuthUrl(env, state);

  const res = NextResponse.redirect(authUrl);
  // CSRF guard: callback must echo the same state. httpOnly + SameSite=Lax.
  res.cookies.set("hermes_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
