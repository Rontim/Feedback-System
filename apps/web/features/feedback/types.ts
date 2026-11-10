import type { Category } from "../../lib/rating";

export type CustomerType = "homeowner" | "painter";
export type RatingKey = "q_product" | "q_care" | "q_happy";

export interface FeedbackFormValues {
  q_product: number;
  q_care: number;
  q_happy: number;
  name: string;
  email: string;
  phone: string;
  customer_type: CustomerType;
  comment?: string;
}

export const FORM_FIELDS = [
  "q_product",
  "q_care",
  "q_happy",
  "name",
  "email",
  "phone",
  "customer_type",
  "comment",
] as const satisfies readonly (keyof FeedbackFormValues)[];

export type FormFieldName = (typeof FORM_FIELDS)[number];
export type FieldErrors = Partial<Record<FormFieldName, string>>;

export interface FeedbackReceipt {
  id: number;
  mean: string;
  category: Category;
}

export type SubmitOutcome =
  | { ok: true; receipt: FeedbackReceipt }
  | { ok: false; kind: "validation"; fieldErrors: FieldErrors }
  | { ok: false; kind: "throttled" | "server" | "network" };
