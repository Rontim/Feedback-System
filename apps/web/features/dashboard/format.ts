import type { Category } from "../../lib/rating";

export const CATEGORY_LABEL: Record<Category, string> = {
  detractor: "Detractor",
  passive: "Passive",
  promoter: "Promoter",
};

/** AntD preset Tag colours; they follow the same semantic scale as the chart tokens. */
export const CATEGORY_TAG_COLOR: Record<Category, string> = {
  detractor: "error",
  passive: "warning",
  promoter: "success",
};

const DATE_TIME = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

/** "2026-11-11" -> "11 Nov". Parsed as a local date so it never shifts a day. */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
