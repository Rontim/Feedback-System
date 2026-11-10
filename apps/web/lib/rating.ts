export type Category = "detractor" | "passive" | "promoter";

/** Mirrors apps/api/feedback/scoring.py: classify on the integer sum, never the float mean. */
export function classify(q1: number, q2: number, q3: number): Category {
  const sum = q1 + q2 + q3;
  if (sum < 9) return "detractor";
  if (sum === 9) return "passive";
  return "promoter";
}
