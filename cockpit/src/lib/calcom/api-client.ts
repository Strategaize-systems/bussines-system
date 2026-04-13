/**
 * Cal.com REST API Client (v1)
 * Self-hosted Cal.com on Hetzner — internal Docker network access.
 * SLC-407 / FEAT-406
 */

// ── Types ───────────────────────────────────────────────────────────

export type CalcomBooking = {
  id: number;
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "ACCEPTED" | "PENDING" | "CANCELLED" | "REJECTED";
  location: string | null;
  description: string | null;
  attendees: { email: string; name: string; timeZone: string }[];
  eventTypeId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CalcomEventType = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  length: number;
  hidden: boolean;
  requiresConfirmation: boolean;
};

export type CalcomAvailability = {
  busy: { start: string; end: string }[];
  timeZone: string;
  dateRanges: { start: string; end: string }[];
};

// ── Config ──────────────────────────────────────────────────────────

function getBaseUrl(): string {
  // Server-side: use internal Docker URL; fallback to public URL
  return process.env.CALCOM_INTERNAL_URL || process.env.CALCOM_PUBLIC_URL || "http://calcom:3000";
}

function getApiKey(): string {
  const key = process.env.CALCOM_API_KEY;
  if (!key) throw new Error("CALCOM_API_KEY not configured");
  return key;
}

// ── HTTP Helper ─────────────────────────────────────────────────────

async function calcomFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getBaseUrl()}/api/v1${path}${path.includes("?") ? "&" : "?"}apiKey=${getApiKey()}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cal.com API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── Bookings ────────────────────────────────────────────────────────

export async function getBookings(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<CalcomBooking[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);

  const qs = params.toString();
  const path = `/bookings${qs ? `?${qs}` : ""}`;
  const data = await calcomFetch<{ bookings: CalcomBooking[] }>(path);
  return data.bookings;
}

export async function getBooking(bookingId: number): Promise<CalcomBooking> {
  const data = await calcomFetch<{ booking: CalcomBooking }>(
    `/bookings/${bookingId}`
  );
  return data.booking;
}

export async function cancelBooking(
  bookingId: number,
  reason?: string
): Promise<void> {
  await calcomFetch(`/bookings/${bookingId}/cancel`, {
    method: "DELETE",
    body: JSON.stringify({ reason }),
  });
}

// ── Event Types ─────────────────────────────────────────────────────

export async function getEventTypes(): Promise<CalcomEventType[]> {
  const data = await calcomFetch<{ event_types: CalcomEventType[] }>(
    "/event-types"
  );
  return data.event_types;
}

export async function getEventType(
  eventTypeId: number
): Promise<CalcomEventType> {
  const data = await calcomFetch<{ event_type: CalcomEventType }>(
    `/event-types/${eventTypeId}`
  );
  return data.event_type;
}

// ── Availability ────────────────────────────────────────────────────

export async function getAvailability(params: {
  eventTypeId: number;
  dateFrom: string;
  dateTo: string;
}): Promise<CalcomAvailability> {
  const qs = new URLSearchParams({
    eventTypeId: String(params.eventTypeId),
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  }).toString();

  return calcomFetch<CalcomAvailability>(`/availability?${qs}`);
}

// ── Booking Link Builder ────────────────────────────────────────────

/**
 * Build a Cal.com booking link with prefilled guest data.
 * Uses the public URL (browser-facing, not internal Docker URL).
 */
export function buildBookingLink(params: {
  username: string;
  eventSlug: string;
  guestEmail?: string;
  guestName?: string;
}): string {
  const publicUrl =
    process.env.CALCOM_PUBLIC_URL || "https://cal.strategaizetransition.com";

  const url = new URL(`/${params.username}/${params.eventSlug}`, publicUrl);

  if (params.guestEmail) url.searchParams.set("email", params.guestEmail);
  if (params.guestName) url.searchParams.set("name", params.guestName);

  return url.toString();
}
