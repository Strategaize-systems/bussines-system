/**
 * Context Prefill — computes smart defaults for forms based on available context.
 * Pure utility, no DB access — works with already-loaded data.
 */

import { calculateFollowUpDate } from "./follow-up";

export interface ContextPrefill {
  // Email
  contactEmail?: string;
  contactName?: string;
  suggestedSubject?: string;
  suggestedFollowUpDate?: string;
  // Task
  suggestedTaskTitle?: string;
  // Meeting
  suggestedParticipants?: string;
  suggestedAgenda?: string;
  // Shared
  dealTitle?: string;
  companyName?: string;
}

interface PrefillInput {
  deal?: {
    title: string;
    next_action?: string | null;
    contact_id?: string | null;
    company_id?: string | null;
  };
  contact?: {
    first_name: string;
    last_name: string;
    email?: string | null;
    priority?: string | null;
  } | null;
  company?: {
    name: string;
  } | null;
}

/** @deprecated Use calculateFollowUpDate from lib/follow-up.ts directly */
function getFollowUpDate(priority?: string | null): string {
  return calculateFollowUpDate(priority);
}

export function getContextPrefill(input: PrefillInput): ContextPrefill {
  const result: ContextPrefill = {};

  // Contact info
  if (input.contact) {
    result.contactName = `${input.contact.first_name} ${input.contact.last_name}`;
    if (input.contact.email) {
      result.contactEmail = input.contact.email;
    }
    result.suggestedFollowUpDate = getFollowUpDate(input.contact.priority);
  }

  // Company info
  if (input.company) {
    result.companyName = input.company.name;
  }

  // Deal-based prefills
  if (input.deal) {
    result.dealTitle = input.deal.title;

    // Email subject from next action or deal title
    if (input.deal.next_action) {
      result.suggestedSubject = `${input.deal.next_action} — ${input.deal.title}`;
    } else {
      result.suggestedSubject = `Betr.: ${input.deal.title}`;
    }

    // Task title with deal reference
    result.suggestedTaskTitle = input.deal.next_action
      ? `${input.deal.next_action} (${input.deal.title})`
      : `Follow-up: ${input.deal.title}`;

    // Meeting participants + agenda
    if (input.contact) {
      result.suggestedParticipants = result.contactName;
    }
    result.suggestedAgenda = `Besprechung: ${input.deal.title}`;
    if (input.deal.next_action) {
      result.suggestedAgenda += `\nThema: ${input.deal.next_action}`;
    }
  }

  return result;
}
