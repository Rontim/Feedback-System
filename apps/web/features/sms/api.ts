import { http } from "../../lib/http";
import type { Paginated } from "../dashboard/types";
import type { InviteResult, SmsConfigDto, SmsLogRow } from "./types";

export const getSmsConfig = () => http<SmsConfigDto>("/api/sms/config");
export const getSmsLog = (query: string) => http<Paginated<SmsLogRow>>(`/api/sms/log?${query}`);
export const sendInvites = (phones: string[]) =>
  http<InviteResult>("/api/sms/invites", { method: "POST", body: { phones } });
