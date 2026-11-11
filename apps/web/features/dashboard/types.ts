import type { Category } from "../../lib/rating";
import type { CustomerType } from "../feedback/types";

export type Channel = "web" | "sms";
export type DeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CustomerDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  type: CustomerType;
}

export interface AlertBrief {
  id: number;
  email_status: DeliveryStatus;
  read_at: string | null;
  handled_at: string | null;
}

/** One feedback submission with everything needed for the table and the drill-down drawer. */
export interface ResponseRow {
  id: number;
  created_at: string;
  customer: CustomerDto;
  q_product: number;
  q_care: number;
  q_happy: number;
  mean: string;
  category: Category;
  channel: Channel;
  comment: string;
  alert: AlertBrief | null;
}

export interface AlertRow {
  id: number;
  created_at: string;
  customer: CustomerDto;
  response: Omit<ResponseRow, "customer" | "alert">;
  email_status: DeliveryStatus;
  sms_status: DeliveryStatus;
  read_at: string | null;
  handled_at: string | null;
  handled_by: string | null;
}

export interface SummaryDto {
  total: number;
  categories: Record<Category, number>;
  mean: number | null;
  alerts: { open: number; unread: number };
}

export interface TrendDay {
  date: string;
  count: number;
  mean: number | null;
}

export interface ProjectionLinePoint {
  date: string;
  mean: number;
  forecast: boolean;
}

export type Projection =
  | {
      status: "ok";
      method: string;
      slope_per_day: number;
      horizon_days: number;
      line: ProjectionLinePoint[];
    }
  | { status: "insufficient_data"; min_days: number; days_with_data: number };

export interface TrendDto {
  days: number;
  series: TrendDay[];
  projection: Projection;
}

export interface NotificationDto {
  id: number;
  alert_id: number;
  customer_name: string;
  mean: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsDto {
  unread_count: number;
  results: NotificationDto[];
}

export interface AlertPatch {
  read?: boolean;
  handled?: boolean;
}
