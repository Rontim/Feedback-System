import type { RatingKey } from "./types";

export interface SwatchOption {
  rating: number;
  label: string;
  colorLight: string;
  colorDark: string;
  subtitle: string;
}

export interface RatingQuestion {
  key: RatingKey;
  stepTitle: string;
  prompt: string;
  subtitle?: string;
  tiers?: readonly SwatchOption[];
}

/** Product finish rating tiers (Q1) */
export const PRODUCT_SWATCH_TIERS: readonly SwatchOption[] = [
  {
    rating: 1,
    label: "Not great",
    colorLight: "#C85A32",
    colorDark: "#DE6B48",
    subtitle: "Poor coverage or finish",
  },
  {
    rating: 2,
    label: "Needs work",
    colorLight: "#D9822B",
    colorDark: "#E5953F",
    subtitle: "Didn't quite meet expectations",
  },
  {
    rating: 3,
    label: "Okay",
    colorLight: "#828776",
    colorDark: "#9FA393",
    subtitle: "Decent, standard result",
  },
  {
    rating: 4,
    label: "Really good",
    colorLight: "#3F6754",
    colorDark: "#56856E",
    subtitle: "Smooth finish and great color",
  },
  {
    rating: 5,
    label: "Loved it",
    colorLight: "#1A535C",
    colorDark: "#337A85",
    subtitle: "Flawless coverage and beautiful finish",
  },
];

/** Customer care rating tiers (Q2) */
export const CARE_SWATCH_TIERS: readonly SwatchOption[] = [
  {
    rating: 1,
    label: "Not great",
    colorLight: "#C85A32",
    colorDark: "#DE6B48",
    subtitle: "Slow or unhelpful support",
  },
  {
    rating: 2,
    label: "Needs work",
    colorLight: "#D9822B",
    colorDark: "#E5953F",
    subtitle: "Took effort to get answers",
  },
  {
    rating: 3,
    label: "Okay",
    colorLight: "#828776",
    colorDark: "#9FA393",
    subtitle: "Helpful and answered questions",
  },
  {
    rating: 4,
    label: "Really good",
    colorLight: "#3F6754",
    colorDark: "#56856E",
    subtitle: "Quick, friendly, and knowledgeable",
  },
  {
    rating: 5,
    label: "Loved it",
    colorLight: "#1A535C",
    colorDark: "#337A85",
    subtitle: "Exceptional care from start to finish",
  },
];

/** Happiness & room transformation rating tiers (Q3) */
export const HAPPINESS_SWATCH_TIERS: readonly SwatchOption[] = [
  {
    rating: 1,
    label: "Not great",
    colorLight: "#C85A32",
    colorDark: "#DE6B48",
    subtitle: "Not satisfied with the outcome",
  },
  {
    rating: 2,
    label: "Needs work",
    colorLight: "#D9822B",
    colorDark: "#E5953F",
    subtitle: "Could be a lot better",
  },
  {
    rating: 3,
    label: "Okay",
    colorLight: "#828776",
    colorDark: "#9FA393",
    subtitle: "Happy enough with how it turned out",
  },
  {
    rating: 4,
    label: "Really good",
    colorLight: "#3F6754",
    colorDark: "#56856E",
    subtitle: "Really pleased with the result",
  },
  {
    rating: 5,
    label: "Loved it",
    colorLight: "#1A535C",
    colorDark: "#337A85",
    subtitle: "Absolutely love the finished space",
  },
];

export const QUESTION_SWATCH_MAP: Record<RatingKey, readonly SwatchOption[]> = {
  q_product: PRODUCT_SWATCH_TIERS,
  q_care: CARE_SWATCH_TIERS,
  q_happy: HAPPINESS_SWATCH_TIERS,
};

/** Questions for rating the product, care, and overall happiness. */
export const RATING_QUESTIONS: readonly RatingQuestion[] = [
  {
    key: "q_product",
    stepTitle: "Product",
    prompt: "Rate your experience with our product.",
    subtitle: "Coverage, color accuracy, and how the finish dried.",
    tiers: PRODUCT_SWATCH_TIERS,
  },
  {
    key: "q_care",
    stepTitle: "Care",
    prompt: "Rate our customer care.",
    subtitle: "Helpfulness, delivery, and advice from our team.",
    tiers: CARE_SWATCH_TIERS,
  },
  {
    key: "q_happy",
    stepTitle: "Happiness",
    prompt: "Are you happy with the product?",
    subtitle: "How you feel about the finished look in your space.",
    tiers: HAPPINESS_SWATCH_TIERS,
  },
];

export const CONTACT_STEP_TITLE = "Details";

/** Index 0 is rating 1. Backwards compatible. */
export const RATING_LABELS = [
  "Not great",
  "Needs work",
  "Okay",
  "Really good",
  "Loved it",
] as const;

/** Alias for backwards compatibility */
export const SWATCH_TIERS = PRODUCT_SWATCH_TIERS;
