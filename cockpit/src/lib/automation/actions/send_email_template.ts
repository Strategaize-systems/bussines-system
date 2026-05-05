// V6.2 SLC-622 MT-1 — Action-Handler: send_email_template
//
// Laedt ein V5.3 email_templates-Row, rendert mit Template-Variablen,
// und sendet per V5.3 sendEmailWithTracking. Modus 'draft' speichert ohne
// SMTP-Versand (default V1, sicherer); 'direct' fordert konfigurierten SMTP.
//
// V1: nur fuer Deal-Trigger (entity.contactId muss existieren). Bei
// Activity-Trigger ohne contact_id wird Action mit failed beendet.

import type {
  ActionResult,
  SendEmailTemplateParams,
} from "@/types/automation";
import { renderTemplate } from "../template-renderer";
import { sendEmailWithTracking } from "@/lib/email/send";
import type { ActionExecutionContext } from "./types";

interface EmailTemplateRow {
  id: string;
  title: string;
  subject_de: string | null;
  body_de: string | null;
}

export async function executeSendEmailTemplate(
  context: ActionExecutionContext,
  params: SendEmailTemplateParams
): Promise<ActionResult> {
  const { supabase, entity, actionIndex, rule } = context;

  try {
    // 1. Validation: V1 nur fuer Trigger mit contactId
    if (!entity.contactId) {
      return {
        action_index: actionIndex,
        type: "send_email_template",
        outcome: "failed",
        error_message: "no-contact-id-on-entity",
      };
    }

    if (!params.template_id) {
      return {
        action_index: actionIndex,
        type: "send_email_template",
        outcome: "failed",
        error_message: "template_id-fehlt",
      };
    }

    // 2. Template laden
    const { data: tmpl, error: tmplErr } = await supabase
      .from("email_templates")
      .select("id, title, subject_de, body_de")
      .eq("id", params.template_id)
      .maybeSingle();

    if (tmplErr || !tmpl) {
      return {
        action_index: actionIndex,
        type: "send_email_template",
        outcome: "failed",
        error_message: `template-not-found: ${params.template_id}`,
      };
    }
    const template = tmpl as EmailTemplateRow;

    // 3. Recipient laden (contact.email)
    const { data: contact } = await supabase
      .from("contacts")
      .select("first_name, last_name, email")
      .eq("id", entity.contactId)
      .maybeSingle();

    if (!contact || !contact.email) {
      return {
        action_index: actionIndex,
        type: "send_email_template",
        outcome: "failed",
        error_message: "contact-email-fehlt",
      };
    }

    const scope = {
      deal: entity.type === "deal" ? entity.data : {},
      activity: entity.type === "activity" ? entity.data : {},
      contact: {
        first_name: contact.first_name,
        last_name: contact.last_name,
        name: `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim(),
      },
      rule: { name: rule.name },
    };

    const subject = renderTemplate(template.subject_de ?? template.title, scope);
    const body = renderTemplate(template.body_de ?? "", scope);

    if (!subject.trim() || !body.trim()) {
      return {
        action_index: actionIndex,
        type: "send_email_template",
        outcome: "failed",
        error_message: "subject-oder-body-leer",
      };
    }

    // 4. sendEmailWithTracking — bei 'draft' wird durch SMTP-Mangel
    // automatisch als Draft gespeichert (sendEmailWithTracking checkt SMTP-
    // Config). Bei 'direct' wird real versendet, sofern SMTP konfiguriert.
    // V1: wir empfehlen draft-Mode (params.mode='draft'); 'direct' ist ein
    // bewusster Opt-in.
    if (params.mode === "draft") {
      // Draft-Insert direkt in emails-Tabelle (umgeht SMTP-Send)
      const { data: inserted, error: insErr } = await supabase
        .from("emails")
        .insert({
          contact_id: entity.contactId,
          company_id: entity.companyId,
          deal_id: entity.dealId,
          direction: "outbound",
          to_address: contact.email,
          subject: subject.slice(0, 500),
          body,
          status: "draft",
          template_used: template.id,
          tracking_enabled: false,
        })
        .select("id")
        .single();

      if (insErr) {
        return {
          action_index: actionIndex,
          type: "send_email_template",
          outcome: "failed",
          error_message: `draft-insert: ${insErr.message}`.slice(0, 500),
        };
      }

      return {
        action_index: actionIndex,
        type: "send_email_template",
        outcome: "success",
        audit_log_id: inserted?.id,
      };
    }

    // mode === 'direct'
    const result = await sendEmailWithTracking({
      to: contact.email,
      subject,
      body,
      contactId: entity.contactId,
      companyId: entity.companyId,
      dealId: entity.dealId,
      templateUsed: template.id,
      trackingEnabled: true,
    });

    if (!result.success) {
      return {
        action_index: actionIndex,
        type: "send_email_template",
        outcome: "failed",
        error_message: `send: ${result.error ?? "unknown"}`.slice(0, 500),
      };
    }

    return {
      action_index: actionIndex,
      type: "send_email_template",
      outcome: "success",
      audit_log_id: result.emailId,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return {
      action_index: actionIndex,
      type: "send_email_template",
      outcome: "failed",
      error_message: `unexpected: ${msg}`.slice(0, 500),
    };
  }
}
