/**
 * Shared Email-Send-Layer (DEC-069)
 *
 * Zentraler E-Mail-Versand fuer manuellen Versand und Cadence-Execution.
 * Handelt SMTP-Versand, Tracking-Injection, und DB-Logging.
 */

import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { injectTracking } from "./tracking";
import { renderBrandedHtml, type RenderVars } from "./render";
import { getBrandingForSend } from "@/app/(app)/settings/branding/actions";

export type SendEmailAttachment = {
  storagePath: string;
  filename: string;
  mimeType: string;
};

export type SendEmailParams = {
  to: string;
  subject: string;
  body: string;
  /** Optional: pre-built HTML (wenn nicht gesetzt, wird body als Text zu HTML konvertiert) */
  html?: string;
  /** Context-Referenzen fuer DB-Logging */
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  /** Follow-up */
  followUpDate?: string | null;
  /** Template-Referenz (fuer Cadence-E-Mails) */
  templateUsed?: string | null;
  /** Tracking opt-out (default: true = tracking enabled) */
  trackingEnabled?: boolean;
  /**
   * Variablen fuer Branding-Renderer ({{vorname}} etc.).
   * Variablen werden im Composing-Studio (SLC-534) bereits aufgeloest
   * BEVOR send.ts aufgerufen wird — `vars` ist hier in V5.3 ueblicherweise leer
   * und dient als Reserve-Pfad.
   */
  vars?: RenderVars;
  /**
   * Optional: E-Mail-Anhaenge (SLC-542 MT-7).
   * Default undefined → keine Multipart-Aenderung, V5.3-bit-identisches Verhalten.
   * Files werden via service_role aus Bucket "email-attachments" geladen
   * und an Nodemailer als Buffer-Attachments uebergeben.
   */
  attachments?: SendEmailAttachment[];
};

export type SendEmailResult = {
  success: boolean;
  emailId?: string;
  trackingId?: string;
  error?: string;
  warning?: string;
};

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || "587"),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
  };
}

/**
 * Sendet eine E-Mail via SMTP, injiziert Tracking, loggt in die DB.
 *
 * Verwendung:
 * - Manueller Versand (emails/actions.ts)
 * - Cadence-Execution (cadence/engine.ts)
 */
export async function sendEmailWithTracking(params: SendEmailParams): Promise<SendEmailResult> {
  const smtp = getSmtpConfig();
  const supabase = createAdminClient();
  const trackingEnabled = params.trackingEnabled !== false;

  // Generate tracking ID
  const trackingId = trackingEnabled ? crypto.randomUUID() : undefined;

  // Build HTML content via Branding-Renderer (DEC-095, FEAT-531).
  // Bei leerem Branding faellt renderBrandedHtml auf textToHtml zurueck —
  // Bit-fuer-Bit identisch zum V5.2-Output (AC9).
  // params.html ueberschreibt den Renderer (heute nirgendwo gesetzt, Backwards Compat).
  let htmlContent: string;
  if (params.html) {
    htmlContent = params.html;
  } else {
    const branding = await getBrandingForSend();
    htmlContent = renderBrandedHtml(params.body, branding, params.vars ?? {});
  }

  // Inject tracking if enabled
  if (trackingEnabled && trackingId) {
    htmlContent = injectTracking(htmlContent, trackingId);
  }

  // Check SMTP config — save as draft if not configured
  if (!smtp.host || !smtp.user || !smtp.pass) {
    const { data, error } = await supabase.from("emails").insert({
      contact_id: params.contactId || null,
      company_id: params.companyId || null,
      deal_id: params.dealId || null,
      direction: "outbound",
      from_address: smtp.from || null,
      to_address: params.to,
      subject: params.subject,
      body: params.body,
      status: "draft",
      follow_up_status: params.followUpDate ? "pending" : "none",
      follow_up_date: params.followUpDate || null,
      template_used: params.templateUsed || null,
      tracking_id: trackingId || null,
      tracking_enabled: trackingEnabled,
    }).select("id").single();

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      emailId: data.id,
      trackingId,
      warning: "SMTP nicht konfiguriert — als Entwurf gespeichert.",
    };
  }

  // Anhaenge aus Storage laden (SLC-542 MT-7).
  // Default leer = bit-identisches V5.3-Verhalten ohne Multipart-Veraenderung.
  let mailAttachments:
    | { filename: string; content: Buffer; contentType: string }[]
    | undefined;
  if (params.attachments && params.attachments.length > 0) {
    try {
      mailAttachments = await Promise.all(
        params.attachments.map(async (att) => {
          const { data, error } = await supabase.storage
            .from("email-attachments")
            .download(att.storagePath);
          if (error || !data) {
            throw new Error(
              `Storage-Download fehlgeschlagen fuer ${att.filename}: ${error?.message ?? "kein Daten-Blob"}`,
            );
          }
          const arrayBuffer = await data.arrayBuffer();
          return {
            filename: att.filename,
            content: Buffer.from(arrayBuffer),
            contentType: att.mimeType,
          };
        }),
      );
    } catch (err) {
      return {
        success: false,
        error: `Anhang-Vorbereitung fehlgeschlagen: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`,
      };
    }
  }

  // Send via SMTP
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.sendMail({
      from: smtp.from,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: htmlContent,
      ...(mailAttachments ? { attachments: mailAttachments } : {}),
    });
  } catch (err) {
    return {
      success: false,
      error: `SMTP-Fehler: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`,
    };
  }

  // Log sent email in DB
  const { data, error } = await supabase.from("emails").insert({
    contact_id: params.contactId || null,
    company_id: params.companyId || null,
    deal_id: params.dealId || null,
    direction: "outbound",
    from_address: smtp.from,
    to_address: params.to,
    subject: params.subject,
    body: params.body,
    status: "sent",
    follow_up_status: params.followUpDate ? "pending" : "none",
    follow_up_date: params.followUpDate || null,
    template_used: params.templateUsed || null,
    sent_at: new Date().toISOString(),
    tracking_id: trackingId || null,
    tracking_enabled: trackingEnabled,
  }).select("id").single();

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    emailId: data.id,
    trackingId,
  };
}
