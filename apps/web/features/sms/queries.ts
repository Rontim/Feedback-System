"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { POLL_MS } from "../dashboard/queries";
import { getSmsConfig, getSmsLog } from "./api";

export const smsKeys = {
  config: ["sms", "config"],
  log: (query: string) => ["sms", "log", query],
} as const;

export const useSmsConfig = () =>
  useQuery({ queryKey: smsKeys.config, queryFn: getSmsConfig, staleTime: 60_000 });

export const useSmsLog = (query: string) =>
  useQuery({
    queryKey: smsKeys.log(query),
    queryFn: () => getSmsLog(query),
    refetchInterval: POLL_MS,
    placeholderData: keepPreviousData,
  });
