import type { RatingKey } from "./types";

export interface RatingQuestion {
  key: RatingKey;
  stepTitle: string;
  prompt: string;
}

/** Questions for rating the product, care, and overall happiness. */
export const RATING_QUESTIONS: readonly RatingQuestion[] = [
  { key: "q_product", stepTitle: "Product", prompt: "Rate your experience with our product." },
  { key: "q_care", stepTitle: "Care", prompt: "Rate our customer care." },
  { key: "q_happy", stepTitle: "Happiness", prompt: "Are you happy with the product?" },
];

export const CONTACT_STEP_TITLE = "Details";

/** Index 0 is rating 1. */
export const RATING_LABELS = ["Not great", "Could be better", "Okay", "Good", "Loved it"] as const;