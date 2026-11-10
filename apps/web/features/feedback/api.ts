import type { Category } from "../../lib/rating";
import {
  FORM_FIELDS,
  type FeedbackFormValues,
  type FeedbackReceipt,
  type FieldErrors,
  type SubmitOutcome,
} from "./types";

const ENDPOINT = "/api/feedback";
const CATEGORIES: readonly string[] = ["detractor", "passive", "promoter"] satisfies Category[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReceipt(body: unknown): FeedbackReceipt | null {
  if (!isRecord(body)) return null;
  const { id, mean, category } = body;
  if (typeof id !== "number" || typeof mean !== "string" || typeof category !== "string") {
    return null;
  }
  if (!CATEGORIES.includes(category)) return null;
  return { id, mean, category: category as Category };
}

/** DRF returns `{ field: ["message", ...] }` on a 400. */
export function parseFieldErrors(body: unknown): FieldErrors {
  const errors: FieldErrors = {};
  if (!isRecord(body)) return errors;
  for (const field of FORM_FIELDS) {
    const messages = body[field];
    if (Array.isArray(messages) && typeof messages[0] === "string") {
      errors[field] = messages[0];
    }
  }
  return errors;
}

export function toPayload(values: FeedbackFormValues) {
  return {
    q_product: values.q_product,
    q_care: values.q_care,
    q_happy: values.q_happy,
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    customer_type: values.customer_type,
    comment: (values.comment ?? "").trim(),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const data: unknown = await response.json();
    return data;
  } catch {
    return null;
  }
}

export async function submitFeedback(
  values: FeedbackFormValues,
  signal?: AbortSignal,
): Promise<SubmitOutcome> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(toPayload(values)),
      signal,
    });
  } catch {
    return { ok: false, kind: "network" };
  }

  if (response.status === 429) return { ok: false, kind: "throttled" };

  const body = await readJson(response);

  if (response.status === 400) {
    const fieldErrors = parseFieldErrors(body);
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, kind: "validation", fieldErrors };
    }
    return { ok: false, kind: "server" };
  }

  if (response.ok) {
    const receipt = parseReceipt(body);
    if (receipt) return { ok: true, receipt };
  }
  return { ok: false, kind: "server" };
}
