/**
 * Cadence Execution Engine (MT-5, SLC-504)
 *
 * Verarbeitet faellige Enrollments:
 * 1. Abort-Check
 * 2. Aktuellen Schritt ausfuehren (email/task/wait)
 * 3. Naechsten Schritt vorbereiten oder abschliessen
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { checkAbort } from "./abort";
import { renderTemplate, type RenderContext } from "./render";
import { sendEmailWithTracking } from "@/lib/email/send";

export type CronResult = {
  processed: number;
  stopped: number;
  completed: number;
  errors: number;
  details: string[];
};

/**
 * Hauptfunktion: Verarbeitet alle faelligen Enrollments.
 * Wird vom Cron-Endpoint aufgerufen.
 */
export async function executeScheduledEnrollments(): Promise<CronResult> {
  const supabase = createAdminClient();
  const result: CronResult = {
    processed: 0,
    stopped: 0,
    completed: 0,
    errors: 0,
    details: [],
  };

  // 1. Aktive Enrollments laden WHERE next_execute_at <= now()
  const { data: enrollments, error } = await supabase
    .from("cadence_enrollments")
    .select(
      "id, cadence_id, deal_id, contact_id, status, current_step_order, started_at"
    )
    .eq("status", "active")
    .lte("next_execute_at", new Date().toISOString())
    .limit(20);

  if (error) {
    result.errors++;
    result.details.push(`Fetch error: ${error.message}`);
    return result;
  }

  if (!enrollments || enrollments.length === 0) {
    return result;
  }

  // 2. Pro Enrollment verarbeiten
  for (const enrollment of enrollments) {
    try {
      await processEnrollment(supabase, enrollment, result);
      result.processed++;
    } catch (err) {
      result.errors++;
      result.details.push(
        `Enrollment ${enrollment.id}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return result;
}

async function processEnrollment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  enrollment: {
    id: string;
    cadence_id: string;
    deal_id: string | null;
    contact_id: string | null;
    status: string;
    current_step_order: number;
    started_at: string;
  },
  result: CronResult
) {
  // 3a. Abort-Check
  const abortResult = await checkAbort({
    id: enrollment.id,
    cadence_id: enrollment.cadence_id,
    deal_id: enrollment.deal_id,
    contact_id: enrollment.contact_id,
    started_at: enrollment.started_at,
  });

  if (abortResult.shouldAbort) {
    await supabase
      .from("cadence_enrollments")
      .update({
        status: "stopped",
        stopped_at: new Date().toISOString(),
        stop_reason: abortResult.reason,
      })
      .eq("id", enrollment.id);

    result.stopped++;
    result.details.push(
      `Enrollment ${enrollment.id} stopped: ${abortResult.reason}`
    );
    return;
  }

  // 3b. Aktuellen Schritt laden
  const { data: currentStep } = await supabase
    .from("cadence_steps")
    .select("*")
    .eq("cadence_id", enrollment.cadence_id)
    .eq("step_order", enrollment.current_step_order)
    .single();

  if (!currentStep) {
    // No step found — complete the enrollment
    await supabase
      .from("cadence_enrollments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);

    result.completed++;
    result.details.push(
      `Enrollment ${enrollment.id} completed (no step at order ${enrollment.current_step_order})`
    );
    return;
  }

  // 3c. Schritt ausfuehren
  const context = await buildRenderContext(supabase, enrollment);

  let executionStatus = "executed";
  let resultDetail: string | null = null;
  let emailId: string | null = null;
  let taskId: string | null = null;

  switch (currentStep.step_type) {
    case "email":
      ({ emailId, resultDetail, executionStatus } = await executeEmailStep(
        supabase,
        currentStep,
        enrollment,
        context
      ));
      break;

    case "task":
      ({ taskId, resultDetail, executionStatus } = await executeTaskStep(
        supabase,
        currentStep,
        enrollment,
        context
      ));
      break;

    case "wait":
      resultDetail = `Wait step (${currentStep.delay_days} days)`;
      break;
  }

  // Log execution
  await supabase.from("cadence_executions").insert({
    enrollment_id: enrollment.id,
    step_id: currentStep.id,
    step_order: currentStep.step_order,
    step_type: currentStep.step_type,
    status: executionStatus,
    result_detail: resultDetail,
    email_id: emailId,
    task_id: taskId,
  });

  // 3d. Naechsten Schritt vorbereiten
  const { data: nextStep } = await supabase
    .from("cadence_steps")
    .select("step_order, delay_days")
    .eq("cadence_id", enrollment.cadence_id)
    .eq("step_order", enrollment.current_step_order + 1)
    .single();

  if (nextStep) {
    const nextExecute = new Date();
    nextExecute.setDate(nextExecute.getDate() + nextStep.delay_days);

    await supabase
      .from("cadence_enrollments")
      .update({
        current_step_order: nextStep.step_order,
        next_execute_at: nextExecute.toISOString(),
      })
      .eq("id", enrollment.id);
  } else {
    // Kein naechster Schritt — Enrollment abschliessen
    await supabase
      .from("cadence_enrollments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);

    result.completed++;
    result.details.push(`Enrollment ${enrollment.id} completed (all steps done)`);
  }
}

// =============================================================
// Step Execution Helpers
// =============================================================

async function executeEmailStep(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  step: {
    email_subject: string | null;
    email_body: string | null;
  },
  enrollment: {
    deal_id: string | null;
    contact_id: string | null;
  },
  context: RenderContext
): Promise<{
  emailId: string | null;
  resultDetail: string;
  executionStatus: string;
}> {
  if (!step.email_subject || !step.email_body) {
    return {
      emailId: null,
      resultDetail: "Skipped: Kein E-Mail-Subject oder Body definiert",
      executionStatus: "skipped",
    };
  }

  // Resolve contact email
  let toAddress: string | null = null;
  let contactId = enrollment.contact_id;
  let companyId: string | null = null;

  if (contactId) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("email, company_id")
      .eq("id", contactId)
      .single();

    toAddress = contact?.email ?? null;
    companyId = contact?.company_id ?? null;
  }

  // Fallback: wenn kein contact_id, versuche ueber deal
  if (!toAddress && enrollment.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("contact_id, contacts(email, company_id)")
      .eq("id", enrollment.deal_id)
      .single();

    if (deal?.contacts) {
      const c = deal.contacts as unknown as {
        email: string | null;
        company_id: string | null;
      };
      toAddress = c.email;
      companyId = c.company_id;
      contactId = deal.contact_id;
    }
  }

  if (!toAddress) {
    return {
      emailId: null,
      resultDetail: "Skipped: Keine E-Mail-Adresse fuer Kontakt",
      executionStatus: "skipped",
    };
  }

  // Render template
  const renderedSubject = renderTemplate(step.email_subject, context);
  const renderedBody = renderTemplate(step.email_body, context);

  // Send via Shared Layer
  const sendResult = await sendEmailWithTracking({
    to: toAddress,
    subject: renderedSubject,
    body: renderedBody,
    contactId,
    companyId,
    dealId: enrollment.deal_id,
    templateUsed: "cadence",
  });

  if (!sendResult.success) {
    return {
      emailId: null,
      resultDetail: `Fehler: ${sendResult.error}`,
      executionStatus: "failed",
    };
  }

  return {
    emailId: sendResult.emailId ?? null,
    resultDetail: sendResult.warning
      ? `Gesendet (${sendResult.warning})`
      : `Gesendet an ${toAddress}`,
    executionStatus: "executed",
  };
}

async function executeTaskStep(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  step: {
    task_title: string | null;
    task_description: string | null;
  },
  enrollment: {
    deal_id: string | null;
    contact_id: string | null;
  },
  context: RenderContext
): Promise<{
  taskId: string | null;
  resultDetail: string;
  executionStatus: string;
}> {
  if (!step.task_title) {
    return {
      taskId: null,
      resultDetail: "Skipped: Kein Task-Titel definiert",
      executionStatus: "skipped",
    };
  }

  const renderedTitle = renderTemplate(step.task_title, context);
  const renderedDescription = step.task_description
    ? renderTemplate(step.task_description, context)
    : null;

  // Resolve company_id from contact
  let companyId: string | null = null;
  if (enrollment.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("company_id")
      .eq("id", enrollment.contact_id)
      .single();
    companyId = contact?.company_id ?? null;
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: renderedTitle,
      description: renderedDescription,
      status: "open",
      type: "follow_up",
      priority: "medium",
      deal_id: enrollment.deal_id || null,
      contact_id: enrollment.contact_id || null,
      company_id: companyId,
    })
    .select("id")
    .single();

  if (error) {
    return {
      taskId: null,
      resultDetail: `Fehler: ${error.message}`,
      executionStatus: "failed",
    };
  }

  return {
    taskId: task.id,
    resultDetail: `Task erstellt: ${renderedTitle}`,
    executionStatus: "executed",
  };
}

// =============================================================
// Context Builder
// =============================================================

async function buildRenderContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  enrollment: {
    deal_id: string | null;
    contact_id: string | null;
  }
): Promise<RenderContext> {
  const context: RenderContext = {};

  // Load contact
  if (enrollment.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("first_name, last_name, email, position, company_id, companies(name)")
      .eq("id", enrollment.contact_id)
      .single();

    if (contact) {
      context.kontakt = {
        vorname: contact.first_name,
        nachname: contact.last_name,
        email: contact.email,
        position: contact.position,
      };

      const company = contact.companies as unknown as { name: string } | null;
      if (company) {
        context.firma = { name: company.name };
      }
    }
  }

  // Load deal
  if (enrollment.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("title, value, pipeline_stages(name)")
      .eq("id", enrollment.deal_id)
      .single();

    if (deal) {
      const stage = deal.pipeline_stages as unknown as { name: string } | null;
      context.deal = {
        name: deal.title,
        wert: deal.value ? String(deal.value) : null,
        phase: stage?.name ?? null,
      };
    }

    // If no contact from enrollment but deal has one, load it
    if (!context.kontakt) {
      const { data: dealWithContact } = await supabase
        .from("deals")
        .select("contacts(first_name, last_name, email, position, company_id, companies(name))")
        .eq("id", enrollment.deal_id)
        .single();

      if (dealWithContact?.contacts) {
        const c = dealWithContact.contacts as unknown as {
          first_name: string;
          last_name: string;
          email: string | null;
          position: string | null;
          company_id: string | null;
          companies: { name: string } | null;
        };
        context.kontakt = {
          vorname: c.first_name,
          nachname: c.last_name,
          email: c.email,
          position: c.position,
        };
        if (c.companies && !context.firma) {
          context.firma = { name: c.companies.name };
        }
      }
    }
  }

  return context;
}
