"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getAlerts,
  getNotifications,
  getResponses,
  getSummary,
  getTrend,
} from "./api";

/** New feedback appears within this interval without a page refresh. */
export const POLL_MS = 5_000;

export const queryKeys = {
  summary: ["summary"],
  trend: (days: number) => ["trend", days],
  responses: (query: string) => ["responses", query],
  alerts: (query: string) => ["alerts", query],
  notifications: ["notifications"],
} as const;

export const useSummary = () =>
  useQuery({ queryKey: queryKeys.summary, queryFn: getSummary, refetchInterval: POLL_MS });

export const useTrend = (days: number) =>
  useQuery({
    queryKey: queryKeys.trend(days),
    queryFn: () => getTrend(days),
    refetchInterval: POLL_MS,
    placeholderData: keepPreviousData,
  });

export const useResponses = (query: string) =>
  useQuery({
    queryKey: queryKeys.responses(query),
    queryFn: () => getResponses(query),
    refetchInterval: POLL_MS,
    placeholderData: keepPreviousData,
  });

export const useAlerts = (query: string) =>
  useQuery({
    queryKey: queryKeys.alerts(query),
    queryFn: () => getAlerts(query),
    refetchInterval: POLL_MS,
    placeholderData: keepPreviousData,
  });

export const useNotifications = () =>
  useQuery({
    queryKey: queryKeys.notifications,
    queryFn: getNotifications,
    refetchInterval: POLL_MS,
  });
