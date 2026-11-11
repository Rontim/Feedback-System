import { http } from "../../lib/http";
import type {
  AlertPatch,
  AlertRow,
  NotificationsDto,
  Paginated,
  ResponseRow,
  SummaryDto,
  TrendDto,
} from "./types";

export const getSummary = () => http<SummaryDto>("/api/stats/summary");
export const getTrend = (days: number) => http<TrendDto>(`/api/stats/trend?days=${days}`);
export const getResponses = (query: string) =>
  http<Paginated<ResponseRow>>(`/api/responses?${query}`);
export const getAlerts = (query: string) => http<Paginated<AlertRow>>(`/api/alerts?${query}`);
export const patchAlert = (id: number, body: AlertPatch) =>
  http<AlertRow>(`/api/alerts/${id}`, { method: "PATCH", body });
export const getNotifications = () => http<NotificationsDto>("/api/notifications");
export const markNotificationRead = (id: number) =>
  http<null>(`/api/notifications/${id}/read`, { method: "POST" });
export const markAllNotificationsRead = () =>
  http<null>("/api/notifications/read-all", { method: "POST" });
