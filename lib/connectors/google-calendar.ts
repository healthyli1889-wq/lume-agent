import { google } from "googleapis";
import { getAuthedGoogleClient } from "./google-auth";

export type LiveMeeting = {
  id: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  subject: string;
  description: string;
  attendeeEmails: string[];
  hangoutLink?: string;
  location?: string;
};

// Returns events for the user's primary calendar today (00:00 → 23:59 local).
// Returns null when not connected (caller falls back to fixtures).
export async function fetchLiveMeetingsForToday(): Promise<LiveMeeting[] | null> {
  const auth = await getAuthedGoogleClient();
  if (!auth) return null;
  const calendar = google.calendar({ version: "v3", auth });

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 25,
  });

  return (res.data.items ?? [])
    .filter((e) => e.start?.dateTime)              // skip all-day events
    .map((e): LiveMeeting => {
      const startsAt = e.start!.dateTime!;
      const endsAt = e.end?.dateTime ?? startsAt;
      const durationMin = Math.round(
        (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000,
      );
      return {
        id: e.id ?? `g_${startsAt}`,
        startsAt,
        endsAt,
        durationMin: Number.isFinite(durationMin) ? durationMin : 30,
        subject: e.summary ?? "(no subject)",
        description: e.description ?? "",
        attendeeEmails:
          e.attendees?.map((a) => a.email ?? "").filter(Boolean) ?? [],
        hangoutLink: e.hangoutLink ?? undefined,
        location: e.location ?? undefined,
      };
    });
}
