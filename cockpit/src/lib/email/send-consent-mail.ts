import nodemailer from "nodemailer";
import {
  consentRequestHtml,
  consentRequestSubject,
  consentRequestText,
} from "./templates/consent-request-de";

type SendConsentMailInput = {
  toEmail: string;
  firstName: string;
  lastName: string;
  token: string;
};

type Result = { ok: true } | { ok: false; error: string };

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

export async function sendConsentRequestMail(
  input: SendConsentMailInput
): Promise<Result> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromAddress = process.env.SMTP_FROM_EMAIL || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass || !fromAddress) {
    return { ok: false, error: "SMTP nicht konfiguriert" };
  }

  const consentUrl = `${baseUrl()}/consent/${encodeURIComponent(input.token)}`;
  const revokeUrl = `${baseUrl()}/consent/${encodeURIComponent(input.token)}/revoke`;

  const templateInput = {
    firstName: input.firstName,
    lastName: input.lastName,
    consentUrl,
    revokeUrl,
  };

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: input.toEmail,
      subject: consentRequestSubject(),
      text: consentRequestText(templateInput),
      html: consentRequestHtml(templateInput),
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter SMTP-Fehler",
    };
  }
}
