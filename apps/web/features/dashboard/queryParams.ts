import type { Category } from "../../lib/rating";
import type { Channel, Sentiment, Topic } from "./types";

export type ResponseOrdering = "created_at" | "-created_at" | "mean" | "-mean";

export interface ResponsesParams {
  page: number;
  pageSize: number;
  categories: Category[];
  channels: Channel[];
  sentiments: Sentiment[];
  topics: Topic[];
  search: string;
  from: string | null; // YYYY-MM-DD
  to: string | null;
  ordering: ResponseOrdering;
}

export const DEFAULT_RESPONSES_PARAMS: ResponsesParams = {
  page: 1,
  pageSize: 20,
  categories: [],
  channels: [],
  sentiments: [],
  topics: [],
  search: "",
  from: null,
  to: null,
  ordering: "-created_at",
};

/** Query string for GET /api/responses. Empty filters are omitted. */
export function buildResponsesQuery(params: ResponsesParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize),
    ordering: params.ordering,
  });
  if (params.categories.length > 0) query.set("category", params.categories.join(","));
  if (params.channels.length > 0) query.set("channel", params.channels.join(","));
  if (params.sentiments.length > 0) query.set("sentiment", params.sentiments.join(","));
  if (params.topics.length > 0) query.set("topic", params.topics.join(","));
  if (params.search.trim()) query.set("q", params.search.trim());
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return query.toString();
}

export type AlertFilter = "all" | "unread" | "open" | "handled";

export function buildAlertsQuery(filter: AlertFilter, page: number, pageSize: number): string {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (filter === "unread") query.set("unread", "1");
  if (filter === "open") query.set("handled", "0");
  if (filter === "handled") query.set("handled", "1");
  return query.toString();
}
