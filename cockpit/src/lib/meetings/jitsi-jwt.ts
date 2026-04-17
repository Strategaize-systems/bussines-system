// =============================================================
// Jitsi JWT Builder — HS256 tokens for Jitsi Meet authentication
// =============================================================
//
// Two JWT variants:
//   - Moderator: Host-User, moderator=true, recording=true
//   - Participant: External contact, moderator=false, recording=false
//
// Claims follow Jitsi JWT spec: aud, iss, sub, room, context.user, context.features

import jwt from "jsonwebtoken";

const DEFAULT_APP_ID = "business";
const DEFAULT_XMPP_DOMAIN = "meet.jitsi";
const DEFAULT_EXPIRY_HOURS = 6; // Late-join tolerance

interface JwtUser {
  id: string;
  name: string;
  email?: string;
}

/**
 * Build a Moderator JWT for the host user.
 * moderator=true, recording=true, exp=now+6h
 */
export function buildModeratorJwt(
  user: JwtUser,
  room: string,
): string {
  const secret = process.env.JITSI_JWT_APP_SECRET;
  if (!secret) {
    throw new Error("JITSI_JWT_APP_SECRET nicht konfiguriert");
  }

  const appId = process.env.JITSI_JWT_APP_ID || DEFAULT_APP_ID;
  const xmppDomain = process.env.JITSI_XMPP_DOMAIN || DEFAULT_XMPP_DOMAIN;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: appId,
    iss: appId,
    sub: xmppDomain,
    room,
    iat: now,
    nbf: now - 10,
    context: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        moderator: true,
      },
      features: {
        recording: true,
        livestreaming: false,
      },
    },
  };

  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: `${DEFAULT_EXPIRY_HOURS}h`,
  });
}

/**
 * Build a Participant JWT for an external contact.
 * moderator=false, recording=false, exp based on meeting time + tolerance
 */
export function buildParticipantJwt(
  contact: JwtUser,
  room: string,
  meetingExpiresAt?: Date,
): string {
  const secret = process.env.JITSI_JWT_APP_SECRET;
  if (!secret) {
    throw new Error("JITSI_JWT_APP_SECRET nicht konfiguriert");
  }

  const appId = process.env.JITSI_JWT_APP_ID || DEFAULT_APP_ID;
  const xmppDomain = process.env.JITSI_XMPP_DOMAIN || DEFAULT_XMPP_DOMAIN;

  const now = Math.floor(Date.now() / 1000);

  // Calculate expiry: scheduled_at + 6h or default 6h from now
  let exp: number;
  if (meetingExpiresAt) {
    exp = Math.floor(meetingExpiresAt.getTime() / 1000) + DEFAULT_EXPIRY_HOURS * 3600;
  } else {
    exp = now + DEFAULT_EXPIRY_HOURS * 3600;
  }

  const payload = {
    aud: appId,
    iss: appId,
    sub: xmppDomain,
    room,
    iat: now,
    nbf: now - 10,
    exp,
    context: {
      user: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        moderator: false,
      },
      features: {
        recording: false,
        livestreaming: false,
      },
    },
  };

  return jwt.sign(payload, secret, { algorithm: "HS256" });
}

/**
 * Generate a Jitsi room name from deal ID and timestamp.
 * Format: deal-{dealId}-{timestamp}
 */
export function generateRoomName(dealId: string): string {
  const ts = Date.now();
  return `deal-${dealId}-${ts}`;
}

/**
 * Build the full Jitsi meeting URL with JWT token.
 */
export function buildMeetingUrl(room: string, token: string): string {
  const domain = process.env.JITSI_PUBLIC_DOMAIN || "meet.strategaizetransition.com";
  return `https://${domain}/${room}?jwt=${token}`;
}
